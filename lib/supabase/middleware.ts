import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseEnv } from '@/lib/supabase/env'

export async function updateSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({ request })
  const { url, anonKey } = getSupabaseEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // IMPORTANT: avoid using the returned data here; this call exists to refresh
  // the session cookie (if needed) for subsequent server component requests.
  await supabase.auth.getUser()

  return response
}
