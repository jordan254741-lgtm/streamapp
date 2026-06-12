import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../components/movies/MovieCard'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

const GENRES = [
  { id: null, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10749, name: 'Romance' },
  { id: 53, name: 'Thriller' },
]

export default function Browse({ user }) {
  const navigate = useNavigate()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeGenre, setActiveGenre] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { fetchMovies() }, [search, activeGenre, page])

  const fetchMovies = async () => {
    setLoading(true)
    setError(null)
    try {
      let url
      if (search) {
        url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(search)}&page=${page}`
      } else if (activeGenre) {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${activeGenre}&sort_by=popularity.desc&page=${page}`
      } else {
        url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${page}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch movies')
      const data = await res.json()
      setMovies(data.results || [])
      setTotalPages(Math.min(data.total_pages || 1, 20))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setActiveGenre(null)
    setPage(1)
  }

  const handleLogout = async () => {
    const { supabase } = await import('../lib/supabase')
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-purple-400">StreamApp</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm hidden sm:block">{user?.email}</span>
          <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg">Logout</button>
        </div>
      </nav>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search for a movie..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-purple-500"
          />
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold">Search</button>
          {(search || activeGenre) && (
            <button type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setActiveGenre(null); setPage(1) }}
              className="bg-gray-700 text-white px-4 py-3 rounded-lg">Clear</button>
          )}
        </form>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {GENRES.map(genre => (
            <button key={genre.id}
              onClick={() => { setActiveGenre(genre.id); setSearch(''); setSearchInput(''); setPage(1) }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeGenre === genre.id || (genre.id === null && !activeGenre && !search)
                  ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}>
              {genre.name}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4">
          {search ? `Results for "${search}"` : activeGenre
            ? GENRES.find(g => g.id === activeGenre)?.name : 'Popular Movies'}
        </h2>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && <div className="text-center py-20"><p className="text-red-400">{error}</p></div>}
        {!loading && !error && movies.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No movies found.</p>
          </div>
        )}
        {!loading && !error && movies.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}
            </div>
            <div className="flex justify-center items-center gap-4 mt-10">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-40">← Prev</button>
              <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-40">Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}