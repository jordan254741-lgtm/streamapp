type ProgressCallback = (received: number, total: number | null) => void

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

export async function streamToFilePicker(
  res: Response,
  suggestedName: string,
  onProgress?: ProgressCallback,
): Promise<void> {
  const picker = getSaveFilePicker()
  if (!picker) throw new Error('File System Access API not supported')
  const handle = await picker({
    suggestedName,
    types: [{ description: 'Video', accept: { 'video/mp4': ['.mp4'] } }],
  })
  const writable = await handle.createWritable()
  try {
    if (!res.body) {
      await writable.write(await res.blob())
      return
    }
    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        await writable.write(value)
        onProgress?.(value.byteLength, null)
      }
    }
  } finally {
    await writable.close()
  }
}

export async function downloadWithProgress(
  url: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`)
  const totalHeader = res.headers.get('content-length')
  const total = totalHeader ? Number(totalHeader) : null

  const useStreamFallback =
    !getSaveFilePicker() && typeof ReadableStream !== 'undefined' && res.body !== null

  if (!useStreamFallback) {
    const blob = await res.blob()
    onProgress?.(blob.size, blob.size)
    return blob
  }

  const reader = res.body!.getReader()
  const chunks: BlobPart[] = []
  let received = 0
  let lastReported = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value as unknown as BlobPart)
      received += value.byteLength
      if (received - lastReported >= 512 * 1024 || done) {
        lastReported = received
        onProgress?.(received, total)
      }
    }
  }
  const blob = new Blob(chunks)
  onProgress?.(blob.size, blob.size)
  return blob
}

export async function downloadVideo(
  url: string,
  suggestedName: string,
  onProgress?: ProgressCallback,
): Promise<'saved-to-folder' | 'saved-to-downloads'> {
  if (getSaveFilePicker()) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`)
    await streamToFilePicker(res, suggestedName, onProgress)
    return 'saved-to-folder'
  }

  const blob = await downloadWithProgress(url, onProgress)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = suggestedName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  return 'saved-to-downloads'
}
