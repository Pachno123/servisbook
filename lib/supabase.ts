import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

// Browser client only — safe to import in client components
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
