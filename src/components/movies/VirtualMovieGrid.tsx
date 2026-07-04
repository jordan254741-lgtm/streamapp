import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Grid } from 'react-window'

import type { Movie } from '../../types'
import MovieCard from './MovieCard'

interface Props {
  movies: Movie[]
  gap?: number
  onMovieClick?: (movie: Movie) => void
  onLoadMore?: () => void
}

interface CellExtraProps {
  movies: Movie[]
  columns: number
  gap: number
  onMovieClick?: (movie: Movie) => void
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
}: {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' }
} & CellExtraProps) {
  const index = rowIndex * columns + columnIndex
  if (index >= movies.length) return null
  const movie = movies[index]
  return (
    <div style={{ ...style, padding: `${gap / 2}px` }} {...ariaAttributes}>
      <MovieCard movie={movie} onClick={onMovieClick ? () => onMovieClick(movie) : undefined} />
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

export default function VirtualMovieGrid({ movies, gap = 16, onMovieClick, onLoadMore }: Props) {
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
      if (!onLoadMore) return
      const scrollOffset = e.currentTarget.scrollTop
      const totalHeight = rowCount * (cardHeight + gap)
      const visibleHeight = e.currentTarget.clientHeight
      if (scrollOffset + visibleHeight >= totalHeight - visibleHeight * 0.5) {
        onLoadMore()
      }
    },
    [onLoadMore, rowCount, cardHeight, gap],
  )

  const cellProps = useMemo<CellExtraProps>(
    () => ({ movies, columns, gap, onMovieClick }),
    [movies, columns, gap, onMovieClick],
  )

  if (width === 0 || movies.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        {movies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} onClick={onMovieClick ? () => onMovieClick(movie) : undefined} />
            ))}
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
    </div>
  )
}
