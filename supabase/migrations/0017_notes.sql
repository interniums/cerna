-- Cerna: Notes v1 (Cerna-native, per workflow)

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  title text not null,
  body text,
  deleted_at timestamptz,
  tsv tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_workflow_created_idx
  on public.notes (user_id, workflow_id, created_at desc);

create index if not exists notes_user_workflow_updated_idx
  on public.notes (user_id, workflow_id, updated_at desc);

create index if not exists notes_tsv_gin_idx
  on public.notes using gin (tsv);

create index if not exists notes_embedding_ivfflat_idx
  on public.notes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.notes enable row level security;

create policy "notes_select_own"
on public.notes for select
to authenticated
using (user_id = auth.uid());

create policy "notes_write_with_entitlement"
on public.notes for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

drop trigger if exists set_updated_at_notes on public.notes;
create trigger set_updated_at_notes
  before update on public.notes
  for each row execute function public.set_updated_at();


