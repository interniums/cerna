import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/ai/embeddings'

function buildEmbeddingText(input: {
  url: string
  title: string | null
  description: string | null
  notes: string | null
}) {
  return [
    input.title ? `Title: ${input.title}` : null,
    input.description ? `Description: ${input.description}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
    `URL: ${input.url}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function indexResourceEmbedding(input: { userId: string; resourceId: string }) {
  const supabase = await createSupabaseServerClient()

  const resource = await supabase
    .from('resources')
    .select('id,url,title,description,notes')
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)
    .single()

  if (resource.error) throw resource.error

  const text = buildEmbeddingText(resource.data)
  const embedding = await embedText({ text })

  const update = await supabase
    .from('resources')
    .update({ embedding })
    .eq('id', input.resourceId)
    .eq('user_id', input.userId)

  if (update.error) throw update.error
}
