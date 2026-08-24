import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Layout from '../components/Layout'
import {
  fetchPersonDetails,
  groupCreditsByYear,
  type PersonDetailsResponse,
} from '../lib/movie-api'

const IMG = 'https://image.tmdb.org/t/p'

interface PersonProps {
  user: User
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function ageAt(birthday: string | null, deathday: string | null) {
  if (!birthday) return null
  const birth = new Date(birthday)
  if (Number.isNaN(birth.getTime())) return null
  const end = deathday ? new Date(deathday) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const monthDiff = end.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) age--
  return age >= 0 ? `${age}` : null
}

export default function Person({ user }: PersonProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [person, setPerson] = useState<PersonDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [bioExpanded, setBioExpanded] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    setBioExpanded(false)
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchPersonDetails(Number(id))
        if (!cancelled) setPerson(data)
      } catch (err) {
        console.error('Failed to load person:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <Layout user={user} maxWidth="3xl" showBack backTo="/browse" backLabel="Browse">
        <div className="animate-pulse">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-40 sm:w-48 aspect-[2/3] bg-warm-100 rounded-xl flex-shrink-0 mx-auto sm:mx-0" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-8 bg-warm-100 rounded w-1/2" />
              <div className="h-4 bg-warm-100 rounded w-1/3" />
              <div className="space-y-2 pt-4">
                <div className="h-3 bg-warm-100 rounded" />
                <div className="h-3 bg-warm-100 rounded w-5/6" />
                <div className="h-3 bg-warm-100 rounded w-2/3" />
              </div>
            </div>
          </div>
          <div className="mt-10">
            <div className="h-6 w-32 bg-warm-100 rounded mb-4" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-warm-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!person) {
    return (
      <Layout user={user} maxWidth="3xl" showBack backTo="/browse" backLabel="Browse">
        <div className="text-center py-20">
          <p className="text-warm-600 text-lg">Profile not found</p>
          <button onClick={() => navigate('/browse')} className="text-crimson hover:underline mt-3 text-sm">
            Back to Browse
          </button>
        </div>
      </Layout>
    )
  }

  const filmography = groupCreditsByYear(person.combined_credits.cast)
  const crewCount = person.combined_credits.crew.length
  const totalCredits = person.combined_credits.cast.length + crewCount
  const born = formatDate(person.birthday)
  const died = formatDate(person.deathday)
  const age = ageAt(person.birthday, person.deathday)
  const bio = person.biography?.trim() || 'No biography available.'
  const isLongBio = bio.length > 420

  return (
    <Layout user={user} maxWidth="3xl" showBack backTo="/browse" backLabel="Browse">
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-8 px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-warm-100/80 to-transparent">
        <div className="flex flex-col sm:flex-row gap-6">
          <img
            src={
              person.profile_path
                ? `${IMG}/w342${person.profile_path}`
                : 'https://placehold.co/342x513/e5dcda/6b5050?text=?'
            }
            alt={person.name}
            className="w-36 sm:w-44 md:w-48 aspect-[2/3] object-cover rounded-xl shadow-xl flex-shrink-0 mx-auto sm:mx-0"
          />
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-warm-900">{person.name}</h1>
            {person.known_for_department && (
              <p className="text-crimson font-medium mt-1">Known for {person.known_for_department}</p>
            )}
            <div className="mt-3 space-y-1 text-sm text-warm-700">
              {born && (
                <p>
                  <span className="font-semibold text-warm-800">Born:</span> {born}
                  {age && !died && ` (${age} years old)`}
                  {person.place_of_birth && <span className="text-warm-500"> · {person.place_of_birth}</span>}
                </p>
              )}
              {died && (
                <p>
                  <span className="font-semibold text-warm-800">Died:</span> {died}
                  {age && ` (${age} years old)`}
                </p>
              )}
              <p>
                <span className="font-semibold text-warm-800">Credits:</span> {totalCredits} appearances
              </p>
            </div>
            <div className="mt-4">
              <p className={`text-sm leading-relaxed text-warm-700 whitespace-pre-line ${!bioExpanded && isLongBio ? 'line-clamp-4' : ''}`}>
                {bio}
              </p>
              {isLongBio && (
                <button
                  onClick={() => setBioExpanded(e => !e)}
                  className="text-crimson text-sm font-semibold mt-1 hover:underline"
                >
                  {bioExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {filmography.length === 0 ? (
        <p className="text-warm-600 text-center py-10">No filmography available.</p>
      ) : (
        <>
          <h2 className="text-xl font-bold text-warm-900 mb-5">Filmography</h2>
          <div className="space-y-7">
            {filmography.map(({ year, items }) => (
              <div key={year}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-warm-500 border-b border-warm-200 pb-1.5 mb-3">
                  {year}
                  <span className="ml-2 font-normal normal-case tracking-normal text-xs text-warm-400">
                    {items.length} title{items.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-4">
                  {items.map(m => (
                    <div
                      key={`${m.media_type}-${m.id}-${m.character}`}
                      onClick={() => navigate(m.media_type === 'tv' ? `/watch/tv/${m.id}` : `/watch/${m.id}`)}
                      className="cursor-pointer group"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-warm-200 group-hover:scale-[1.03] transition-transform duration-150 bg-warm-100">
                        <img
                          src={
                            m.poster_path
                              ? `${IMG}/w185${m.poster_path}`
                              : 'https://placehold.co/185x278/e5dcda/6b5050?text=?'
                          }
                          alt={m.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {m.media_type === 'tv' && (
                          <span className="absolute top-1.5 left-1.5 bg-crimson text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            TV
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-warm-800 line-clamp-1 mt-1.5 group-hover:text-crimson transition-colors">
                        {m.title}
                      </p>
                      {m.character && (
                        <p className="text-[11px] sm:text-xs text-warm-500 line-clamp-1">{m.character}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
