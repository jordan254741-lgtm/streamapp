import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

const MOVIEBOX_BASE = 'https://moviebox.ph'
const API_BASE = 'https://h5-api.aoneroom.com'
const FETCH_TIMEOUT = 15000

interface SearchHit {
  subjectId: string
  subjectType: number
  title: string
  releaseDate?: string
}

interface CacheEntry {
  token: string
  expiresAt: number
}

let bearerCache: CacheEntry | null = null
let tokenRefreshPromise: Promise<string | null> | null = null

function generateClientToken(): string {
  const e = Math.floor(Date.now() / 1000)
  const t = String(e).split('').reverse().join('')
  const r = crypto.createHash('md5').update(t).digest('hex')
  return `${e}${r}`
}

function baseHeaders(): Record<string, string> {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Referer': 'https://movieboxhd.net/',
    'X-Client-Token': generateClientToken(),
    'X-Client-Info': JSON.stringify({ timezone: 'Africa/Nairobi' }),
    'X-No-High-Risk-Restrict': '0',
    'X-Request-Lang': 'en',
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

/** Bootstrap an anonymous bearer token via the x-user response header. */
async function getBearerToken(): Promise<string | null> {
  if (bearerCache && Date.now() < bearerCache.expiresAt) return bearerCache.token

  if (tokenRefreshPromise) return tokenRefreshPromise

  tokenRefreshPromise = (async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/wefeed-h5api-bff/subject/trending?page=1&perPage=1`, {
        headers: baseHeaders(),
      })
      if (!res.ok) return null
      const xu = res.headers.get('x-user')
      if (!xu) return null
      const token = (JSON.parse(xu) as { token?: string }).token
      if (!token) return null
      bearerCache = { token, expiresAt: Date.now() + 55 * 60 * 1000 }
      return token
    } catch {
      return null
    } finally {
      tokenRefreshPromise = null
    }
  })()

  return tokenRefreshPromise
}

interface SearchResponse {
  code: number
  data?: { items?: SearchHit[] }
}

async function searchTitle(keyword: string): Promise<SearchHit[]> {
  const bearer = await getBearerToken()
  if (!bearer) return []
  try {
    const res = await fetchWithTimeout(`${API_BASE}/wefeed-h5api-bff/subject/search`, {
      method: 'POST',
      headers: { ...baseHeaders(), Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ keyword, page: 1, perPage: 12, subjectType: 0 }),
    })
    if (!res.ok) return []
    const json = (await res.json()) as SearchResponse
    return json?.data?.items || []
  } catch {
    return []
  }
}

interface DetailResponse {
  code: number
  data?: {
    subject?: { subjectId: string; detailPath?: string; title?: string }
    dash?: Array<{ id: number }>
    hls?: Array<{ id: number; url?: string }>
    streams?: Array<{ id: number }>
  }
}

async function getDetail(subjectId: string): Promise<DetailResponse['data'] | null> {
  const bearer = await getBearerToken()
  if (!bearer) return null
  try {
    const res = await fetchWithTimeout(`${API_BASE}/wefeed-h5api-bff/detail?subjectId=${subjectId}`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${bearer}` },
    })
    if (!res.ok) return null
    const json = (await res.json()) as DetailResponse
    return json?.data || null
  } catch {
    return null
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': baseHeaders()['User-Agent'] } })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractVideoUrls(html: string): string[] {
  const urls = new Set<string>()
  const plain = html.match(/https:\/\/macdn\.aoneroom\.com[^\s"'<>]+/g) || []
  plain.forEach(u => urls.add(u))
  const esc = html.match(/https\\:\\\/\\\/macdn\\.aoneroom\\.com[^"']+/g) || []
  esc.forEach(u => urls.add(u.replace(/\\\//g, '/')))
  return [...urls]
}

export function pickBestVideoUrl(urls: string[]): string | null {
  if (urls.length === 0) return null
  const scored = urls.map(u => {
    let score = 0
    if (/-(hd|fhd|1080|2160|4k)/i.test(u)) score += 4
    else if (/-(md|720)/i.test(u)) score += 2
    else if (/-(sd|360|480)/i.test(u)) score += 1
    return { u, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0].u
}

interface CaptionResponse {
  code: number
  data?: { captions?: unknown[]; url?: string }
}

async function tryApiFallback(detailPath: string): Promise<string | null> {
  try {
    const detailRes = await fetchWithTimeout(
      `${API_BASE}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
      { headers: baseHeaders() },
    )
    if (!detailRes.ok) return null

    const detailData = (await detailRes.json()) as DetailResponse
    const dd = detailData?.data
    if (!dd) return null

    const subjectId = dd.subject?.subjectId
    if (!subjectId) return null

    const sources: Array<{ format: string; id: number }> = [
      ...(dd.dash || []).map(s => ({ format: 'DASH', id: s.id })),
      ...(dd.hls || []).map(s => ({ format: 'HLS', id: s.id })),
      ...(dd.streams || []).map(s => ({ format: 'MP4', id: s.id })),
    ]

    for (const src of sources) {
      const capRes = await fetchWithTimeout(
        `${API_BASE}/wefeed-h5api-bff/subject/caption?format=${src.format}&id=${src.id}&subjectId=${subjectId}&detailPath=${detailPath}`,
        { headers: { ...baseHeaders(), 'X-Client-Token': generateClientToken() } },
      )
      if (!capRes.ok) continue

      const capData = (await capRes.json()) as CaptionResponse
      const url = capData?.data?.url
      if (url) return url
    }
  } catch {
    // fall through — caller treats null as "no fallback source"
  }

  return null
}

function pickBestMatch(hits: SearchHit[], query: string, year: string): SearchHit | null {
  if (hits.length === 0) return null
  const qWords = query.toLowerCase().split(/\s+/).filter(Boolean)
  const containing = hits.filter(h => {
    const t = h.title.toLowerCase()
    return qWords.every(w => t.includes(w))
  })
  const pool = containing.length > 0 ? containing : hits

  if (year) {
    const yearMatch = pool.find(h => (h.releaseDate || '').startsWith(year))
    if (yearMatch) return yearMatch
  }

  const sorted = [...pool].sort((a, b) => {
    const ay = parseInt((a.releaseDate || '').slice(0, 4), 10) || 0
    const by = parseInt((b.releaseDate || '').slice(0, 4), 10) || 0
    if (by !== ay) return by - ay
    return a.title.length - b.title.length
  })
  return sorted[0]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, q, year: yearParam } = req.query

  if (url && typeof url === 'string') {
    const html = await fetchHtml(url)
    if (!html) return res.status(502).json({ error: 'Failed to fetch page' })

    const best = pickBestVideoUrl(extractVideoUrls(html))
    if (!best) return res.status(404).json({ error: 'No video URL found' })

    return res.json({ videoUrl: best, kind: best.includes('.m3u8') ? 'hls' : 'mp4', pageUrl: url })
  }

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Provide url or q parameter' })
  }

  const year = typeof yearParam === 'string' ? yearParam.trim() : ''

  let detailPath: string | null = null
  let matchedTitle: string | null = null

  const hits = await searchTitle(q)
  const match = pickBestMatch(hits, q, year)

  if (match) {
    matchedTitle = match.title
    const detail = await getDetail(match.subjectId)
    detailPath = detail?.subject?.detailPath || null
  }

  if (detailPath) {
    const pageUrl = `${MOVIEBOX_BASE}/moviedetail/${detailPath}`
    const pageHtml = await fetchHtml(pageUrl)
    if (pageHtml) {
      const best = pickBestVideoUrl(extractVideoUrls(pageHtml))
      if (best) {
        return res.json({
          videoUrl: best,
          kind: best.includes('.m3u8') ? 'hls' : 'mp4',
          pageUrl,
          title: matchedTitle,
        })
      }
    }

    const apiUrl = await tryApiFallback(detailPath)
    if (apiUrl) {
      return res.json({
        videoUrl: apiUrl,
        kind: apiUrl.includes('.m3u8') ? 'hls' : 'mp4',
        pageUrl,
        title: matchedTitle,
      })
    }
  }

  return res.status(404).json({
    error: matchedTitle
      ? `Found "${matchedTitle}" on MovieBox but no downloadable stream is exposed`
      : 'Movie not found on MovieBox',
  })
}