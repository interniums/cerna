import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/crypto/app-encryption'

export type StoredIntegrationTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  scopes: string[]
}

export async function upsertIntegrationTokens(input: {
  integrationAccountId: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: string | null
  scopes?: string[]
}) {
  const admin = createSupabaseAdminClient()
  const res = await admin.from('integration_account_tokens').upsert(
    {
      integration_account_id: input.integrationAccountId,
      access_token_enc: encryptSecret(input.accessToken),
      refresh_token_enc: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      expires_at: input.expiresAt ?? null,
      scopes: input.scopes ?? [],
    },
    { onConflict: 'integration_account_id' }
  )
  if (res.error) throw res.error
}

export async function getIntegrationTokens(input: { integrationAccountId: string }): Promise<StoredIntegrationTokens | null> {
  const admin = createSupabaseAdminClient()
  const res = await admin
    .from('integration_account_tokens')
    .select('access_token_enc,refresh_token_enc,expires_at,scopes')
    .eq('integration_account_id', input.integrationAccountId)
    .maybeSingle()

  if (res.error) throw res.error
  if (!res.data) return null

  const scopes = Array.isArray(res.data.scopes) ? (res.data.scopes as string[]) : []

  return {
    accessToken: decryptSecret(String(res.data.access_token_enc)),
    refreshToken: res.data.refresh_token_enc ? decryptSecret(String(res.data.refresh_token_enc)) : null,
    expiresAt: res.data.expires_at ? String(res.data.expires_at) : null,
    scopes,
  }
}


