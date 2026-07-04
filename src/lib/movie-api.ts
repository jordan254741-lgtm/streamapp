const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_BASE = import.meta.env.VITE_TMDB_BASE_URL || 'https://api.themoviedb.org/3'
const REQUEST_TIMEOUT = 10000
const MAX_RETRIES = 3

async function tmdbFetch<T>(path: string): Promise<T> {
  const url = `${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`TMDB API error: ${res.status}`)
      const data = await res.json()
      if (data?.status_message) throw new Error(data.status_message)
      return data as T
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      await new Promise(r => setTimeout(r, attempt * 1000))
    }
  }
  throw new Error('Request failed')
}

const EMBED_SOURCES = [
  {
    key: 'vidsrc',
    name: 'VidSrc',
    url: (tmdb: number) => `https://vidsrc.to/embed/movie/${tmdb}`,
  },
  {
    key: 'moviesapi',
    name: 'MoviesAPI',
    url: (tmdb: number) => `https://moviesapi.to/movie/${tmdb}`,
  },
  {
    key: '2embed',
    name: '2Embed',
    url: (tmdb: number) => `https://www.2embed.cc/embed/${tmdb}`,
  },
]

export function getEmbedSources(tmdbId: number) {
  return EMBED_SOURCES.map(s => ({
    ...s,
    embedUrl: s.url(tmdbId),
  }))
}

export async function fetchMovieBoxSource(title: string, year: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(
      `/api/moviebox?q=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}`,
      { signal: controller.signal },
    )
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    return data.videoUrl || null
  } catch {
    return null
  }
}

export async function fetchPopularMovies(page = 1) {
  return tmdbFetch<MovieApiResponse>(`/movie/popular?page=${page}`)
}

export async function fetchDiscoverMovies(genre: number, page = 1) {
  return tmdbFetch<MovieApiResponse>(
    `/discover/movie?with_genres=${genre}&sort_by=popularity.desc&page=${page}`,
  )
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<MovieApiResponse>(`/search/movie?query=${encodeURIComponent(query)}&page=${page}`)
}

export async function fetchMovieDetails(id: number) {
  return tmdbFetch<MovieDetailsResponse>(
    `/movie/${id}?append_to_response=credits,similar,external_ids,videos`,
  )
}

interface MovieApiResponse {
  results: MovieResult[]
  total_pages: number
}

export interface MovieResult {
  id: number
  title: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  vote_count: number
  overview: string
  genre_ids: number[]
}

export interface MovieDetailsResponse {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  runtime: number
  genres: Array<{ id: number; name: string }>
  credits: {
    cast: Array<{
      id: number
      name: string
      character: string
      profile_path: string | null
    }>
  }
  similar: {
    results: MovieResult[]
  }
  external_ids: {
    imdb_id: string | null
    facebook_id: string | null
  }
  videos: {
    results: TmdbVideo[]
  }
}

export interface TmdbVideo {
  id: string
  key: string
  name: string
  site: string
  type: string
  official: boolean
}
