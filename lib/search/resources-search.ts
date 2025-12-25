import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Resource } from '@/lib/db/resources'
import { embedText } from '@/lib/ai/embeddings'

type VectorMatchRow = {
  id: string
  similarity: number
}

type TrgmMatchRow = {
  id: string
  score: number
}

function looksSemantic(query: string) {
  const q = query.trim()
  return q.includes(' ') && q.length >= 12
}

function looksFuzzy(query: string) {
  const q = query.trim()
  // Good for typos/short queries where websearch ranking can miss.
  return q.length >= 3 && q.length <= 32
}

export async function searchResources(input: { userId: string; query: string; limit?: number }) {
  const supabase = await createSupabaseServerClient()
  const q = input.query.trim()
  const limit = input.limit ?? 30

  if (!q) return [] as Resource[]

  const keywordPromise = supabase
    .from('resources')
    .select('*')
    .eq('user_id', input.userId)
    .is('deleted_at', null)
    .textSearch('tsv', q, { type: 'websearch' })
    .limit(limit)

  const shouldTryTrgm = looksFuzzy(q)
  const trgmPromise = shouldTryTrgm
    ? (async () => {
        const match = await supabase.rpc('match_resources_trgm', {
          query_user_id: input.userId,
          query_text: q,
          match_count: limit,
        })
        if (match.error) throw match.error
        return (match.data ?? []) as TrgmMatchRow[]
      })()
    : Promise.resolve([] as TrgmMatchRow[])

  const shouldTryVector = looksSemantic(q) && Boolean(process.env.OPENAI_API_KEY)

  const vectorPromise = shouldTryVector
    ? (async () => {
        const embedding = await embedText({ text: q })
        const match = await supabase.rpc('match_resources', {
          query_user_id: input.userId,
          query_embedding: embedding,
          match_count: limit,
        })
        if (match.error) throw match.error
        return (match.data ?? []) as VectorMatchRow[]
      })()
    : Promise.resolve([] as VectorMatchRow[])

  const [keyword, trgm, vector] = await Promise.all([keywordPromise, trgmPromise, vectorPromise])
  if (keyword.error) throw keyword.error

  const keywordRows = (keyword.data ?? []) as Resource[]

  // If we have any auxiliary matches, fetch those resources and merge with keyword results.
  const vectorIds = vector.map((v) => v.id)
  const trgmIds = trgm.map((t) => t.id)
  const auxIds = Array.from(new Set([...vectorIds, ...trgmIds]))

  const byId = new Map<string, Resource>()
  const vectorSimById = new Map<string, number>()
  const trgmScoreById = new Map<string, number>()
  for (const v of vector) vectorSimById.set(v.id, v.similarity)
  for (const t of trgm) trgmScoreById.set(t.id, t.score)

  if (auxIds.length > 0) {
    const auxResources = await supabase
      .from('resources')
      .select('*')
      .in('id', auxIds)
      .eq('user_id', input.userId)
      .is('deleted_at', null)
    if (auxResources.error) throw auxResources.error
    ;(auxResources.data ?? []).forEach((r) => byId.set(r.id, r as Resource))
  }

  ;(keywordRows ?? []).forEach((r) => byId.set(r.id, r as Resource))

  // Merge order: vector first (best semantic), then trigram (typos), then keyword.
  const merged: Resource[] = []
  const seen = new Set<string>()
  for (const v of vector) {
    const r = byId.get(v.id)
    if (r && !seen.has(r.id)) {
      merged.push(r)
      seen.add(r.id)
    }
  }
  for (const t of trgm) {
    const r = byId.get(t.id)
    if (r && !seen.has(r.id)) {
      merged.push(r)
      seen.add(r.id)
    }
  }
  for (const r of keywordRows) {
    if (!seen.has(r.id)) {
      merged.push(r)
      seen.add(r.id)
    }
  }

  return merged
    .slice()
    .sort((a, b) => {
      // Always prioritize user intent: pinned first.
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

      const aVec = vectorSimById.get(a.id) ?? 0
      const bVec = vectorSimById.get(b.id) ?? 0
      if (aVec !== bVec) return bVec - aVec

      const aTrg = trgmScoreById.get(a.id) ?? 0
      const bTrg = trgmScoreById.get(b.id) ?? 0
      if (aTrg !== bTrg) return bTrg - aTrg

      const aLast = a.last_visited_at ? Date.parse(a.last_visited_at) : 0
      const bLast = b.last_visited_at ? Date.parse(b.last_visited_at) : 0
      if (aLast !== bLast) return bLast - aLast

      if (a.visit_count !== b.visit_count) return b.visit_count - a.visit_count

      const aUpdated = Date.parse(a.updated_at)
      const bUpdated = Date.parse(b.updated_at)
      return bUpdated - aUpdated
    })
    .slice(0, limit)
}
