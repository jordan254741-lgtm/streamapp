import { useNavigate } from 'react-router-dom'

import type { Movie } from '../../types'

const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

interface MovieCardProps {
  movie: Movie
  onClick?: () => void
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/watch/${movie.id}`)
    }
  }

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE}${movie.poster_path}`
    : 'https://placehold.co/500x750/1a1a2e/ffffff?text=No+Poster'
  const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A'
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-lg overflow-hidden bg-gray-900 hover:scale-105 hover:shadow-2xl transition-all duration-200"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="text-center px-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-2">
              <span className="text-white text-lg sm:text-xl ml-0.5">▶</span>
            </div>
            <p className="text-white text-xs sm:text-sm font-medium">Watch Now</p>
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-black/80 text-yellow-400 text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
          ★ {rating}
        </div>
      </div>
      <div className="p-2 sm:p-3">
        <h3 className="text-white font-semibold text-xs sm:text-sm leading-tight line-clamp-2 mb-1">{movie.title}</h3>
        <p className="text-gray-400 text-xs">{year}</p>
      </div>
    </div>
  )
}
