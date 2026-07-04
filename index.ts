import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const TMDB_BASE = 'https://api.themoviedb.org/3'
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3'

const rateLimit = new Map<string, { count: number; reset: number }>()

serve(async (req) => {
  const userId = req.headers.get('x-user-id') || 'anonymous'

  const now = Date.now()
  const limit = rateLimit.get(userId)
  if (limit && limit.reset > now && limit.count >= 50) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!limit || limit.reset < now) {
    rateLimit.set(userId, { count: 1, reset: now + 60000 })
  } else {
    limit.count++
  }

  const body = await req.json()
  const route = new URL(body.route, 'http://localhost')
  const path = route.pathname
  const params = Object.fromEntries(route.searchParams)

  if (path === '/popular') {
    const res = await fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&page=${params.page || '1'}`)
    return proxy(res)
  }

  if (path === '/discover') {
    if (!params.genre) return error('Missing genre parameter')
    const res = await fetch(
      `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${params.genre}&sort_by=popularity.desc&page=${params.page || '1'}`
    )
    return proxy(res)
  }

  if (path === '/search') {
    if (!params.q) return error('Missing q parameter')
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(params.q)}&page=${params.page || '1'}`
    )
    return proxy(res)
  }

  if (path === '/movie') {
    if (!params.id) return error('Missing id parameter')
    const res = await fetch(`${TMDB_BASE}/movie/${params.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,similar`)
    return proxy(res)
  }

  if (path === '/youtube') {
    if (!params.q) return error('Missing q parameter')
    const res = await fetch(
      `${YOUTUBE_BASE}/search?key=${YOUTUBE_API_KEY}&q=${encodeURIComponent(params.q)}&part=snippet&type=video&videoEmbeddable=true&videoDuration=long&maxResults=3`
    )
    return proxy(res)
  }

  return error('Not found', 404)
})

function proxy(res: Response) {
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function error(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}