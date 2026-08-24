import type { User } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Layout from '../components/Layout'
import ContentRow from '../components/movies/ContentRow'
import VirtualMovieGrid from '../components/movies/VirtualMovieGrid'
import {
  fetchAiringToday,
  fetchByTitles,
  fetchDiscoverMovies,
  fetchDiscoverTv,
  fetchNowPlaying,
  fetchOnTheAir,
  fetchPopularMovies,
  fetchPopularTv,
  fetchTopRated,
  fetchTopRatedTv,
  fetchTrending,
  fetchTrendingMovies,
  fetchTrendingTv,
  fetchUpcoming,
  searchMovies,
  searchTv,
} from '../lib/movie-api'
import { PICKED_TITLES } from '../lib/picks'
import type { Genre, Movie } from '../types'

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

type CuratedCat = { key: string; label: string; fetchFn: (page?: number) => Promise<{ results: Movie[] }> }

const MOVIE_CATEGORIES: CuratedCat[] = [
  { key: 'trending', label: 'Trending Now', fetchFn: fetchTrendingMovies },
  { key: 'popular', label: 'Popular', fetchFn: fetchPopularMovies },
  { key: 'latest', label: 'Latest Releases', fetchFn: fetchNowPlaying },
  { key: 'topRated', label: 'Top Rated', fetchFn: fetchTopRated },
  { key: 'upcoming', label: 'Upcoming', fetchFn: fetchUpcoming },
]

const TV_CATEGORIES: CuratedCat[] = [
  { key: 'trending', label: 'Trending Now', fetchFn: fetchTrendingTv },
  { key: 'popular', label: 'Popular Shows', fetchFn: fetchPopularTv },
  { key: 'latest', label: 'On the Air', fetchFn: fetchOnTheAir },
  { key: 'topRated', label: 'Top Rated', fetchFn: fetchTopRatedTv },
  { key: 'upcoming', label: 'Airing Today', fetchFn: fetchAiringToday },
]

const SECTION_SETTINGS_KEY = 'section-settings'

interface SectionPrefs {
  order?: string[]
  hidden?: string[]
}

type SectionSettingsMap = Record<string, SectionPrefs>

