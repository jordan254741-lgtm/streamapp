import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Grid } from 'react-window'

import type { Movie } from '../../types'
import MovieCard from './MovieCard'

interface Props {
  movies: Movie[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  gap?: number
  onMovieClick?: (movie: Movie) => void
  onSelect?: (id: number) => void
  onLoadMore?: () => void
}

interface CellExtraProps {
  movies: Movie[]
  columns: number
  gap: number
  onMovieClick?: (movie: Movie) => void
  onSelect?: (id: number) => void
}

function CellComponent({
  columnIndex,
  rowIndex,
  style,
  ariaAttributes,
  movies,
  columns,
  gap,
  onMovieClick,
  onSelect,
}: {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' }
} & CellExtraProps) {
  const index = rowIndex * columns + columnIndex
  if (index >= movies.length) return null
  const movie = movies[index]
  const handleClick = () => {
    if (onSelect) onSelect(movie.id)
    else if (onMovieClick) onMovieClick(movie)
  }
  return (
    <div style={{ ...style, padding: `${gap / 2}px` }} {...ariaAttributes}>
      <MovieCard movie={movie} onClick={handleClick} />
    </div>
  )
}

function getColumnCount(width: number): number {
  if (width < 480) return 2
  if (width < 640) return 3
  if (width < 1024) return 4
  if (width < 1280) return 5
  if (width < 1536) return 6
  return 7
}

export default function VirtualMovieGrid({ movies, loading, loadingMore, hasMore, gap = 16, onMovieClick, onSelect, onLoadMore }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [columns, setColumns] = useState(6)

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (width === 0) return
    setColumns(getColumnCount(width))
  }, [width])

  const { cardWidth, cardHeight } = useMemo(() => {
    if (width === 0) return { cardWidth: 0, cardHeight: 0 }
    const cardWidth = (width - (columns - 1) * gap) / columns
    const cardHeight = cardWidth * 1.5 + 60
    return { cardWidth, cardHeight }
  }, [width, columns, gap])

  const rowCount = Math.ceil(movies.length / columns)
  const gridHeight = typeof window !== 'undefined' ? window.innerHeight - 300 : 600

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!onLoadMore || hasMore === false) return
      const scrollOffset = e.currentTarget.scrollTop
      const totalHeight = rowCount * (cardHeight + gap)
      const visibleHeight = e.currentTarget.clientHeight
      if (scrollOffset + visibleHeight >= totalHeight - visibleHeight * 0.5) {
        onLoadMore()
      }
    },
    [onLoadMore, hasMore, rowCount, cardHeight, gap],
  )

  const cellProps = useMemo<CellExtraProps>(
    () => ({ movies, columns, gap, onMovieClick, onSelect }),
    [movies, columns, gap, onMovieClick, onSelect],
  )

  if (loading) {
    return (
      <div ref={containerRef} className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-warm-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (width === 0 || movies.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        {movies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {movies.map(movie => {
              const handleClick = () => {
                if (onSelect) onSelect(movie.id)
                else if (onMovieClick) onMovieClick(movie)
              }
              return (
                <MovieCard key={movie.id} movie={movie} onClick={handleClick} />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <Grid<CellExtraProps>
        cellComponent={CellComponent}
        cellProps={cellProps}
        columnCount={columns}
        columnWidth={cardWidth + gap}
        rowCount={rowCount}
        rowHeight={cardHeight + gap}
        overscanCount={3}
        onScroll={handleScroll}
        style={{ height: gridHeight, width }}
      />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
