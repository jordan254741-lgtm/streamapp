import type { User } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ErrorBoundary from '../components/ErrorBoundary'
import Layout from '../components/Layout'
import VirtualMovieGrid from '../components/movies/VirtualMovieGrid'
import { fetchDiscoverMovies, fetchPopularMovies, searchMovies } from '../lib/movie-api'
import type { Genre } from '../types'

const GENRES: Genre[] = [
  { id: null, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10749, name: 'Romance' },
  { id: 53, name: 'Thriller' },
]

interface BrowseProps {
  user: User
}

export default function Browse({ user }: BrowseProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeGenre, setActiveGenre] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  const queryKey = ['movies', search, activeGenre, page] as const

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (search) {
        return searchMovies(search, page)
      }
      if (activeGenre) {
        return fetchDiscoverMovies(activeGenre, page)
      }
      return fetchPopularMovies(page)
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })

  const movies = data?.results || []
  const totalPages = Math.min(data?.total_pages || 1, 20)
  const errorMessage = error instanceof Error ? error.message : null

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setActiveGenre(null)
    setPage(1)
  }

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
            placeholder="Search for a movie..."
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
        {(search || activeGenre) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setActiveGenre(null); setPage(1) }}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm"
          >
            Clear
          </button>
        )}
      </form>

      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-thin">
        {GENRES.map(genre => (
          <button
            key={genre.id}
            onClick={() => { setActiveGenre(genre.id); setSearch(''); setSearchInput(''); setPage(1) }}
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
        {search
          ? `Results for "${search}"`
          : activeGenre
            ? GENRES.find(g => g.id === activeGenre)?.name
            : 'Popular Movies'}
      </h2>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {errorMessage && (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            Try again
          </button>
        </div>
      )}
      {!isLoading && !errorMessage && movies.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No movies found.</p>
          {(search || activeGenre) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setActiveGenre(null); setPage(1) }}
              className="mt-4 text-sm text-purple-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {!isLoading && !errorMessage && movies.length > 0 && (
        <>
          <ErrorBoundary>
            <VirtualMovieGrid
              movies={movies}
              onMovieClick={(movie) => navigate(`/watch/${movie.id}`)}
            />
          </ErrorBoundary>
          <div className="flex justify-center items-center gap-4 mt-8 sm:mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 sm:px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-gray-400 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 sm:px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </Layout>
  )
}
