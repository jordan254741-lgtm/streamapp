import type { MediaType } from '../types'
import type { SourceKind } from './download'

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

const MOVIE_EMBED_SOURCES = [
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

const TV_EMBED_SOURCES = [
  {
    key: 'vidsrc',
    name: 'VidSrc',
    url: (tmdb: number) => `https://vidsrc.to/embed/tv/${tmdb}`,
  },
  {
    key: '2embed',
    name: '2Embed',
    url: (tmdb: number) => `https://www.2embed.cc/embedtv/${tmdb}`,
  },
]

export function getEmbedSources(tmdbId: number, mediaType: MediaType = 'movie'): Array<{ key: string; name: string; embedUrl: string }> {
  const sources = mediaType === 'tv' ? TV_EMBED_SOURCES : MOVIE_EMBED_SOURCES
  return sources.map(s => ({
    key: s.key,
    name: s.name,
    embedUrl: s.url(tmdbId),
  }))
}

export function getTvEmbedSources(tmdbId: number) {
  return getEmbedSources(tmdbId, 'tv')
}

export interface MovieBoxSource {
  url: string
  kind: SourceKind
}

export async function fetchMovieBoxSource(title: string, year: string): Promise<MovieBoxSource | null> {
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
    if (!data.videoUrl) return null
    return { url: data.videoUrl, kind: (data.kind === 'hls' ? 'hls' : 'mp4') as SourceKind }
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

const MOVIE_GENRE_KEYWORDS: Record<number, string> = {
  28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
  80: 'crime', 99: 'documentary', 18: 'drama', 10751: 'family',
  14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
  9648: 'mystery', 10749: 'romance', 878: 'sci-fi', 10770: 'tv movie',
  53: 'thriller', 10752: 'war', 37: 'western',
}

const TV_GENRE_KEYWORDS: Record<number, string> = {
  10759: 'action adventure', 16: 'animation', 35: 'comedy', 80: 'crime',
  99: 'documentary', 18: 'drama', 10751: 'family', 10762: 'kids',
  9648: 'mystery', 10763: 'news', 10764: 'reality', 10765: 'sci-fi fantasy',
  10766: 'soap', 10767: 'talk', 10768: 'war politics', 37: 'western',
}

async function discoverWithFallback(
  genre: number,
  page: number,
  discoverPath: string,
  keywordMap: Record<number, string>,
  searchFn: (query: string, page: number) => Promise<{ results: MovieResult[] }>,
): Promise<{ results: MovieResult[]; total_pages: number }> {
  const exact = await tmdbFetch<{ results: MovieResult[]; total_pages: number }>(discoverPath)

  if (page === 1 && exact.results.length < 8) {
    const keyword = keywordMap[genre]
    if (keyword) {
      const fallback = await searchFn(keyword, page)
      const seen = new Set<number>()
      const merged = [...exact.results, ...fallback.results].filter(m => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      return { results: merged, total_pages: Math.max(exact.total_pages, fallback.results.length > 0 ? 1 : 0) }
    }
  }

  return exact
}

async function discoverTvWithFallback(
  genre: number,
  page: number,
  discoverPath: string,
): Promise<{ results: MovieResult[]; total_pages: number }> {
  const exact = await tmdbFetch<TvApiResponse>(discoverPath)
  const normalized = exact.results.map(normalizeTvShow)

  if (page === 1 && normalized.length < 8) {
    const keyword = TV_GENRE_KEYWORDS[genre]
    if (keyword) {
      const fallback = await searchTv(keyword, page)
      const seen = new Set<number>()
      const merged = [...normalized, ...fallback.results].filter(m => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      return { results: merged, total_pages: Math.max(exact.total_pages, fallback.results.length > 0 ? 1 : 0) }
    }
  }

  return { results: normalized, total_pages: exact.total_pages }
}

export async function fetchPopularMovies(page = 1) {
  return tmdbFetch<MovieApiResponse>(`/movie/popular?page=${page}`)
}

export async function fetchDiscoverMovies(genre: number, page = 1) {
  return discoverWithFallback(genre, page, `/discover/movie?with_genres=${genre}&sort_by=popularity.desc&page=${page}`, MOVIE_GENRE_KEYWORDS, searchMovies)
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<MovieApiResponse>(`/search/movie?query=${encodeURIComponent(query)}&page=${page}`)
}

export async function fetchDiscoverTv(genre: number, page = 1) {
  return discoverTvWithFallback(genre, page, `/discover/tv?with_genres=${genre}&sort_by=popularity.desc&page=${page}`)
}

export async function searchTv(query: string, page = 1) {
  const data = await tmdbFetch<TvApiResponse>(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
}

function bestTitleMatch<T extends { title: string }>(results: T[], query: string): T | undefined {
  const q = query.toLowerCase()
  return (
    results.find(r => r.title.toLowerCase() === q) ||
    results.find(r => r.title.toLowerCase().includes(q)) ||
    results[0]
  )
}

const TITLE_FETCH_CHUNK = 8

async function resolveTitle(title: string): Promise<MovieResult | undefined> {
  const q = title.toLowerCase()
  const [movieRes, tvRes] = await Promise.all([
    tmdbFetch<MovieApiResponse>(`/search/movie?query=${encodeURIComponent(title)}`),
    tmdbFetch<TvApiResponse>(`/search/tv?query=${encodeURIComponent(title)}`),
  ])
  const movieResults = movieRes.results || []
  const tvResults = (tvRes.results || []).map(normalizeTvShow)
  const exactMovie = movieResults.find(r => r.title.toLowerCase() === q)
  const exactTv = tvResults.find(r => r.title.toLowerCase() === q)
  if (exactMovie && exactTv) {
    return exactTv.vote_count > exactMovie.vote_count ? exactTv : exactMovie
  }
  if (exactMovie) return exactMovie
  if (exactTv) return exactTv
  return bestTitleMatch(movieResults, title) || bestTitleMatch(tvResults, title)
}

export async function fetchByTitles(titles: string[]): Promise<{ results: MovieResult[] }> {
  const resolved: Array<MovieResult | undefined> = []
  for (let i = 0; i < titles.length; i += TITLE_FETCH_CHUNK) {
    const chunk = titles.slice(i, i + TITLE_FETCH_CHUNK)
    const settled = await Promise.allSettled(chunk.map(resolveTitle))
    settled.forEach((s, idx) => {
      if (s.status === 'fulfilled') {
        resolved.push(s.value)
      } else {
        console.error(`Failed to resolve "${chunk[idx]}":`, s.reason)
        resolved.push(undefined)
      }
    })
  }
  const results = resolved.flatMap(r => (r ? [r] : []))
  return { results }
}

export async function fetchTrending(page = 1, timeWindow: 'day' | 'week' = 'week') {
  const data = await tmdbFetch<TrendingApiResponse>(`/trending/all/${timeWindow}?page=${page}`)
  return { ...data, results: data.results.map(normalizeTrendingItem) }
}

export async function fetchTrendingMovies(page = 1, timeWindow: 'day' | 'week' = 'week') {
  const data = await tmdbFetch<MovieApiResponse>(`/trending/movie/${timeWindow}?page=${page}`)
  return data
}

export async function fetchTrendingTv(page = 1, timeWindow: 'day' | 'week' = 'week') {
  const data = await tmdbFetch<TvApiResponse>(`/trending/tv/${timeWindow}?page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
}

export async function fetchPopularTv(page = 1) {
  const data = await tmdbFetch<TvApiResponse>(`/tv/popular?page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
}

export async function fetchAiringToday(page = 1) {
  const data = await tmdbFetch<TvApiResponse>(`/tv/airing_today?page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
}

export async function fetchOnTheAir(page = 1) {
  const data = await tmdbFetch<TvApiResponse>(`/tv/on_the_air?page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
}

export async function fetchTopRatedTv(page = 1) {
  const data = await tmdbFetch<TvApiResponse>(`/tv/top_rated?page=${page}`)
  return { ...data, results: data.results.map(normalizeTvShow) }
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

export interface PersonCombinedCredit {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  vote_count: number
  overview: string
  media_type: MediaType
  character?: string
}

export interface PersonDetailsResponse {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  known_for_department: string | null
  profile_path: string | null
  homepage: string | null
  combined_credits: {
    cast: PersonCombinedCredit[]
    crew: PersonCombinedCredit[]
  }
}

function normalizePersonCredit(credit: PersonCombinedCredit): MovieResult {
  return {
    id: credit.id,
    title: credit.title || credit.name || 'Untitled',
    poster_path: credit.poster_path || '',
    backdrop_path: credit.backdrop_path || '',
    release_date: credit.release_date || credit.first_air_date || '',
    vote_average: credit.vote_average,
    vote_count: credit.vote_count,
    overview: credit.overview,
    genre_ids: [],
    media_type: credit.media_type === 'tv' ? 'tv' : 'movie',
  }
}

export type PersonCreditItem = MovieResult & { character: string }

export function groupCreditsByYear(
  credits: PersonCombinedCredit[],
): Array<{ year: string; items: PersonCreditItem[] }> {
  const byYear = new Map<string, PersonCreditItem[]>()
  const seen = new Set<string>()
  for (const credit of credits) {
    const key = `${credit.media_type}-${credit.id}-${credit.character || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    const date = credit.release_date || credit.first_air_date || ''
    const year = date ? date.split('-')[0] : 'TBA'
    const normalized = {
      ...normalizePersonCredit(credit),
      character: credit.character || '',
    }
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(normalized)
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => (a === 'TBA' ? -1 : b === 'TBA' ? 1 : b.localeCompare(a)))
    .map(([year, items]) => ({
      year,
      items: items.sort((a, b) => b.release_date.localeCompare(a.release_date)),
    }))
}

export async function fetchPersonDetails(id: number): Promise<PersonDetailsResponse> {
  const data = await tmdbFetch<PersonDetailsResponse>(
    `/person/${id}?append_to_response=combined_credits`,
  )
  return {
    ...data,
    combined_credits: {
      cast: data.combined_credits?.cast || [],
      crew: data.combined_credits?.crew || [],
    },
  }
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
