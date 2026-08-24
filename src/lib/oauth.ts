import { supabase } from './supabase'

export type OAuthProvider = 'google' | 'github' | 'apple'

export type OAuthOutcome =
  | { status: 'redirecting' }
  | { status: 'error'; message: string }

async function providerAvailable(authorizeUrl: string): Promise<boolean> {
  try {
    const res = await fetch(authorizeUrl, { redirect: 'manual' })
    return res.type === 'opaqueredirect' || res.ok
  } catch {
    return false
  }
}

export async function signInWithProvider(
  provider: OAuthProvider,
  redirectTo: string,
): Promise<OAuthOutcome> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  })
  const authorizeUrl = data?.url
  if (!error && authorizeUrl && (await providerAvailable(authorizeUrl))) {
    window.location.href = authorizeUrl
    return { status: 'redirecting' }
  }
  const label = provider.charAt(0).toUpperCase() + provider.slice(1)
  return {
    status: 'error',
    message: `${label} sign-in isn't set up yet. Add its credentials under Authentication > Providers in the Supabase dashboard.`,
  }
}
