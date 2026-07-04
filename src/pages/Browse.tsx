import type { User } from '@supabase/supabase-js'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ErrorBoundary from '../components/ErrorBoundary'
import Layout from '../components/Layout'
import ContentRow from '../components/movies/ContentRow'
import VirtualMovieGrid from '../components/movies/VirtualMovieGrid'
import {
  fetchDiscoverMovies,
  fetchDiscoverTv,
  fetchNowPlaying,
  fetchPopularMovies,
  fetchPopularTv,
  fetchTopRated,
  fetchTrending,
  searchMovies,
  searchTv,
} from '../lib/movie-api'
import type { Genre } from '../types'

const MOVIE_GENRES: Genre[] = [
  { id: null, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10749, name: 'Romance' },
  { id: 53, name: 'Thriller' },
]

const TV_GENRES: Genre[] = [
  { id: null, name: 'All' },
  { id: 10759, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 9648, name: 'Mystery' },
  { id: 10765, name: 'Sci-Fi' },
  { id: 10751, name: 'Family' },
  { id: 16, name: 'Animation' },
]

const MAX_PAGES = 20

interface BrowseProps {
  user: User
}

export default function Browse({ user }: BrowseProps) {
  const navigate = useNavigate()
  const [view, setView] = useState<'home' | 'browse'>('home')
  const [browseType, setBrowseType] = useState<'movies' | 'series'>('movies')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeGenre, setActiveGenre] = useState<number | null>(null)

  const genres = browseType === 'series' ? TV_GENRES : MOVIE_GENRES

  const isSearching = !!search

  const trendingQuery = useQuery({
    queryKey: ['home', 'trending'],
    queryFn: () => fetchTrending(1),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })

  const latestQuery = useQuery({
    queryKey: ['home', 'latest'],
    queryFn: () => fetchNowPlaying(1),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })

  const topRatedQuery = useQuery({
    queryKey: ['home', 'topRated'],
    queryFn: () => fetchTopRated(1),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })

  const popularTvQuery = useQuery({
    queryKey: ['home', 'popularTv'],
    queryFn: () => fetchPopularTv(1),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })

  const browseQueryKey = ['browse', browseType, search, activeGenre] as const

  const {
    data: browseData,
    isLoading: browseLoading,
    isFetchingNextPage: browseFetchingNext,
    hasNextPage: browseHasNext,
    fetchNextPage: browseFetchNext,
    error: browseError,
  } = useInfiniteQuery({
    queryKey: browseQueryKey,
    queryFn: async ({ pageParam = 1 }) => {
      if (search) {
        return browseType === 'series' ? searchTv(search, pageParam) : searchMovies(search, pageParam)
      }
      if (activeGenre) {
        return browseType === 'series' ? fetchDiscoverTv(activeGenre, pageParam) : fetchDiscoverMovies(activeGenre, pageParam)
      }
      return browseType === 'series' ? fetchPopularTv(pageParam) : fetchPopularMovies(pageParam)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length >= Math.min(lastPage.total_pages, MAX_PAGES)) return undefined
      return pages.length + 1
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    enabled: view === 'browse' || isSearching,
  })

  const browseItems = browseData?.pages.flatMap(p => p.results) || []
  const browseErrorMsg = browseError instanceof Error ? browseError.message : null

  const navigateToContent = (movie: { id: number; media_type?: string }) => {
    const mediaType = movie.media_type || 'movie'
    if (mediaType === 'tv') {
      navigate(`/watch/tv/${movie.id}`)
    } else {
      navigate(`/watch/${movie.id}`)
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    if (!searchInput) {
      setView('home')
    } else {
      setView('browse')
    }
    setActiveGenre(null)
  }

  const switchToBrowse = (type: 'movies' | 'series') => {
    setBrowseType(type)
    setView('browse')
    setSearch('')
    setSearchInput('')
    setActiveGenre(null)
  }

  const showHome = view === 'home' && !isSearching

  return (
    <Layout user={user} maxWidth="3xl">
      <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search movies & series..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 sm:py-3 outline-none focus:border-gray-400 text-sm sm:text-base"
          />
        </div>
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap"
        >
          Search
        </button>
      </form>

      {showHome && (
        <>
          <ErrorBoundary>
            {trendingQuery.data && (
              <ContentRow title="Trending Now" items={trendingQuery.data.results.slice(0, 20)} onItemClick={navigateToContent} />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {latestQuery.data && (
              <ContentRow title="Latest Releases" items={latestQuery.data.results.slice(0, 20)} onItemClick={navigateToContent} />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {topRatedQuery.data && (
              <ContentRow title="Top Rated" items={topRatedQuery.data.results.slice(0, 20)} onItemClick={navigateToContent} />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {popularTvQuery.data && (
              <ContentRow title="Popular Series" items={popularTvQuery.data.results.slice(0, 20)} onItemClick={navigateToContent} />
            )}
          </ErrorBoundary>

          <div className="border-t border-gray-800 pt-6 sm:pt-8 mt-6 sm:mt-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg sm:text-xl font-bold">Browse All</h2>
              <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => switchToBrowse('movies')}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition ${
                    browseType === 'movies'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Movies
                </button>
                <button
                  onClick={() => switchToBrowse('series')}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition ${
                    browseType === 'series'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Series
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-thin">
              {genres.map(genre => (
                <button
                  key={genre.id}
                  onClick={() => { setActiveGenre(genre.id); setSearch(''); setSearchInput('') }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                    activeGenre === genre.id || (genre.id === null && !activeGenre && !search)
                      ? 'bg-purple-100 text-purple-900'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>

            {browseLoading && (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {browseErrorMsg && (
              <div className="text-center py-20">
                <p className="text-red-400 mb-2">{browseErrorMsg}</p>
                <button onClick={() => window.location.reload()} className="text-sm text-gray-400 hover:text-white underline">Try again</button>
              </div>
            )}
            {!browseLoading && !browseErrorMsg && browseItems.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">Nothing found.</p>
                {(search || activeGenre) && (
                  <button onClick={() => { setSearch(''); setSearchInput(''); setActiveGenre(null) }} className="mt-4 text-sm text-purple-400 hover:underline">Clear filters</button>
                )}
              </div>
            )}
            {!browseLoading && !browseErrorMsg && browseItems.length > 0 && (
              <>
                <VirtualMovieGrid
                  movies={browseItems}
                  onMovieClick={(movie) => navigateToContent(movie)}
                  onLoadMore={browseHasNext ? () => browseFetchNext() : undefined}
                />
                {browseFetchingNext && (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!browseHasNext && browseItems.length > 0 && (
                  <p className="text-center text-gray-500 text-sm py-8">You've reached the end</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {!showHome && (
        <>
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-gray-800">
            <button
              onClick={() => { setBrowseType('movies'); setSearch(''); setSearchInput(''); setActiveGenre(null); setView('home') }}
              className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-500 hover:text-gray-300 transition"
            >
              ← Back to Home
            </button>
          </div>

          <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-thin">
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => { setActiveGenre(genre.id); setSearch(''); setSearchInput('') }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                  activeGenre === genre.id || (genre.id === null && !activeGenre && !search)
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {genre.name}
              </button>
            ))}
          </div>

          <h2 className="text-lg sm:text-xl font-bold mb-4">
            {search ? `Results for "${search}"` : activeGenre ? genres.find(g => g.id === activeGenre)?.name || '' : ''}
          </h2>

          {browseLoading && (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {browseErrorMsg && (
            <div className="text-center py-20">
              <p className="text-red-400 mb-2">{browseErrorMsg}</p>
              <button onClick={() => window.location.reload()} className="text-sm text-gray-400 hover:text-white underline">Try again</button>
            </div>
          )}
          {!browseLoading && !browseErrorMsg && browseItems.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">Nothing found.</p>
              {(search || activeGenre) && (
                <button onClick={() => { setSearch(''); setSearchInput(''); setActiveGenre(null); setView('home') }} className="mt-4 text-sm text-purple-400 hover:underline">Clear filters</button>
              )}
            </div>
          )}
          {!browseLoading && !browseErrorMsg && browseItems.length > 0 && (
            <>
              <ErrorBoundary>
                <VirtualMovieGrid
                  movies={browseItems}
                  onMovieClick={(movie) => navigateToContent(movie)}
                  onLoadMore={browseHasNext ? () => browseFetchNext() : undefined}
                />
              </ErrorBoundary>
              {browseFetchingNext && (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!browseHasNext && browseItems.length > 0 && (
                <p className="text-center text-gray-500 text-sm py-8">You've reached the end</p>
              )}
            </>
          )}
        </>
      )}
    </Layout>
  )
}
