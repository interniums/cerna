-- Cerna: semantic search RPC

create or replace function public.match_resources(
  query_user_id uuid,
  query_embedding vector(1536),
  match_count int default 20
)
returns table (
  id uuid,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    r.id,
    1 - (r.embedding <=> query_embedding) as similarity
  from public.resources r
  where r.user_id = query_user_id
    and r.deleted_at is null
    and r.embedding is not null
  order by r.embedding <=> query_embedding
  limit match_count;
$$;


