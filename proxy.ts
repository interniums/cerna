import { type NextRequest } from 'next/server'

import { updateSupabaseSession } from '@/lib/supabase/middleware'

// Next.js 16: `middleware.ts` is deprecated in favor of `proxy.ts`.
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request)
}

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - _next static files
     * - images, icons
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


