-- Cerna: visit tracking (atomic increment)

create or replace function public.record_resource_visit(query_resource_id uuid)
returns void
language sql
volatile
set search_path = public
as $$
  update public.resources
  set
    visit_count = coalesce(visit_count, 0) + 1,
    last_visited_at = now()
  where id = query_resource_id
    and user_id = auth.uid();
$$;


