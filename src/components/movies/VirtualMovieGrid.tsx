import { useEffect, useMemo, useRef, useState } from 'react'
import { Grid } from 'react-window'

import type { Movie } from '../../types'
import MovieCard from './MovieCard'

interface Props {
  movies: Movie[]
  gap?: number
  onMovieClick?: (movie: Movie) => void
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
  movies,
  columns,
  gap,
  onMovieClick,
}: {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
} & CellExtraProps) {
  const index = rowIndex * columns + columnIndex
  if (index >= movies.length) return null
  const movie = movies[index]
  return (
    <div style={{ ...style, padding: `${gap / 2}px` }}>
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

export default function VirtualMovieGrid({ movies, gap = 16, onMovieClick }: Props) {
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
        rowCount={Math.ceil(movies.length / columns)}
        rowHeight={cardHeight + gap}
        style={{ height: typeof window !== 'undefined' ? window.innerHeight - 200 : 600, width }}
        overscanCount={2}
      />
    </div>
  )
}
