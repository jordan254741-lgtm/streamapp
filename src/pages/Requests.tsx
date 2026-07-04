import type { User } from '@supabase/supabase-js'
import { FormEvent, useCallback, useEffect, useState } from 'react'

import ErrorBoundary from '../components/ErrorBoundary'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import type { Request } from '../types'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
  sourcing: 'bg-blue-900/50 text-blue-400 border border-blue-700',
  available:'bg-green-900/50 text-green-400 border border-green-700',
  rejected: 'bg-red-900/50 text-red-400 border border-red-700',
}

interface RequestsProps {
  user: User
}

export default function Requests({ user }: RequestsProps) {
  const [requests, setRequests] = useState<Request[]>([])
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [duplicate, setDuplicate] = useState<Request | null>(null)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    title: '', release_year: '', language: '', notes: ''
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: reqs }, { data: votes }] = await Promise.all([
      supabase.from('requests').select('*').order('vote_count', { ascending: false }),
      supabase.from('request_votes').select('request_id').eq('user_id', user.id),
    ])
    setRequests((reqs as Request[]) || [])
    setUserVotes(new Set((votes || []).map(v => (v as { request_id: string }).request_id)))
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleVote = async (req: Request) => {
    const alreadyVoted = userVotes.has(req.id)

    if (alreadyVoted) {
      await supabase.from('request_votes')
        .delete().eq('user_id', user.id).eq('request_id', req.id)
      await supabase.from('requests')
        .update({ vote_count: req.vote_count - 1 }).eq('id', req.id)
      setUserVotes(prev => { const s = new Set(prev); s.delete(req.id); return s })
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, vote_count: r.vote_count - 1 } : r
      ))
    } else {
      await supabase.from('request_votes')
        .insert({ user_id: user.id, request_id: req.id })
      await supabase.from('requests')
        .update({ vote_count: req.vote_count + 1 }).eq('id', req.id)
      setUserVotes(prev => new Set([...prev, req.id]))
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, vote_count: r.vote_count + 1 } : r
      ))
    }
  }

  const checkDuplicate = async (title: string) => {
    if (title.length < 2) { setDuplicate(null); return }
    const { data } = await supabase.from('requests')
      .select('*')
      .ilike('title', `%${title}%`)
      .limit(1)
    setDuplicate(data && data.length > 0 ? (data[0] as Request) : null)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, title: e.target.value }))
    checkDuplicate(e.target.value)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)

    const { error } = await supabase.from('requests').insert({
      user_id: user.id,
      title: form.title.trim(),
      release_year: form.release_year ? parseInt(form.release_year) : null,
      language: form.language.trim() || null,
      notes: form.notes.trim() || null,
    })

    if (!error) {
      setSuccess(`"${form.title}" has been requested!`)
      setForm({ title: '', release_year: '', language: '', notes: '' })
      setDuplicate(null)
      setShowForm(false)
      fetchAll()
      setTimeout(() => setSuccess(''), 4000)
    }
    setSubmitting(false)
  }

  return (
    <Layout user={user} maxWidth="lg" showBack backTo="/browse" backLabel="Browse">
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Movie Requests</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Vote for movies you want added. Most voted gets added first.</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setDuplicate(null) }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-5 py-2 rounded-lg font-semibold transition text-sm whitespace-nowrap ml-4"
        >
          {showForm ? 'Cancel' : '+ Request Movie'}
        </button>
      </div>

      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">
          ✓ {success}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Request a Movie</h2>

          {duplicate && (
            <div className="bg-yellow-900/40 border border-yellow-700 rounded-lg p-4 mb-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                Similar request already exists:
              </p>
              <p className="text-white font-semibold">{duplicate.title}
                {duplicate.release_year && <span className="text-gray-400 font-normal ml-2">({duplicate.release_year})</span>}
              </p>
              <p className="text-gray-400 text-sm mt-1">{duplicate.vote_count} votes · {duplicate.status}</p>
              <button
                onClick={() => { handleVote(duplicate); setShowForm(false) }}
                className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Upvote this instead
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Movie Title *</label>
              <input
                type="text" placeholder="e.g. The Dark Knight" value={form.title}
                onChange={handleTitleChange}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-400"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Release Year</label>
                <input
                  type="number" placeholder="e.g. 2008" value={form.release_year}
                  onChange={e => setForm(f => ({ ...f, release_year: e.target.value }))}
                  min="1900" max="2026"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Language</label>
                <input
                  type="text" placeholder="e.g. English, Swahili" value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Notes (optional)</label>
              <textarea
                placeholder="Any extra details..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-400 resize-none"
              />
            </div>
            <button type="submit" disabled={submitting}
              className="bg-white hover:bg-gray-200 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No requests yet.</p>
          <p className="text-gray-500 text-sm mt-2">Be the first to request a movie!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((req, index) => (
            <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-5 hover:border-gray-700 transition">
              <span className="text-xl sm:text-2xl font-bold text-gray-700 w-6 sm:w-8 text-center flex-shrink-0">
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h3 className="font-semibold text-white text-sm sm:text-base truncate">{req.title}</h3>
                  {req.release_year && <span className="text-gray-400 text-xs sm:text-sm">({req.release_year})</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[req.status] || STATUS_STYLES.pending}`}>
                    {req.status}
                  </span>
                </div>
                {req.language && <p className="text-gray-500 text-xs mt-1">Language: {req.language}</p>}
                {req.notes && <p className="text-gray-500 text-xs mt-1 truncate">{req.notes}</p>}
              </div>

              <button
                onClick={() => handleVote(req)}
                className={`flex flex-col items-center px-3 sm:px-4 py-2 sm:py-3 rounded-xl border transition flex-shrink-0 ${
                  userVotes.has(req.id)
                    ? 'bg-gray-800 border-white text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-white hover:text-white'
                }`}
              >
                <span className="text-base sm:text-lg leading-none">▲</span>
                <span className="text-xs sm:text-sm font-bold mt-1">{req.vote_count}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
