import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Resource } from '@/lib/db/resources'
import { embedText } from '@/lib/ai/embeddings'

type VectorMatchRow = {
  id: string
  similarity: number
}

function looksSemantic(query: string) {
  const q = query.trim()
  return q.includes(' ') && q.length >= 12
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

  const [keyword, vector] = await Promise.all([keywordPromise, vectorPromise])
  if (keyword.error) throw keyword.error

  // If we have vector matches, fetch those resources and merge with keyword results.
  if (vector.length > 0) {
    const ids = vector.map((v) => v.id)
    const byId = new Map<string, Resource>()
    const similarityById = new Map<string, number>()
    for (const v of vector) similarityById.set(v.id, v.similarity)

    const vectorResources = await supabase
      .from('resources')
      .select('*')
      .in('id', ids)
      .eq('user_id', input.userId)
      .is('deleted_at', null)
    if (vectorResources.error) throw vectorResources.error

    ;(vectorResources.data ?? []).forEach((r) => byId.set(r.id, r as Resource))
    ;(keyword.data ?? []).forEach((r) => byId.set(r.id, r as Resource))

    const merged: Resource[] = []
    const seen = new Set<string>()
    for (const v of vector) {
      const r = byId.get(v.id)
      if (r && !seen.has(r.id)) {
        merged.push(r)
        seen.add(r.id)
      }
    }
    for (const r of keyword.data ?? []) {
      const rr = r as Resource
      if (!seen.has(rr.id)) {
        merged.push(rr)
        seen.add(rr.id)
      }
    }

    const ranked = merged
      .slice()
      .sort((a, b) => {
        // Always prioritize user intent: pinned/favorite first.
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1

        const aSim = similarityById.get(a.id) ?? 0
        const bSim = similarityById.get(b.id) ?? 0
        if (aSim !== bSim) return bSim - aSim

        const aLast = a.last_visited_at ? Date.parse(a.last_visited_at) : 0
        const bLast = b.last_visited_at ? Date.parse(b.last_visited_at) : 0
        if (aLast !== bLast) return bLast - aLast

        if (a.visit_count !== b.visit_count) return b.visit_count - a.visit_count

        const aUpdated = Date.parse(a.updated_at)
        const bUpdated = Date.parse(b.updated_at)
        return bUpdated - aUpdated
      })

    return ranked.slice(0, limit)
  }

  const keywordRows = (keyword.data ?? []) as Resource[]
  return keywordRows
    .slice()
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1
      const aLast = a.last_visited_at ? Date.parse(a.last_visited_at) : 0
      const bLast = b.last_visited_at ? Date.parse(b.last_visited_at) : 0
      if (aLast !== bLast) return bLast - aLast
      if (a.visit_count !== b.visit_count) return b.visit_count - a.visit_count
      const aUpdated = Date.parse(a.updated_at)
      const bUpdated = Date.parse(b.updated_at)
      return bUpdated - aUpdated
    })
}
