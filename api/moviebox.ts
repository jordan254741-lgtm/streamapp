import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

const MOVIEBOX_BASE = 'https://moviebox.ph'
const API_BASE = 'https://h5-api.aoneroom.com'
const CACHE_TTL = 8 * 60 * 60 * 1000

interface MovieEntry {
  title: string
  detailPath: string
  releaseDate: string
}

interface CacheEntry {
  movies: MovieEntry[]
  timestamp: number
}

let catalogCache: CacheEntry | null = null

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractVideoUrl(html: string): string | null {
  const m = html.match(/https:\/\/macdn\.aoneroom\.com[^\s"'>]+/)
  if (m) return m[0]
  const esc = html.match(/https\\:\\\/\\\/macdn\\.aoneroom\\.com[^"']+/)
  if (esc) return esc[0].replace(/\\\//g, '/')
  const meta = html.match(
    /<meta\s+(?:property|name)="(?:og:video:url|twitter:video|video)"\s+content="([^"]+)"/,
  )
  if (meta) return meta[1]
  return null
}

function resolve(data: unknown[], value: unknown): unknown {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < data.length) {
    return data[value]
  }
  return value
}

function extractMoviesFromNuxtData(html: string): MovieEntry[] {
  const match = html.match(
    /<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)<\/script>/,
  )
  if (!match) return []

  try {
    const data: unknown[] = JSON.parse(match[1])
    const movies: MovieEntry[] = []
    const seen = new Set<string>()

    for (const item of data) {
      if (!item || typeof item !== 'object') continue
      const obj = item as Record<string, unknown>

      const titleVal = resolve(data, obj.title) as string | undefined
      const detailPathVal = resolve(data, obj.detailPath) as string | undefined
      const subjectTypeVal = resolve(data, obj.subjectType)
      const releaseDateVal = resolve(data, obj.releaseDate) as string | undefined

      if (
        typeof titleVal === 'string' &&
        typeof detailPathVal === 'string' &&
        subjectTypeVal === 1 &&
        !seen.has(detailPathVal)
      ) {
        seen.add(detailPathVal)
        movies.push({
          title: titleVal,
          detailPath: detailPathVal,
          releaseDate: releaseDateVal || '',
        })
      }
    }

    return movies
  } catch {
    return []
  }
}

async function getCatalog(): Promise<MovieEntry[]> {
  if (
    catalogCache &&
    Date.now() - catalogCache.timestamp < CACHE_TTL
  ) {
    return catalogCache.movies
  }

  const html = await fetchHtml(`${MOVIEBOX_BASE}/web/movie`)
  if (!html) {
    if (catalogCache) return catalogCache.movies
    return []
  }

  const movies = extractMoviesFromNuxtData(html)
  catalogCache = { movies, timestamp: Date.now() }
  return movies
}

function generateClientToken(): string {
  const e = Math.floor(Date.now() / 1000)
  const t = String(e).split('').reverse().join('')
  const r = crypto.createHash('md5').update(t).digest('hex')
  return `${e}${r}`
}

interface CaptionResponse {
  code: number
  data?: { captions?: unknown[]; url?: string }
}

interface DetailResponse {
  code: number
  data?: {
    subject?: { subjectId: string }
    dash?: Array<{ id: number; resolutions?: number[] }>
    hls?: Array<{ id: number; url?: string; resolutions?: number[] }>
    streams?: Array<{ id: number; resolutions?: number[] }>
    resource?: { source: string; seasons?: Array<{ se: number; maxEp: number; resolutions?: Array<{ resolution: number; epNum: number }> }> }
  }
}

async function tryApiFallback(detailPath: string): Promise<string | null> {
  const token = generateClientToken()

  try {
    const detailRes = await fetch(
      `${API_BASE}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
          'X-Client-Token': token,
          'X-Client-Info': Buffer.from('{}').toString('base64'),
        },
      },
    )
    if (!detailRes.ok) return null

    const detailData = (await detailRes.json()) as DetailResponse
    const dd = detailData?.data
    if (!dd) return null

    const subjectId = dd.subject?.subjectId
    if (!subjectId) return null

    const sources: Array<{ format: string; id: number }> = [
      ...(dd.dash || []).map((s) => ({ format: 'DASH', id: s.id })),
      ...(dd.hls || []).map((s) => ({ format: 'HLS', id: s.id })),
      ...(dd.streams || []).map((s) => ({ format: 'MP4', id: s.id })),
    ]

    for (const src of sources) {
      const capRes = await fetch(
        `${API_BASE}/wefeed-h5api-bff/subject/caption?format=${src.format}&id=${src.id}&subjectId=${subjectId}&detailPath=${detailPath}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json',
            'X-Client-Token': generateClientToken(),
          },
        },
      )
      if (!capRes.ok) continue

      const capData = (await capRes.json()) as CaptionResponse
      const url = capData?.data?.url
      if (url) return url
    }
  } catch {
  }

  return null
}

function matchByTitleAndYear(
  movies: MovieEntry[],
  query: string,
  year: string,
): MovieEntry | null {
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (queryWords.length === 0) return null

  const queryLC = query.toLowerCase()

  const candidates = movies.filter((m) => {
    const t = m.title.toLowerCase()
    return queryWords.every((w) => t.includes(w))
  })

  if (candidates.length === 0) return null

  if (year) {
    const yearMatch = candidates.find((m) => m.releaseDate.startsWith(year))
    if (yearMatch) return yearMatch
  }

  const exactCandidates = candidates.filter((m) => {
    const t = m.title.toLowerCase()
    return queryWords.every((w) => {
      const regex = new RegExp(`\\b${w}\\b`, 'i')
      return regex.test(t)
    })
  })

  const pool = exactCandidates.length > 0 ? exactCandidates : candidates

  const sorted = [...pool].sort((a, b) => {
    const aYear = a.releaseDate ? parseInt(a.releaseDate.substring(0, 4), 10) || 0 : 0
    const bYear = b.releaseDate ? parseInt(b.releaseDate.substring(0, 4), 10) || 0 : 0
    if (bYear !== aYear) return bYear - aYear
    return a.title.length - b.title.length
  })

  return sorted[0]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, q, year: yearParam } = req.query

  if (url && typeof url === 'string') {
    const html = await fetchHtml(url)
    if (!html) return res.status(502).json({ error: 'Failed to fetch page' })

    const videoUrl = extractVideoUrl(html)
    if (!videoUrl) return res.status(404).json({ error: 'No video URL found' })

    return res.json({ videoUrl, pageUrl: url })
  }

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Provide url or q parameter' })
  }

  const movies = await getCatalog()
  if (movies.length === 0) {
    return res.status(502).json({ error: 'Failed to fetch MovieBox catalog' })
  }

  const year = typeof yearParam === 'string' ? yearParam.trim() : ''
  const match = matchByTitleAndYear(movies, q, year)

  if (!match) {
    return res.status(404).json({
      error: 'Movie not found on MovieBox',
      movies: movies.slice(0, 200).map((m) => m.title),
    })
  }

  const pageUrl = `${MOVIEBOX_BASE}/moviedetail/${match.detailPath}`
  const pageHtml = await fetchHtml(pageUrl)
  if (!pageHtml) return res.status(502).json({ error: 'Failed to fetch movie page' })

  let videoUrl = extractVideoUrl(pageHtml)

  if (!videoUrl) {
    videoUrl = await tryApiFallback(match.detailPath)
  }

  if (!videoUrl) {
    return res.status(404).json({ error: 'No video URL found for this movie' })
  }

  res.json({ videoUrl, pageUrl, title: match.title })
}
