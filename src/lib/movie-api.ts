import type { MediaType } from '../types'

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



function normalizeTvShow(item: TvResult): MovieResult {
  return {
    id: item.id,
    title: item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_date: item.first_air_date || '',
    vote_average: item.vote_average,
    vote_count: item.vote_count,
    overview: item.overview,
    genre_ids: item.genre_ids,
    media_type: 'tv' as MediaType,
  }
}

function normalizeTrendingItem(item: TrendingResult): MovieResult {
  return {
    id: item.id,
    title: item.title || item.name || 'Untitled',
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_date: item.release_date || item.first_air_date || '',
    vote_average: item.vote_average,
    vote_count: item.vote_count,
    overview: item.overview,
    genre_ids: item.genre_ids,
    media_type: (item.media_type === 'tv' ? 'tv' : 'movie') as MediaType,
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

export async function fetchPopularTv(page = 1) {
  const data = await tmdbFetch<TvApiResponse>(`/tv/popular?page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
}

export async function fetchDiscoverTv(genre: number, page = 1) {
  const data = await tmdbFetch<TvApiResponse>(
    `/discover/tv?with_genres=${genre}&sort_by=popularity.desc&page=${page}`,
  )
  return { ...data, results: data.results.map(normalizeTvShow) }
}

export async function searchTv(query: string, page = 1) {
  const data = await tmdbFetch<TvApiResponse>(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
}

export async function fetchTrending(page = 1, timeWindow: 'day' | 'week' = 'week') {
  const data = await tmdbFetch<TrendingApiResponse>(`/trending/all/${timeWindow}?page=${page}`)
  return { ...data, results: data.results.map(normalizeTrendingItem) }
}

export async function fetchMovieDetails(id: number) {
  return tmdbFetch<MovieDetailsResponse>(
    `/movie/${id}?append_to_response=credits,similar,external_ids,videos`,
  )
}

export async function fetchTvDetails(id: number) {
  return tmdbFetch<TvDetailsResponse>(
    `/tv/${id}?append_to_response=credits,similar,external_ids,videos`,
  )
}

export async function fetchNowPlaying(page = 1) {
  return tmdbFetch<MovieApiResponse>(`/movie/now_playing?page=${page}`)
}

export async function fetchTopRated(page = 1) {
  return tmdbFetch<MovieApiResponse>(`/movie/top_rated?page=${page}`)
}

export async function fetchUpcoming(page = 1) {
  return tmdbFetch<MovieApiResponse>(`/movie/upcoming?page=${page}`)
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
  media_type?: MediaType
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

export interface TvDetailsResponse {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  number_of_seasons: number
  number_of_episodes: number
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

interface TvResult {
  id: number
  name: string
  poster_path: string
  backdrop_path: string
  first_air_date: string
  vote_average: number
  vote_count: number
  overview: string
  genre_ids: number[]
}

interface TvApiResponse {
  results: TvResult[]
  total_pages: number
}

interface TrendingResult {
  id: number
  title?: string
  name?: string
  media_type: string
  poster_path: string
  backdrop_path: string
  release_date?: string
  first_air_date?: string
  vote_average: number
  vote_count: number
  overview: string
  genre_ids: number[]
}

interface TrendingApiResponse {
  results: TrendingResult[]
  total_pages: number
}
