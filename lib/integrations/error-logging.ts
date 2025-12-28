import 'server-only'

function normalizeError(err: unknown) {
  if (err instanceof Error) {
    const anyErr = err as Error & { code?: unknown; status?: unknown; cause?: unknown }
    return {
      name: err.name,
      message: err.message || 'Unknown error',
      stack: typeof err.stack === 'string' ? err.stack : undefined,
      code: anyErr.code,
      status: anyErr.status,
      cause: anyErr.cause,
    }
  }
  if (typeof err === 'string') return { name: 'Error', message: err }
  try {
    return { name: 'Error', message: JSON.stringify(err) }
  } catch {
    return { name: 'Error', message: 'Unknown error' }
  }
}

function redactSecrets(value: unknown): unknown {
  // Best-effort: remove obvious secret/token fields and trim huge strings.
  const MAX_STR = 2000

  if (typeof value === 'string') {
    if (value.length > MAX_STR) return value.slice(0, MAX_STR) + '…'
    return value
  }
  if (Array.isArray(value)) return value.map(redactSecrets).slice(0, 200)
  if (!value || typeof value !== 'object') return value

  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase()
    if (key.includes('token') || key.includes('secret') || key.includes('password') || key.includes('authorization')) {
      out[k] = '[redacted]'
      continue
    }
    out[k] = redactSecrets(v)
  }
  return out
}

export async function logIntegrationError(input: {
  userId: string
  provider: string
  stage: string
  error: unknown
  integrationAccountId?: string | null
  details?: Record<string, unknown>
}) {
  const e = normalizeError(input.error)
  const message = `[${input.provider}] ${input.stage}: ${e.message}`

  // Console-only logging: do NOT persist errors to DB.
  console.error(
    message,
    redactSecrets({
      userId: input.userId,
      integrationAccountId: input.integrationAccountId ?? null,
      provider: input.provider,
      stage: input.stage,
      details: input.details ?? {},
      error: e,
    })
  )
}


