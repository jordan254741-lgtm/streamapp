import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockNavigate } from '../../test/setup'
import type { Movie } from '../../types'
import MovieCard from './MovieCard'

const mockMovie: Movie = {
  id: 123,
  title: 'Test Movie',
  overview: 'A test movie',
  poster_path: '/test.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2024-01-01',
  vote_average: 8.5,
  vote_count: 1000,
  genre_ids: [28, 878],
}

describe('MovieCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders movie title', () => {
    render(<MovieCard movie={mockMovie} />)
    expect(screen.getByText('Test Movie')).toBeInTheDocument()
  })

  it('renders release year', () => {
    render(<MovieCard movie={mockMovie} />)
    expect(screen.getByText('2024')).toBeInTheDocument()
  })

  it('renders rating', () => {
    render(<MovieCard movie={mockMovie} />)
    expect(screen.getByText('★ 8.5')).toBeInTheDocument()
  })

  it('navigates to watch page on click', () => {
    render(<MovieCard movie={mockMovie} />)
    fireEvent.click(screen.getByText('Test Movie'))
    expect(mockNavigate).toHaveBeenCalledWith('/watch/123')
  })

  it('calls onClick prop when provided', () => {
    const onClick = vi.fn()
    render(<MovieCard movie={mockMovie} onClick={onClick} />)
    fireEvent.click(screen.getByText('Test Movie'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows placeholder when poster_path is null', () => {
    const movieWithoutPoster = { ...mockMovie, poster_path: null }
    render(<MovieCard movie={movieWithoutPoster} />)
    const img = screen.getByAltText('Test Movie')
    expect((img as HTMLImageElement).src).toContain('placehold.co')
  })
})