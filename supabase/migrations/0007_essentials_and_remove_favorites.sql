-- Essentials are separate from pinned resources.
-- Pinned stays as a resource-level flag for pinned lists.
-- Essentials controls the top dock bar.

alter table public.resources
  add column if not exists is_essential boolean not null default false;

alter table public.resources
  add column if not exists essential_at timestamptz;

create index if not exists resources_user_essentials_idx
  on public.resources (user_id, is_essential, essential_at desc);

-- Favorites are removed.
alter table public.resources
  drop column if exists is_favorite;


