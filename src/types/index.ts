export interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
}

export interface Genre {
  id: number | null
  name: string
}

export interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

export interface User {
  id: string
  email?: string
  full_name: string
}

export interface Download {
  id: string
  user_id: string
  tmdb_id: number
  title: string
  poster_url: string
  quality: '480p' | '720p' | '1080p'
  status: 'pending' | 'completed' | 'failed'
  downloaded_at: string
}

export interface Request {
  id: string
  user_id: string
  title: string
  release_year: number
  language: string
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  vote_count: number
  created_at: string
}

export interface RequestVote {
  user_id: string
  request_id: string
  created_at: string
}
