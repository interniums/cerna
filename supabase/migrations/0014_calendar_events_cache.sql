-- Cerna: Calendar events cache (Phase 1)
--
-- Goal:
-- - Reduce upstream provider calls (Google / Microsoft Graph) from frequent widget refreshes.
-- - Cache the normalized events payload per (user_id, workflow_id) with an update timestamp.
-- - Keep access scoped to the owning user; writes require active entitlement (matches calendar tables).

create table if not exists public.workflow_calendar_events_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  enabled_account_ids uuid[] not null default '{}'::uuid[],
  events jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, workflow_id)
);

create index if not exists workflow_calendar_events_cache_user_updated_idx
  on public.workflow_calendar_events_cache (user_id, updated_at desc);

alter table public.workflow_calendar_events_cache enable row level security;

create policy "workflow_calendar_events_cache_select_own"
on public.workflow_calendar_events_cache for select
to authenticated
using (user_id = auth.uid());

create policy "workflow_calendar_events_cache_write_with_entitlement"
on public.workflow_calendar_events_cache for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(auth.uid()))
with check (user_id = auth.uid() and public.has_active_entitlement(auth.uid()));


