interface EnvVar {
  key: string
  label: string
  required: boolean
}

const REQUIRED_VARS: EnvVar[] = [
  { key: 'VITE_SUPABASE_URL', label: 'Supabase URL', required: true },
  { key: 'VITE_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', required: true },
  { key: 'VITE_TMDB_API_KEY', label: 'TMDB API Key', required: true },
  { key: 'VITE_TMDB_BASE_URL', label: 'TMDB Base URL', required: false },
  { key: 'VITE_YOUTUBE_API_KEY', label: 'YouTube API Key', required: true },
]

interface ValidationResult {
  valid: boolean
  missing: string[]
}

export function validateEnv(): ValidationResult {
  const missing: string[] = []

  for (const v of REQUIRED_VARS) {
    if (!v.required) continue
    const value = import.meta.env[v.key] as string | undefined
    if (!value || value.trim() === '') {
      missing.push(`${v.label} (${v.key})`)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

export function getEnvMessage(): string {
  const result = validateEnv()
  if (result.valid) return ''
  return `Missing required environment variables: ${result.missing.join(', ')}`
}
