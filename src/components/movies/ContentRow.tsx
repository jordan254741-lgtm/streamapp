import { useEffect, useRef, useState } from 'react'

import type { Movie } from '../../types'
import MovieCard from './MovieCard'

interface ContentRowProps {
  title: string
  items?: Movie[]
  fetchFn?: (page?: number) => Promise<Movie[]>
  onItemClick?: (movie: Movie) => void
  onMovieClick?: (id: number, movie: Movie) => void
}

export default function ContentRow({ title, items: propItems, fetchFn, onItemClick, onMovieClick }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [fetchedItems, setFetchedItems] = useState<Movie[]>([])

  const items = propItems ?? fetchedItems

  useEffect(() => {
    if (!fetchFn || propItems) return
    let cancelled = false
    fetchFn(1)
      .then(data => { if (!cancelled) setFetchedItems(data) })
      .catch(console.error)
    return () => { cancelled = true }
  }, [fetchFn, propItems])

  const updateScrollButtons = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10)
  }

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  useEffect(() => {
    updateScrollButtons()
  }, [items])

  const handleItemClick = (movie: Movie) => {
    if (onItemClick) onItemClick(movie)
    else if (onMovieClick) onMovieClick(movie.id, movie)
  }

  if (items.length === 0) return null

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-warm-900">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className={`p-1.5 rounded-full transition ${
              canScrollLeft
                ? 'bg-warm-100 text-warm-600 hover:bg-warm-200 hover:text-warm-900'
                : 'bg-warm-100/50 text-warm-400 cursor-default'
            }`}
            aria-label="Scroll left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className={`p-1.5 rounded-full transition ${
              canScrollRight
                ? 'bg-warm-100 text-warm-600 hover:bg-warm-200 hover:text-warm-900'
                : 'bg-warm-100/50 text-warm-400 cursor-default'
            }`}
            aria-label="Scroll right"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="relative">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-warm-50 to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-warm-50 to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory"
        >
          {items.map(movie => {
            const IS_TV = movie.media_type === 'tv'
            return (
              <div
                key={`${movie.media_type || 'movie'}-${movie.id}`}
                className="flex-shrink-0 w-[130px] sm:w-[150px] lg:w-[170px] snap-start group"
              >
                <div className="relative">
                  <MovieCard movie={movie} onClick={() => handleItemClick(movie)} />
                  {IS_TV && (
                    <span className="absolute top-1.5 left-1.5 bg-crimson text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      TV
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
