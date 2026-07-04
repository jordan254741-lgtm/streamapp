import { useState } from 'react'

import { supabase } from '../lib/supabase'
import type { Movie } from '../types'

interface Props {
  movie: Movie
  quality?: '480p' | '720p' | '1080p'
  user: { id: string }
}

export default function SaveForLaterButton({ movie, quality = '1080p', user }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await supabase.from('downloads').insert({
        user_id: user.id,
        tmdb_id: movie.id,
        title: movie.title,
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        quality,
        status: 'pending',
      })
      setSaved(true)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return <span className="text-green-700 text-sm font-medium">✓ Saved for later</span>
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="bg-warm-800 hover:bg-warm-900 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition"
    >
      {saving ? 'Saving...' : 'Save for Later'}
    </button>
  )
}
