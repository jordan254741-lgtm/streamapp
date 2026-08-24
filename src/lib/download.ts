type ProgressCallback = (receivedBytes: number, totalBytes: number | null) => void

export type SourceKind = 'mp4' | 'hls'

interface WritableFileStream {
  write(data: BufferSource | Blob): Promise<void>
  close(): Promise<void>
}

interface SaveFilePickerHandle {
  createWritable(): Promise<WritableFileStream>
}

type SaveFilePicker = (options?: {
  suggestedName?: string
  types?: Array<{ description: string; accept: Record<string, string[]> }>
}) => Promise<SaveFilePickerHandle>

function getSaveFilePicker(): SaveFilePicker | null {
  const w = window as unknown as { showSaveFilePicker?: SaveFilePicker }
  return typeof w.showSaveFilePicker === 'function' ? w.showSaveFilePicker : null
}

export function isSaveToFolderSupported() {
  return getSaveFilePicker() !== null
}

const FETCH_TIMEOUT = 300000
const CHUNK_SIZE = 1024 * 1024

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  const signals = signal ? [signal, controller.signal] : [controller.signal]
  const combinedSignal = AbortSignal.any(signals)
  try {
    return await fetch(url, { signal: combinedSignal })
  } finally {
    clearTimeout(timeout)
  }
}

async function streamBlobToFilePicker(blob: Blob, suggestedName: string): Promise<void> {
  const picker = getSaveFilePicker()
  if (!picker) throw new Error('File System Access API not supported')
  const handle = await picker({
    suggestedName,
    types: [{
      description: 'Video',
      accept: suggestedName.endsWith('.ts')
        ? { 'video/mp2t': ['.ts'] }
        : { 'video/mp4': ['.mp4'] },
    }],
  })
  const writable = await handle.createWritable()
  try {
    await writable.write(blob)
  } finally {
    await writable.close()
  }
}

