import { fetchMovieVideos, fetchTmdbExternalIds, searchYouTubeTrailers, searchYouTubeVideos } from './movie-api'

interface VideoResult {
  videoId: string
  source: 'tmdb-trailer' | 'trailer-search' | 'full-movie-search'
}

const cache = new Map<string, VideoResult | null>()
const pending = new Map<string, Promise<VideoResult | null>>()

function getCached(tmdbId: number): VideoResult | null | undefined {
  const key = `video-${tmdbId}`
  if (cache.has(key)) return cache.get(key)!
  return undefined
}

function setCached(tmdbId: number, result: VideoResult | null): void {
  const key = `video-${tmdbId}`
  cache.set(key, result)
  if (cache.size > 500) {
    const keys = [...cache.keys()].slice(0, 100)
    keys.forEach(k => cache.delete(k))
  }
}

export async function resolveVideoSource(tmdbId: number, title: string, year: string): Promise<VideoResult | null> {
  const cached = getCached(tmdbId)
  if (cached !== undefined) return cached

  const key = `video-${tmdbId}`
  if (pending.has(key)) return pending.get(key)!

  const promise = resolveVideo(tmdbId, title, year)
  pending.set(key, promise)

  try {
    const result = await promise
    setCached(tmdbId, result)
    return result
  } finally {
    pending.delete(key)
  }
}

async function resolveVideo(tmdbId: number, title: string, year: string): Promise<VideoResult | null> {
  try {
    const externalIds = await fetchTmdbExternalIds(tmdbId)
    if (externalIds?.imdb_id) {
      const trailerResult = await searchYouTubeTrailers(`${title} ${year} official trailer`)
      if (trailerResult?.[0]?.id?.videoId) {
        return {
          videoId: trailerResult[0].id.videoId,
          source: 'tmdb-trailer',
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const trailerQuery = `${title} ${year} official trailer`
    const trailerData = await searchYouTubeTrailers(trailerQuery)
    if (trailerData?.length && trailerData[0]?.id?.videoId) {
      return {
        videoId: trailerData[0].id.videoId,
        source: 'trailer-search',
      }
    }

    const movieQuery = `${title} ${year} full movie`
    const movieData = await searchYouTubeVideos(movieQuery)
    if (movieData?.length && movieData[0]?.id?.videoId) {
      return {
        videoId: movieData[0].id.videoId,
        source: 'full-movie-search',
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const fallbackQuery = `${title} ${year}`
    const fallbackData = await searchYouTubeVideos(fallbackQuery)
    if (fallbackData?.length && fallbackData[0]?.id?.videoId) {
      return {
        videoId: fallbackData[0].id.videoId,
        source: 'full-movie-search',
      }
    }
  } catch {
    /* ignore */
  }

  return null
}

export async function resolveVideoSources(tmdbId: number, title: string, year: string): Promise<VideoResult[]> {
  const results: VideoResult[] = []
  const seen = new Set<string>()

  try {
    const videos = await fetchMovieVideos(tmdbId)
    for (const v of videos) {
      if (v.site === 'YouTube' && v.type === 'Trailer' && !seen.has(v.key)) {
        results.push({ videoId: v.key, source: 'tmdb-trailer' })
        seen.add(v.key)
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const trailerData = await searchYouTubeTrailers(`${title} ${year} official trailer`)
    for (const item of trailerData || []) {
      if (item?.id?.videoId && !seen.has(item.id.videoId)) {
        results.push({ videoId: item.id.videoId, source: 'trailer-search' })
        seen.add(item.id.videoId)
      }
    }
  } catch {
    /* ignore */
  }

  if (results.length === 0) {
    try {
      const movieData = await searchYouTubeVideos(`${title} ${year} full movie`)
      for (const item of movieData || []) {
        if (item?.id?.videoId && !seen.has(item.id.videoId)) {
          results.push({ videoId: item.id.videoId, source: 'full-movie-search' })
          seen.add(item.id.videoId)
        }
      }
    } catch {
      /* ignore */
    }
  }

  const primary = results[0]
  if (primary) setCached(tmdbId, primary)

  return results
}
