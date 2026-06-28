import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Admin client — server only, uses SUPABASE_SERVICE_ROLE_KEY (not exposed to browser)
// Intentionally untyped: avoids TS friction with .update()/.upsert() overloads.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (_e) {
            // Server component - ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (_e) {
            // Server component - ignore
          }
        },
      },
    }
  )
}

interface AuthContext {
  user: { id: string; email: string; companyId: string; role: 'admin' | 'technician'; fullName: string }
  supabase: ReturnType<typeof createSupabaseServerClient>
}

// In-memory cache of profile lookups keyed by user.id. Survives across requests
// on warm Vercel Fluid Compute instances, so most API calls skip the second
// Supabase round-trip (the profiles SELECT). TTL is short — 60s is enough to
// amortize across a screen's worth of parallel API calls without serving stale
// company assignments after admin changes.
type CachedProfile = { company_id: string; role: 'admin' | 'technician'; full_name: string; expiresAt: number }
const profileCache = new Map<string, CachedProfile>()
const PROFILE_TTL_MS = 60_000

// Resolve current authenticated user (with company context) or return a 401.
export async function requireUser(): Promise<
  | AuthContext
  | { error: NextResponse }
> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  type ProfileShape = { company_id?: string; role?: 'admin' | 'technician'; full_name?: string }
  const now = Date.now()
  const cached = profileCache.get(user.id)
  let p: ProfileShape | null = null

  if (cached && cached.expiresAt > now) {
    p = { company_id: cached.company_id, role: cached.role, full_name: cached.full_name }
  } else {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role, full_name')
      .eq('user_id', user.id)
      .maybeSingle()
    p = profile as ProfileShape | null
    if (p?.company_id) {
      profileCache.set(user.id, {
        company_id: p.company_id,
        role: (p.role as 'admin' | 'technician') ?? 'admin',
        full_name: p.full_name ?? '',
        expiresAt: now + PROFILE_TTL_MS,
      })
    }
  }

  if (!p?.company_id) {
    return { error: NextResponse.json({ error: 'No company assigned' }, { status: 403 }) }
  }
  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      companyId: p.company_id,
      role: (p.role as 'admin' | 'technician') ?? 'admin',
      fullName: p.full_name ?? '',
    },
    supabase,
  }
}

// Call when the user's profile changes (role swap, company swap, name edit)
// so the next requireUser() refetches instead of serving stale cache.
export function invalidateProfileCache(userId: string): void {
  profileCache.delete(userId)
}
