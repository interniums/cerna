import 'server-only'

import { z } from 'zod'

const OpenAIEmbeddingResponseSchema = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
    })
  ),
})

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Missing OPENAI_API_KEY.')
  return key
}

export async function embedText(input: { text: string }) {
  const key = getOpenAIKey()

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: input.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Embedding request failed (${res.status}). ${body}`)
  }

  const json = OpenAIEmbeddingResponseSchema.parse(await res.json())
  const embedding = json.data[0]?.embedding
  if (!embedding) throw new Error('Embedding response missing data.')

  return embedding
}
