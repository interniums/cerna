-- Cerna: fuzzy keyword search via pg_trgm (typo tolerance)

-- Ensure pg_trgm exists (already created in 0001_init.sql, but keep safe).
create extension if not exists pg_trgm;

-- Trigram indexes for common searchable fields.
-- Partial index avoids deleted rows.
create index if not exists resources_title_trgm_idx
  on public.resources using gin (lower(coalesce(title, '')) gin_trgm_ops)
  where deleted_at is null;

create index if not exists resources_url_trgm_idx
  on public.resources using gin (lower(url) gin_trgm_ops)
  where deleted_at is null;

create index if not exists resources_notes_trgm_idx
  on public.resources using gin (lower(coalesce(notes, '')) gin_trgm_ops)
  where deleted_at is null;

create index if not exists resources_description_trgm_idx
  on public.resources using gin (lower(coalesce(description, '')) gin_trgm_ops)
  where deleted_at is null;

-- Fuzzy match RPC.
-- Returns ids ordered by trigram similarity (best-effort typo tolerance).
create or replace function public.match_resources_trgm(
  query_user_id uuid,
  query_text text,
  match_count int default 20
)
returns table (
  id uuid,
  score float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    greatest(
      similarity(lower(coalesce(r.title, '')), lower(query_text)),
      similarity(lower(r.url), lower(query_text)),
      similarity(lower(coalesce(r.notes, '')), lower(query_text)),
      similarity(lower(coalesce(r.description, '')), lower(query_text))
    ) as score
  from public.resources r
  where r.user_id = query_user_id
    and r.deleted_at is null
    and query_user_id = auth.uid()
    and length(coalesce(query_text, '')) > 0
  order by score desc, r.updated_at desc
  limit match_count;
$$;


