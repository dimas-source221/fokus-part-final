// Shared client-side API helpers and in-memory cache for the tracker.

export const isBrowser = typeof window !== 'undefined'

export const api = async (path: string, opts: RequestInit = {}) => {
  if (!isBrowser) {
    throw new Error('api() can only be called from the browser')
  }
  const { supabase } = await import('@/lib/supabase-browser')
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error || 'Request failed')
  return data
}

const cache = new Map<string, any>()
export const getCached = (k: string) => (isBrowser ? cache.get(k) : undefined)
export const setCached = (k: string, v: any) => {
  if (isBrowser) cache.set(k, v)
  return v
}
export const invalidateCache = (prefix: string) => {
  if (!isBrowser) return
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
