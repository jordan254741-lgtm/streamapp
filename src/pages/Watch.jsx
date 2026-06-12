import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'

const VIDEO_MAP = {
  653:   'dCT1YUtNOA8',   // Nosferatu 1922 (HD)
  29345: 'dCT1YUtNOA8',   // Nosferatu alternate ID
  11:    'jclhVKSC0Tk',   // Night of the Living Dead 1968
  843:   'LVV7UutK0Xk',   // Metropolis 1927 (Restored 4K)
}
function VideoPlayer({ videoId }) {
  return (
    <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        style={{ width: '100%', height: '100%' }}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Movie Player"
      />
    </div>
  )
}

export default function Watch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [cast, setCast] = useState([])
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)
  const videoId = VIDEO_MAP[Number(id)] || null

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchMovieData()
  }, [id])

  const fetchMovieData = async () => {
    setLoading(true)
    try {
      const [detailsRes, creditsRes, similarRes] = await Promise.all([
        fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`),
        fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`),
        fetch(`${BASE_URL}/movie/${id}/similar?api_key=${API_KEY}`),
      ])
      const details = await detailsRes.json()
      const credits = await creditsRes.json()
      const similarData = await similarRes.json()
      setMovie(details)
      setCast((credits.cast || []).slice(0, 8))
      setSimilar((similarData.results || []).slice(0, 6))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!movie) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-xl mb-4">Movie not found</p>
        <button onClick={() => navigate('/browse')} className="text-purple-400 hover:underline">← Back</button>
      </div>
    </div>
  )

  const backdropUrl = movie.backdrop_path ? `${IMG}/w1280${movie.backdrop_path}` : null
  const posterUrl = movie.poster_path ? `${IMG}/w500${movie.poster_path}` : null
  const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A'
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'
  const runtime = movie.runtime ? `${movie.runtime} min` : ''

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate('/browse')} className="text-gray-300 hover:text-white text-sm">← Browse</button>
        <h1 className="text-purple-400 font-bold">StreamApp</h1>
      </nav>

      {videoId ? (
        <div className="bg-black max-w-5xl mx-auto">
          <VideoPlayer videoId={videoId} />
        </div>
      ) : (
        <div className="relative h-72 overflow-hidden bg-gray-900">
          {backdropUrl && <img src={backdropUrl} alt={movie.title} className="w-full h-full object-cover opacity-40" />}
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
            <p className="text-gray-300 text-lg">Video not available yet</p>
            <button onClick={() => navigate('/requests')} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold">
              Request this movie
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {posterUrl && <img src={posterUrl} alt={movie.title} className="w-40 rounded-xl shadow-2xl flex-shrink-0 hidden md:block" />}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
              <span className="text-yellow-400 font-bold">★ {rating}</span>
              <span className="text-gray-400">{year}</span>
              {runtime && <span className="text-gray-400">{runtime}</span>}
              {movie.genres?.map(g => (
                <span key={g.id} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs">{g.name}</span>
              ))}
            </div>
            <p className="text-gray-300 leading-relaxed">{movie.overview}</p>
          </div>
        </div>

        {cast.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">Cast</h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {cast.map(person => (
                <div key={person.id} className="text-center">
                  <img
                    src={person.profile_path ? `${IMG}/w185${person.profile_path}` : 'https://placehold.co/185x278/1f2937/9ca3af?text=?'}
                    alt={person.name}
                    className="w-full aspect-[2/3] object-cover rounded-lg mb-1"
                  />
                  <p className="text-xs text-gray-300 line-clamp-2">{person.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {similar.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">More like this</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {similar.map(m => (
                <div key={m.id} onClick={() => navigate(`/watch/${m.id}`)} className="cursor-pointer hover:scale-105 transition-transform">
                  <img
                    src={m.poster_path ? `${IMG}/w342${m.poster_path}` : 'https://placehold.co/342x513/1f2937/9ca3af?text=?'}
                    alt={m.title}
                    className="w-full aspect-[2/3] object-cover rounded-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{m.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}