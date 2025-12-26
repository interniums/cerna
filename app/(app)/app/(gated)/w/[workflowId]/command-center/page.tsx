import { redirect } from 'next/navigation'

type CommandCenterPageProps = {
  params: Promise<{ workflowId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CommandCenterPage({ params, searchParams }: CommandCenterPageProps) {
  const { workflowId } = await params
  const sp = (await searchParams) ?? {}
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((vv) => (vv != null ? usp.append(k, String(vv)) : null))
    else if (v != null) usp.set(k, String(v))
  }
  const suffix = usp.size > 0 ? `?${usp.toString()}` : ''
  redirect(`/app/w/${workflowId}${suffix}`)
}


