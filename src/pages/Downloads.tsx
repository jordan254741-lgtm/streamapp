import { useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { Movie } from '../types'

interface Props {
  user: { id: string }
}

interface DownloadItem {
  id: string
  tmdb_id: number
  title: string
  poster_url: string
  quality: '480p' | '720p' | '1080p'
  status: 'pending' | 'ready' | 'failed'
  created_at: string
  progress?: number
}

const qualityColors: Record<string, string> = {
  '1080p': 'bg-warm-800 text-white',
  '720p': 'bg-warm-500 text-white',
  '480p': 'bg-warm-300 text-warm-800',
}

const statusColors: Record<string, string> = {
  ready: 'text-green-700 bg-green-50',
  pending: 'text-warm-600 bg-warm-100',
  failed: 'text-crimson bg-red-50',
}

export default function Downloads({ user }: Props) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase
      .from('downloads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setDownloads((data as DownloadItem[]) || []) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 px-4 sm:px-6 lg:px-8 py-6 max-w-screen-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-warm-900">Downloads</h1>
          <p className="text-warm-600 mt-1 text-sm">Your saved content</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-warm-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-50 px-4 sm:px-6 lg:px-8 py-6 max-w-screen-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-warm-900">Downloads</h1>
        <p className="text-warm-600 mt-1 text-sm">Your saved content</p>
      </div>

      {downloads.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📥</div>
          <h3 className="text-xl font-semibold text-warm-900 mb-2">No downloads yet</h3>
          <p className="text-warm-600">Save content from the Watch page to download later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {downloads.map(dl => (
            <div key={dl.id} className="bg-white rounded-lg overflow-hidden border border-warm-200 shadow-sm">
              <div className="aspect-[2/3] bg-warm-100 relative">
                <img src={dl.poster_url} alt={dl.title} className="w-full h-full object-cover" loading="lazy" />
                <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${qualityColors[dl.quality] || 'bg-warm-800 text-white'}`}>
                  {dl.quality}
                </span>
              </div>
              <div className="p-3">
                <h4 className="text-sm font-semibold text-warm-900 truncate">{dl.title}</h4>
                <p className={`text-xs font-medium mt-1 ${statusColors[dl.status]?.split(' ')[0] || 'text-warm-600'}`}>
                  {dl.status === 'ready' ? '✓ Ready' : dl.status === 'pending' ? '⏳ Pending' : '✗ Failed'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
