import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ErrorBoundary from '../components/ErrorBoundary'
import Layout from '../components/Layout'
import SaveForLaterButton from '../components/SaveForLaterButton'
import { fetchMovieBoxSource, fetchMovieDetails, fetchTvDetails, getEmbedSources } from '../lib/movie-api'
import type { MovieDetailsResponse, TvDetailsResponse } from '../lib/movie-api'
import type { CastMember, MediaType, Movie } from '../types'

const IMG = 'https://image.tmdb.org/t/p'

function VideoFallback({ message }: { message?: string }) {
  return (
    <div className="aspect-video flex items-center justify-center bg-warm-100 rounded-lg">
      <div className="text-center px-4">
        <p className="text-warm-700 text-lg mb-2">No video available</p>
        <p className="text-warm-500 text-sm">{message || 'None of our sources have this yet.'}</p>
      </div>
    </div>
  )
}

interface WatchProps {
  user: User
}

interface MediaData {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  runtime?: number
  genres: Array<{ id: number; name: string }>
}

interface EmbedSource {
  key: string
  name: string
  embedUrl: string
}

function isTvRoute(type?: string) {
  return type === 'tv'
}

export default function Watch({ user }: WatchProps) {
  const { type: routeType, id } = useParams<{ type?: string; id: string }>()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [media, setMedia] = useState<MediaData | null>(null)
  const [cast, setCast] = useState<CastMember[]>([])
  const [similar, setSimilar] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState<EmbedSource[]>([])
  const [activeSource, setActiveSource] = useState<string>('')
  const [iframeLoading, setIframeLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const isTv = isTvRoute(routeType)
  const mediaType: MediaType = isTv ? 'tv' : 'movie'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const tmdbId = Number(id)
      const data = isTv ? await fetchTvDetails(tmdbId) : await fetchMovieDetails(tmdbId)

      const title = isTv
        ? (data as TvDetailsResponse).name
        : (data as MovieDetailsResponse).title
      const releaseDate = isTv
        ? (data as TvDetailsResponse).first_air_date || ''
        : (data as MovieDetailsResponse).release_date

      setMedia({
        id: data.id,
        title,
        overview: data.overview,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date: releaseDate,
        vote_average: data.vote_average,
        runtime: !isTv ? (data as MovieDetailsResponse).runtime : undefined,
        genres: data.genres,
      })

      setCast((data.credits?.cast || []).slice(0, 8))
      setSimilar((data.similar?.results || []).slice(0, 6))

      const embedSources = getEmbedSources(tmdbId, mediaType)

      const year = releaseDate ? releaseDate.split('-')[0] : ''
      const mbUrl = await fetchMovieBoxSource(title, year)
      if (mbUrl) {
        embedSources.unshift({ key: 'moviebox', name: 'MovieBox', embedUrl: mbUrl })
      }

      setSources(embedSources)
      if (embedSources.length > 0 && !activeSource) {
        setActiveSource(embedSources[0].key)
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [id, isTv, mediaType])

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchData()
  }, [fetchData])

  const activeSourceData = sources.find(s => s.key === activeSource)
  const isMovieBoxSource = activeSource === 'moviebox'

  const handleSourceChange = (key: string) => {
    setActiveSource(key)
    setIframeLoading(true)
    setLoadError(false)
  }

  if (loading) {
    return (
      <Layout user={user} maxWidth="3xl" showBack backTo="/browse" backLabel="Browse">
        <div className="animate-pulse">
          <div className="aspect-video bg-warm-100 rounded-lg mb-6" />
          <div className="flex gap-6">
            <div className="hidden sm:block w-28 sm:w-32 md:w-40 aspect-[2/3] bg-warm-100 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-warm-100 rounded w-3/4" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-warm-100 rounded" />
                <div className="h-5 w-20 bg-warm-100 rounded" />
                <div className="h-5 w-24 bg-warm-100 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-warm-100 rounded" />
                <div className="h-3 bg-warm-100 rounded w-5/6" />
                <div className="h-3 bg-warm-100 rounded w-2/3" />
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="h-6 w-16 bg-warm-100 rounded mb-4" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="aspect-[2/3] bg-warm-100 rounded-lg mb-1" />
                  <div className="h-3 bg-warm-100 rounded w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center flex-col gap-4">
        <p className="text-warm-600 text-lg">{isTv ? 'Series' : 'Movie'} not found</p>
        <button onClick={() => navigate('/browse')} className="text-crimson hover:underline">
          Back to Browse
        </button>
      </div>
    )
  }

  const posterUrl = media.poster_path ? `${IMG}/w500${media.poster_path}` : null
  const year = media.release_date ? media.release_date.split('-')[0] : 'N/A'
  const rating = media.vote_average ? media.vote_average.toFixed(1) : 'N/A'
  const runtime = media.runtime ? `${media.runtime} min` : ''

  return (
    <Layout user={user} maxWidth="3xl" showBack backTo="/browse" backLabel="Browse">
      <ErrorBoundary>
        {sources.length === 0 ? (
          <VideoFallback message={`No sources available for this ${isTv ? 'series' : 'movie'}.`} />
        ) : (
          <div className="bg-warm-900 rounded-lg overflow-hidden">
            {sources.length > 1 && (
              <div className="flex items-center gap-1 px-3 py-2 bg-warm-800 border-b border-warm-700 overflow-x-auto scrollbar-thin">
                {sources.map(s => (
                  <button
                    key={s.key}
                    onClick={() => handleSourceChange(s.key)}
                    className={`px-3 py-1.5 text-sm rounded font-medium whitespace-nowrap transition-colors ${
                      activeSource === s.key
                        ? 'bg-crimson text-white'
                        : 'bg-warm-700 text-warm-300 hover:bg-warm-600'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
                {isMovieBoxSource && (
                  <span className="text-xs text-warm-500 ml-auto hidden sm:inline">5min preview</span>
                )}
              </div>
            )}

            <div className="relative aspect-video">
              {iframeLoading && !isMovieBoxSource && (
                <div className="absolute inset-0 flex items-center justify-center bg-warm-900 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-crimson border-t-transparent rounded-full animate-spin" />
                    <p className="text-warm-400 text-xs">Loading player...</p>
                  </div>
                </div>
              )}

              {loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-warm-800 z-10 flex-col gap-2">
                  <p className="text-warm-400 text-sm">Failed to load.</p>
                  <button
                    onClick={() => { setLoadError(false); setIframeLoading(true) }}
                    className="px-3 py-1.5 text-sm bg-crimson text-white rounded hover:bg-crimson-dark transition"
                  >
                    Retry
                  </button>
                </div>
              )}

              {activeSourceData && isMovieBoxSource ? (
                <video
                  src={activeSourceData.embedUrl}
                  controls
                  className="w-full h-full"
                  onError={() => setLoadError(true)}
                />
              ) : activeSourceData ? (
                <iframe
                  ref={iframeRef}
                  src={activeSourceData.embedUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  onLoad={() => setIframeLoading(false)}
                  onError={() => setLoadError(true)}
                />
              ) : null}
            </div>
          </div>
        )}
      </ErrorBoundary>

      <div className="mt-6 sm:mt-8">
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          {posterUrl && (
            <img
              src={posterUrl}
              alt={media.title}
              className="w-28 sm:w-32 md:w-40 rounded-xl shadow-2xl flex-shrink-0 hidden sm:block"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-warm-900">{media.title}</h1>
              {isTv && (
                <span className="bg-crimson text-white text-xs font-bold px-2 py-0.5 rounded">TV</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 text-sm">
              <span className="text-yellow-600 font-bold">★ {rating}</span>
              <span className="text-warm-500">{year}</span>
              {runtime && <span className="text-warm-500">{runtime}</span>}
              {media.genres?.map(g => (
                <span key={g.id} className="bg-warm-100 text-warm-700 px-2 sm:px-3 py-1 rounded-full text-xs">
                  {g.name}
                </span>
              ))}
            </div>
            <p className="text-warm-700 leading-relaxed text-sm sm:text-base">{media.overview}</p>
            {!isTv && (
              <div className="mt-4">
                <SaveForLaterButton
                  movie={{
                    id: media.id,
                    title: media.title,
                    overview: media.overview,
                    poster_path: media.poster_path ?? '',
                    backdrop_path: media.backdrop_path ?? '',
                    release_date: media.release_date,
                    vote_average: media.vote_average,
                    vote_count: 0,
                    genre_ids: (media.genres || []).map(g => g.id),
                  }}
                  user={user}
                />
              </div>
            )}
          </div>
        </div>

        {cast.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-warm-900">Cast</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
              {cast.map(person => (
                <div key={person.id} className="text-center">
                  <img
                    src={
                      person.profile_path
                        ? `${IMG}/w185${person.profile_path}`
                        : 'https://placehold.co/185x278/e5dcda/6b5050?text=?'
                    }
                    alt={person.name}
                    className="w-full aspect-[2/3] object-cover rounded-lg mb-1"
                  />
                  <p className="text-sm text-warm-700 line-clamp-2">{person.name}</p>
                  <p className="text-xs text-warm-500 line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {similar.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-warm-900">More like this</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {similar.map(m => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/watch/${m.id}`)}
                  className="cursor-pointer hover:scale-105 transition-transform"
                >
                  <img
                    src={
                      m.poster_path
                        ? `${IMG}/w342${m.poster_path}`
                        : 'https://placehold.co/342x513/e5dcda/6b5050?text=?'
                    }
                    alt={m.title}
                    className="w-full aspect-[2/3] object-cover rounded-lg"
                  />
                  <p className="text-sm text-warm-600 mt-1 line-clamp-1">{m.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
