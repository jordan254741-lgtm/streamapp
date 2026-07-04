const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'
const TMDB_BASE = 'https://api.themoviedb.org/3'
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3'

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { data: unknown; timestamp: number }>()

const rateLimitMap = new Map<string, { count: number; reset: number }>()
const RATE_LIMIT_MAX = 50
const RATE_LIMIT_WINDOW = 60000

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous'
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || entry.reset < now) {
    rateLimitMap.set(key, { count: 1, reset: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown): void {
  if (cache.size > 200) {
    const keys = [...cache.keys()].slice(0, 50)
    keys.forEach(k => cache.delete(k))
  }
  cache.set(key, { data, timestamp: Date.now() })
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) return res
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, attempt * 1000))
          continue
        }
      }
      const body = await res.text().catch(() => '')
      return new Response(
        JSON.stringify({ error: `API error: ${res.status}`, detail: body.slice(0, 500) }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      if (attempt === retries) {
        const message = err instanceof Error ? err.message : 'Request failed'
        return new Response(
          JSON.stringify({ error: message }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        )
      }
      await new Promise(r => setTimeout(r, attempt * 1000))
    }
  }
  return new Response(
    JSON.stringify({ error: 'Request failed after retries' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  )
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() })
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return errorResponse('Rate limit exceeded. Try again later.', 429)
  }

  if (!TMDB_API_KEY || !YOUTUBE_API_KEY) {
    return errorResponse('Server misconfiguration: missing API keys', 500)
  }

  try {
    const body = await req.json()
    const route = new URL(body.route, 'http://localhost')
    const path = route.pathname
    const params = Object.fromEntries(route.searchParams)

    if (path === '/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() })
    }

    const cacheKey = body.route as string
    const cached = getCached(cacheKey)
    if (cached) return jsonResponse(cached)

    let upstreamUrl: string
    let isYoutube = false

    if (path === '/popular') {
      upstreamUrl = `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&page=${params.page || '1'}`
    } else if (path === '/discover') {
      if (!params.genre) return errorResponse('Missing genre parameter')
      upstreamUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${params.genre}&sort_by=popularity.desc&page=${params.page || '1'}`
    } else if (path === '/search') {
      if (!params.q) return errorResponse('Missing q parameter')
      upstreamUrl = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(params.q)}&page=${params.page || '1'}`
    } else if (path === '/movie') {
      if (!params.id) return errorResponse('Missing id parameter')
      upstreamUrl = `${TMDB_BASE}/movie/${params.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,similar,external_ids,videos`
    } else if (path === '/movie-videos') {
      if (!params.id) return errorResponse('Missing id parameter')
      upstreamUrl = `${TMDB_BASE}/movie/${params.id}/videos?api_key=${TMDB_API_KEY}`
    } else if (path === '/youtube') {
      if (!params.q) return errorResponse('Missing q parameter')
      isYoutube = true
      upstreamUrl = `${YOUTUBE_BASE}/search?key=${YOUTUBE_API_KEY}&q=${encodeURIComponent(params.q)}&part=snippet&type=video&videoEmbeddable=true&videoDuration=long&maxResults=3`
    } else if (path === '/youtube-trailer') {
      if (!params.q) return errorResponse('Missing q parameter')
      isYoutube = true
      upstreamUrl = `${YOUTUBE_BASE}/search?key=${YOUTUBE_API_KEY}&q=${encodeURIComponent(params.q)}&part=snippet&type=video&videoEmbeddable=true&videoDuration=short&maxResults=5`
    } else if (path === '/tmdb-external-ids') {
      if (!params.id) return errorResponse('Missing id parameter')
      upstreamUrl = `${TMDB_BASE}/movie/${params.id}/external_ids?api_key=${TMDB_API_KEY}`
    } else {
      return errorResponse('Not found', 404)
    }

    const upstream = await fetchWithRetry(upstreamUrl)

    const data = await upstream.json().catch(() => ({ error: 'Invalid upstream response' }))

    if (!upstream.ok) {
      const message = data?.error || data?.status_message || `Upstream API error: ${upstream.status}`
      return jsonResponse({ error: message, detail: isYoutube ? 'Video service unavailable' : undefined }, upstream.status)
    }

    if (!isYoutube) setCache(cacheKey, data)

    return jsonResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
