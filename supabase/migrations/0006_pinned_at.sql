-- Cerna: add pinned_at to resources to keep "Essentials" order chronological by pin time.

alter table public.resources
add column if not exists pinned_at timestamptz;

-- Backfill: for already-pinned resources, use created_at as best available proxy.
update public.resources
set pinned_at = created_at
where is_pinned = true
  and pinned_at is null;

create index if not exists resources_user_pinned_at_idx
  on public.resources (user_id, pinned_at);


