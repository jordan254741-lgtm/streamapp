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
): Promise<Blob> {
  const res = await fetch(url)
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
      if (received - lastReported >= 512 * 1024) {
        lastReported = received
        onProgress?.(received, total)
      }
    }
  }
  const blob = new Blob(chunks)
  onProgress?.(blob.size, blob.size)
  return blob
}

/** Parse an m3u8 playlist. Returns variant URL for master playlists, segment URLs for media playlists. */
async function parseM3u8(url: string): Promise<{ variantUrl?: string; segments: string[] }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch playlist (HTTP ${res.status})`)
  const text = await res.text()

  if (/EXT-X-STREAM-INF/.test(text)) {
    // master playlist -> choose highest-bandwidth variant
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

  const segments = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => absolutize(l, url))
  return { segments }
}

function absolutize(uri: string, baseUrl: string): string {
  try {
    return new URL(uri, baseUrl).toString()
  } catch {
    return uri
  }
}

const MAX_SEGMENTS = 5000

/**
 * Download an HLS stream by fetching every segment and concatenating them into a
 * single MPEG-TS file that plays offline in VLC/mpv/most players.
 */
async function downloadHls(
  playlistUrl: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  let current = playlistUrl
  for (let depth = 0; depth < 3; depth++) {
    const { variantUrl, segments } = await parseM3u8(current)
    if (variantUrl) { current = variantUrl; continue }
    if (segments.length === 0) throw new Error('Playlist contains no segments')
    if (segments.length > MAX_SEGMENTS) throw new Error('Stream too long to download')

    const parts: BlobPart[] = []
    let received = 0
    let failed = 0
    for (let i = 0; i < segments.length; i++) {
      try {
        const res = await fetch(segments[i])
        if (res.ok) {
          const buf = await res.arrayBuffer()
          parts.push(buf)
          received += buf.byteLength
        } else {
          failed++
        }
      } catch {
        failed++
      }
      onProgress?.(received, null)
      if (failed > Math.max(5, segments.length * 0.1)) {
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
  /** true when the downloaded file looks like a short preview rather than a full title */
  likelyPreview: boolean
}

export async function downloadVideo(
  url: string,
  suggestedName: string,
  kind: SourceKind = 'mp4',
  onProgress?: ProgressCallback,
): Promise<DownloadResult> {
  let blob: Blob

  if (kind === 'hls') {
    blob = await downloadHls(url, onProgress)
  } else {
    blob = await fetchWithProgress(url, onProgress)
  }

  // MovieBox preview clips are tiny (~5-15MB); full features are hundreds of MB.
  const likelyPreview = kind === 'mp4' && blob.size > 0 && blob.size < 25 * 1024 * 1024

  if (getSaveFilePicker()) {
    await streamBlobToFilePicker(blob, suggestedName)
    return { mode: 'saved-to-folder', kind, bytes: blob.size, likelyPreview }
  }

  saveBlobViaAnchor(blob, suggestedName)
  return { mode: 'saved-to-downloads', kind, bytes: blob.size, likelyPreview }
}
