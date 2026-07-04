import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ContentRow from '../components/movies/ContentRow'
import VirtualMovieGrid from '../components/movies/VirtualMovieGrid'
import {
  fetchNowPlaying,
  fetchPopularMovies,
  fetchTopRated,
  fetchTrending,
  fetchUpcoming,
  searchMovies,
  searchTv,
  fetchDiscoverTv,
} from '../lib/movie-api'
import type { Movie, Genre } from '../types'

const MOVIE_GENRES: Genre[] = [
  { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' }, { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' }, { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' }, { id: 36, name: 'History' },
  { id: 27, name: 'Horror' }, { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' }, { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' }, { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
]

const TV_GENRES: Genre[] = [
  { id: 10759, name: 'Action & Adventure' }, { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' }, { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' }, { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' }, { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' }, { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' }, { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' }, { id: 37, name: 'Western' },
]

interface Props {
  user: User
}

type Tab = 'movies' | 'series' | 'trending'

export default function Browse({ user }: Props) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'movies')
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [movies, setMovies] = useState<Movie[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const activeGenres = tab === 'series' ? TV_GENRES : MOVIE_GENRES

  useEffect(() => { setMovies([]); setPage(1); setHasMore(true); setInitialLoading(true); setSelectedGenre(null) }, [tab])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && ['movies', 'series', 'trending'].includes(t)) setTab(t as Tab)
  }, [searchParams])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const data = tab === 'trending'
        ? await fetchTrending(nextPage)
        : await fetchPopularMovies(nextPage)
      const newMovies: Movie[] = data?.results || []
      setMovies(prev => [...prev, ...newMovies])
      setPage(nextPage)
      setHasMore(newMovies.length > 0)
    } catch (e) { console.error(e) } finally { setLoadingMore(false) }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setInitialLoading(true)
      try {
        if (query.trim()) {
          const [movieRes, tvRes] = await Promise.all([
            searchMovies(query, 1),
            searchTv(query, 1),
          ])
          const movieResults = movieRes?.results || []
          const tvResults = tvRes?.results || []
          const merged = tab === 'movies'
            ? movieResults
            : tab === 'series'
            ? tvResults
            : [...movieResults, ...tvResults].sort((a, b) => b.vote_average - a.vote_average)
          if (!cancelled) { setMovies(merged); setHasMore(false) }
        } else {
          const detailPromises = tab === 'trending'
            ? [fetchTrending(1)]
            : [fetchPopularMovies(1), fetchNowPlaying(1), fetchTopRated(1), fetchUpcoming(1)]
          const results = await Promise.all(detailPromises)
          const all = results.flatMap(r => r?.results || [])
          const seen = new Set<number>()
          const unique: Movie[] = []
          for (const m of all) { if (!seen.has(m.id)) { seen.add(m.id); unique.push(m) } }
          if (tab === 'trending') {
            unique.sort((a, b) => b.release_date?.localeCompare(a.release_date || '') || 0)
          }
          if (!cancelled) { setMovies(unique); setPage(1); setHasMore(true) }
        }
      } catch (e) { console.error(e) } finally { if (!cancelled) setInitialLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [query, tab])

  useEffect(() => {
    if (selectedGenre === null) return
    let cancelled = false
    const load = async () => {
      setInitialLoading(true)
      try {
        const isTv = tab === 'series'
        const res = await fetchDiscoverTv(selectedGenre)
        if (!cancelled) { setMovies(res?.results || []); setHasMore(false) }
      } catch (e) { console.error(e) } finally { if (!cancelled) setInitialLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [selectedGenre, tab])

  const setTabWithParams = (t: Tab) => { setTab(t); setSearchParams({ tab: t }) }

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-warm-900">Browse</h1>
            <p className="text-warm-600 mt-1 text-sm">Discover movies and series</p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search movies & series..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 bg-white border border-warm-200 text-warm-900 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-crimson transition text-lg">×</button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-thin pb-2">
          {([['movies', 'Movies'], ['series', 'Series'], ['trending', 'Trending']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTabWithParams(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                tab === t ? 'bg-crimson text-white' : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!query && (
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-thin pb-2">
            {activeGenres.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  selectedGenre === g.id
                    ? 'bg-crimson text-white'
                    : 'bg-warm-100 text-warm-600 hover:bg-warm-200 hover:text-warm-900'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {initialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-warm-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !query && selectedGenre === null && tab !== 'trending' ? (
          <div>
            <ContentRow title="Trending Now" fetchFn={fetchTrending} onItemClick={m => navigate(m.media_type === 'tv' ? `/watch/tv/${m.id}` : `/watch/${m.id}`)} />
            <ContentRow title="Latest Releases" fetchFn={fetchNowPlaying} onItemClick={m => navigate(m.media_type === 'tv' ? `/watch/tv/${m.id}` : `/watch/${m.id}`)} />
            <ContentRow title="Top Rated" fetchFn={fetchTopRated} onItemClick={m => navigate(m.media_type === 'tv' ? `/watch/tv/${m.id}` : `/watch/${m.id}`)} />
            <ContentRow title="Upcoming" fetchFn={fetchUpcoming} onItemClick={m => navigate(m.media_type === 'tv' ? `/watch/tv/${m.id}` : `/watch/${m.id}`)} />
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-warm-900 mb-4">Browse All</h2>
              <VirtualMovieGrid
                movies={movies}
                loading={initialLoading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onSelect={id => {
                  const m = movies.find(x => x.id === id)
                  window.location.href = m?.media_type === 'tv' ? `/watch/tv/${id}` : `/watch/${id}`
                }}
              />
            </div>
          </div>
        ) : (
          <VirtualMovieGrid
            movies={movies}
            loading={initialLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onSelect={id => {
              const m = movies.find(x => x.id === id)
              window.location.href = m?.media_type === 'tv' ? `/watch/tv/${id}` : `/watch/${id}`
            }}
          />
        )}
      </div>
    </div>
  )
}