function loadSectionSettings(): SectionSettingsMap {
  try {
    const raw = localStorage.getItem(SECTION_SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as SectionSettingsMap) : {}
  } catch {
    return {}
  }
}

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
  const selectedGenreRef = useRef(selectedGenre)
  useEffect(() => { selectedGenreRef.current = selectedGenre }, [selectedGenre])
  const curatedCategories = tab === 'series' ? TV_CATEGORIES : MOVIE_CATEGORIES
  const [loadTrigger, setLoadTrigger] = useState(0)
  const [movies, setMovies] = useState<Movie[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sectionSettings, setSectionSettings] = useState<SectionSettingsMap>(loadSectionSettings)
  const [sectionsOpen, setSectionsOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SECTION_SETTINGS_KEY, JSON.stringify(sectionSettings))
    } catch { /* storage unavailable */ }
  }, [sectionSettings])

  const prefs = sectionSettings[tab] || {}
  const hiddenSet = new Set(prefs.hidden || [])
  const orderedCategories: CuratedCat[] = (() => {
    if (!prefs.order) return curatedCategories
    const defMap = new Map(curatedCategories.map(d => [d.key, d]))
    const ordered = prefs.order
      .map(k => defMap.get(k))
      .filter((d): d is CuratedCat => !!d)
    for (const d of curatedCategories) {
      if (!ordered.some(o => o.key === d.key)) ordered.push(d)
    }
    return ordered
  })()
  const visibleCategories = orderedCategories.filter(c => !hiddenSet.has(c.key))

  const updateTabPrefs = (fn: (p: SectionPrefs) => SectionPrefs) => {
    setSectionSettings(prev => ({ ...prev, [tab]: fn(prev[tab] || {}) }))
  }

  const toggleSection = (key: string) => updateTabPrefs(p => {
    const hidden = new Set(p.hidden || [])
    if (hidden.has(key)) hidden.delete(key)
    else hidden.add(key)
    return { ...p, hidden: [...hidden] }
  })

  const moveSection = (key: string, dir: -1 | 1) => {
    const keys = orderedCategories.map(c => c.key)
    const idx = keys.indexOf(key)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= keys.length) return
    ;[keys[idx], keys[target]] = [keys[target], keys[idx]]
    updateTabPrefs(p => ({ ...p, order: keys }))
  }

  const resetSections = () => updateTabPrefs(() => ({}))

  const activeGenres = tab === 'series' ? TV_GENRES : MOVIE_GENRES

  useEffect(() => {
    setMovies([]); setPage(1); setHasMore(true); setInitialLoading(true); setSelectedGenre(null)
  }, [tab])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && ['movies', 'series', 'trending'].includes(t)) setTab(t as Tab)
  }, [searchParams])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      let data
      if (selectedGenre !== null) {
        const fetchFn = tab === 'series' ? fetchDiscoverTv : fetchDiscoverMovies
        data = await fetchFn(selectedGenre, nextPage)
      } else if (tab === 'trending') {
        data = await fetchTrending(nextPage)
      } else {
        data = tab === 'series' ? await fetchPopularTv(nextPage) : await fetchPopularMovies(nextPage)
      }
      const newMovies: Movie[] = data?.results || []
      setMovies(prev => [...prev, ...newMovies])
      setPage(nextPage)
      setHasMore(newMovies.length > 0)
    } catch (e) { console.error(e) } finally { setLoadingMore(false) }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const isBackgroundReload = selectedGenreRef.current === null && !query.trim() && loadTrigger > 0
      if (!isBackgroundReload) setInitialLoading(true)
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
            : tab === 'series'
            ? [fetchPopularTv(1), fetchOnTheAir(1), fetchTopRatedTv(1), fetchAiringToday(1)]
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
      } catch (e) { console.error(e) } finally { if (!cancelled && !isBackgroundReload) setInitialLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [query, tab, loadTrigger])

  useEffect(() => {
    if (selectedGenre === null) {
      setInitialLoading(false)
      setLoadTrigger(t => t + 1)
      return
    }
    let cancelled = false
    const load = async () => {
      setInitialLoading(true)
      try {
        const fetchFn = tab === 'series' ? fetchDiscoverTv : fetchDiscoverMovies
        const res = await fetchFn(selectedGenre)
        if (!cancelled) { setMovies(res?.results || []); setPage(1); setHasMore(true); setInitialLoading(false) }
      } catch (e) { console.error(e); if (!cancelled) setInitialLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [selectedGenre, tab])

  const setTabWithParams = (t: Tab) => { setTab(t); setSearchParams({ tab: t }) }

  return (
    <Layout user={user} maxWidth="3xl">
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
              className="w-full sm:w-64 md:w-80 lg:w-96 bg-card border border-warm-200 text-warm-900 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
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
                onClick={() => { setInitialLoading(true); setSelectedGenre(selectedGenre === g.id ? null : g.id) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
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
            {/* Section settings */}
            <div className="flex items-center justify-end mb-2">
              <div className="relative">
                <button
                  onClick={() => setSectionsOpen(o => !o)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                    sectionsOpen
                      ? 'bg-crimson text-white'
                      : 'bg-warm-100 text-warm-600 hover:bg-warm-200 hover:text-warm-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Sections
                  <svg className={`w-3 h-3 transition ${sectionsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sectionsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSectionsOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-warm-200 rounded-xl shadow-lg z-20 p-3">
                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className="text-sm font-semibold text-warm-900">Home sections</span>
                        <button onClick={resetSections} className="text-xs text-crimson hover:underline font-medium">
                          Reset
                        </button>
                      </div>
                      <p className="text-[11px] text-warm-500 px-1 mb-2">Choose which rows appear and in what order.</p>
                      <div className="space-y-0.5 max-h-72 overflow-y-auto scrollbar-thin">
                        {orderedCategories.map((cat, i) => {
                          const hidden = hiddenSet.has(cat.key)
                          return (
                            <div key={cat.key} className={`flex items-center gap-1 rounded-lg pr-1 ${hidden ? 'opacity-50' : ''}`}>
                              <button
                                role="checkbox"
                                aria-checked={!hidden}
                                aria-label={`${hidden ? 'Show' : 'Hide'} ${cat.label}`}
                                onClick={() => toggleSection(cat.key)}
                                className={`w-8 h-8 flex items-center justify-center rounded-md transition ${
                                  !hidden ? 'text-crimson' : 'text-warm-300 hover:text-warm-500'
                                }`}
                              >
                                {!hidden ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                                  </svg>
                                )}
                              </button>
                              <span className="flex-1 text-left text-sm text-warm-800 truncate">{cat.label}</span>
                              <button
                                disabled={i === 0 || hidden}
                                onClick={() => moveSection(cat.key, -1)}
                                aria-label={`Move ${cat.label} up`}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-warm-600 hover:bg-warm-100 hover:text-crimson transition disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                disabled={i === orderedCategories.length - 1 || hidden}
                                onClick={() => moveSection(cat.key, 1)}
                                aria-label={`Move ${cat.label} down`}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-warm-600 hover:bg-warm-100 hover:text-crimson transition disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <ContentRow
              title="Picks"
              fetchFn={() => fetchByTitles(PICKED_TITLES)}
              onItemClick={m => navigate(m.media_type === 'tv' ? `/watch/tv/${m.id}` : `/watch/${m.id}`)}
            />

            {visibleCategories.length > 0 ? (
              visibleCategories.map(cat => (
                <ContentRow
                  key={`${tab}-${cat.key}`}
                  title={cat.label}
                  fetchFn={cat.fetchFn}
                  onItemClick={m => navigate(m.media_type === 'tv' ? `/watch/tv/${m.id}` : `/watch/${m.id}`)}
                />
              ))
            ) : (
              <div className="text-center py-10 border border-dashed border-warm-300 rounded-xl mt-4">
                <p className="text-warm-600 text-sm">All sections are hidden.</p>
                <button onClick={resetSections} className="text-crimson hover:underline text-sm font-medium mt-1">
                  Restore default sections
                </button>
              </div>
            )}

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
            emptyMessage={selectedGenre !== null
              ? `No ${activeGenres.find(g => g.id === selectedGenre)?.name || ''} content found`
              : undefined
            }
            onLoadMore={loadMore}
            onSelect={id => {
              const m = movies.find(x => x.id === id)
              window.location.href = m?.media_type === 'tv' ? `/watch/tv/${id}` : `/watch/${id}`
            }}
          />
        )}
    </Layout>
  )
}