function saveBlobViaAnchor(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

async function fetchWithProgress(
  url: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetchWithTimeout(url, signal)
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`)
  const totalHeader = res.headers.get('content-length')
  const total = totalHeader ? Number(totalHeader) : null

  if (!res.body) {
    const blob = await res.blob()
    onProgress?.(blob.size, blob.size)
    return blob
  }

  const reader = res.body.getReader()
  const chunks: BlobPart[] = []
  let received = 0
  let lastReported = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value as unknown as BlobPart)
      received += value.byteLength
      if (received - lastReported >= CHUNK_SIZE) {
        lastReported = received
        onProgress?.(received, total)
      }
    }
  }
  const blob = new Blob(chunks)
  onProgress?.(blob.size, blob.size)
  return blob
}

interface ParsedM3u8 {
  variantUrl?: string
  segments: string[]
  initSegment?: string
  key?: { method: string; uri: string; iv?: string }
  targetDuration?: number
  totalSegments?: number
}

async function parseM3u8(url: string, signal?: AbortSignal): Promise<ParsedM3u8> {
  const res = await fetchWithTimeout(url, signal)
  if (!res.ok) throw new Error(`Failed to fetch playlist (HTTP ${res.status})`)
  const text = await res.text()

  if (/EXT-X-STREAM-INF/.test(text)) {
    const lines = text.split('\n')
    let best: { bw: number; uri: string } | null = null
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('EXT-X-STREAM-INF')) continue
      const bwMatch = lines[i].match(/BANDWIDTH=(\d+)/)
      const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0
      let uri = ''
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j].trim()
        if (line && !line.startsWith('#')) { uri = line; break }
      }
      if (uri && (!best || bw > best.bw)) best = { bw, uri }
    }
    if (!best) throw new Error('Master playlist has no variants')
    return { variantUrl: absolutize(best.uri, url), segments: [] }
  }

  const segments: string[] = []
  let initSegment: string | undefined
  let key: ParsedM3u8['key'] = undefined
  let targetDuration: number | undefined

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) {
      if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        targetDuration = parseInt(line.split(':')[1], 10)
      } else if (line.startsWith('#EXT-X-KEY:')) {
        const methodMatch = line.match(/METHOD=([^,]+)/)
        const uriMatch = line.match(/URI="([^"]+)"/)
        const ivMatch = line.match(/IV=0x([^,]+)/)
        if (methodMatch && methodMatch[1] !== 'NONE' && uriMatch) {
          key = { method: methodMatch[1], uri: absolutize(uriMatch[1], url), iv: ivMatch ? ivMatch[1] : undefined }
        }
      } else if (line.startsWith('#EXT-X-MAP:')) {
        const uriMatch = line.match(/URI="([^"]+)"/)
        if (uriMatch) initSegment = absolutize(uriMatch[1], url)
      }
      continue
    }
    segments.push(absolutize(line, url))
  }

  return { segments, initSegment, key, targetDuration, totalSegments: segments.length }
}

function absolutize(uri: string, baseUrl: string): string {
  try {
    return new URL(uri, baseUrl).toString()
  } catch {
    return uri
  }
}

const MAX_SEGMENTS = 5000

async function downloadHls(
  playlistUrl: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<Blob> {
  let current = playlistUrl
  for (let depth = 0; depth < 3; depth++) {
    const parsed = await parseM3u8(current, signal)
    if (parsed.variantUrl) { current = parsed.variantUrl; continue }
    if (parsed.segments.length === 0) throw new Error('Playlist contains no segments')
    if (parsed.segments.length > MAX_SEGMENTS) throw new Error('Stream too long to download')

    let initData: Uint8Array | null = null
    if (parsed.initSegment) {
      try {
        const res = await fetchWithTimeout(parsed.initSegment, signal)
        if (res.ok) initData = new Uint8Array(await res.arrayBuffer())
      } catch {
        // ignore init segment fetch failure
      }
    }

    let keyData: CryptoKey | null = null
    if (parsed.key && parsed.key.method === 'AES-128' && parsed.key.uri) {
      try {
        const res = await fetchWithTimeout(parsed.key.uri, signal)
        if (res.ok) {
          const rawKey = await res.arrayBuffer()
          keyData = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, ['decrypt'])
        }
      } catch {
        // ignore key fetch failure
      }
    }

    const parts: BlobPart[] = []
    if (initData) parts.push(new Uint8Array(initData))

    let received = 0
    let failed = 0
    const totalSegments = parsed.segments.length

    for (let i = 0; i < totalSegments; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      try {
        const res = await fetchWithTimeout(parsed.segments[i], signal)
        if (res.ok) {
          let buf = await res.arrayBuffer()
          if (keyData && parsed.key?.iv) {
            const iv = new Uint8Array(16)
            const ivHex = parsed.key.iv.padStart(32, '0')
            for (let k = 0; k < 16; k++) iv[k] = parseInt(ivHex.slice(k * 2, k * 2 + 2), 16)
            buf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, keyData, buf)
          }
          const bufArr = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
          parts.push(bufArr)
          received += bufArr.byteLength
        } else {
          failed++
        }
      } catch {
        failed++
      }
      const totalEstimated = parsed.targetDuration ? totalSegments * 1024 * 1024 : null
      onProgress?.(received, totalEstimated)
      if (failed > Math.max(5, totalSegments * 0.1)) {
        throw new Error('Too many failed segments')
      }
    }
    return new Blob(parts, { type: 'video/mp2t' })
  }
  throw new Error('Nested playlists too deep')
}

export interface DownloadResult {
  mode: 'saved-to-folder' | 'saved-to-downloads'
  kind: SourceKind
  bytes: number
  likelyPreview: boolean
}

export async function downloadVideo(
  url: string,
  suggestedName: string,
  kind: SourceKind = 'mp4',
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  let blob: Blob

  if (kind === 'hls') {
    blob = await downloadHls(url, onProgress, signal)
  } else {
    blob = await fetchWithProgress(url, onProgress, signal)
  }

  const likelyPreview = blob.size > 0 && blob.size < 25 * 1024 * 1024

  if (getSaveFilePicker()) {
    await streamBlobToFilePicker(blob, suggestedName)
    return { mode: 'saved-to-folder', kind, bytes: blob.size, likelyPreview }
  }

  saveBlobViaAnchor(blob, suggestedName)
  return { mode: 'saved-to-downloads', kind, bytes: blob.size, likelyPreview }
}