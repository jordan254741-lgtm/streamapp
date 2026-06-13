import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const QUALITY_STYLES = {
  '480p':  'text-gray-400 bg-gray-800',
  '720p':  'text-blue-400 bg-blue-900/40',
  '1080p': 'text-purple-400 bg-purple-900/40',
}

export default function Downloads({ user }) {
  const navigate = useNavigate()
  const [downloads, setDownloads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDownloads()
  }, [])

  const fetchDownloads = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('downloads')
      .select('*')
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false })
    setDownloads(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('downloads').delete().eq('id', id)
    setDownloads(prev => prev.filter(d => d.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/browse')} className="text-gray-300 hover:text-white text-sm">← Browse</button>
          <h1 className="text-purple-400 font-bold">StreamApp</h1>
        </div>
        <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg">Logout</button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Downloads</h1>
          <p className="text-gray-400 text-sm mt-1">Movies saved for offline viewing</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : downloads.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">⬇</p>
            <p className="text-gray-400 text-lg">No downloads yet</p>
            <p className="text-gray-500 text-sm mt-2">Click Download on any movie to save it here</p>
            <button onClick={() => navigate('/browse')}
              className="mt-6 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold">
              Browse Movies
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {downloads.map(dl => (
              <div key={dl.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition">
                {/* Poster */}
                {dl.poster_url ? (
                  <img src={dl.poster_url} alt={dl.title}
                    className="w-14 aspect-[2/3] object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-14 aspect-[2/3] bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">?</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{dl.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${QUALITY_STYLES[dl.quality]}`}>
                      {dl.quality}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(dl.downloaded_at).toLocaleDateString()}
                    </span>
                    <span className="text-green-400 text-xs">✓ Ready</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/watch/${dl.tmdb_id}`)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition">
                    ▶ Watch
                  </button>
                  <button
                    onClick={() => handleDelete(dl.id)}
                    className="bg-gray-800 hover:bg-red-900/50 hover:border-red-700 border border-gray-700 text-gray-400 hover:text-red-400 px-3 py-2 rounded-lg text-sm transition">
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* Storage summary */}
            <div className="mt-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{downloads.length} movie{downloads.length !== 1 ? 's' : ''} downloaded</span>
                <button onClick={async () => {
                  await supabase.from('downloads').delete().eq('user_id', user.id)
                  setDownloads([])
                }} className="text-red-400 hover:underline text-xs">
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}