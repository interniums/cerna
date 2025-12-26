-- Cerna: Workflows/Spaces (schema-first).
-- Scopes categories/resources/essentials to an active workflow.

-- Workflows
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  theme text not null default 'work',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists workflows_user_name_unique
  on public.workflows (user_id, lower(name));

alter table public.workflows enable row level security;

create policy "workflows_select_own"
on public.workflows for select
to authenticated
using (user_id = auth.uid());

create policy "workflows_write_with_entitlement"
on public.workflows for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

-- Categories + Resources: add workflow_id
alter table public.categories
  add column if not exists workflow_id uuid;

alter table public.resources
  add column if not exists workflow_id uuid;

-- Backfill: ensure each existing user has a default workflow, then scope existing rows into it.
with users as (
  select distinct user_id from public.categories
  union
  select distinct user_id from public.resources
),
inserted as (
  insert into public.workflows (user_id, name, theme, sort_order)
  select u.user_id, 'Work', 'work', 0
  from users u
  where not exists (select 1 from public.workflows w where w.user_id = u.user_id)
  returning user_id
),
defaults as (
  select
    u.user_id,
    (
      select w.id
      from public.workflows w
      where w.user_id = u.user_id
      order by w.sort_order asc, w.created_at asc, w.id asc
      limit 1
    ) as workflow_id
  from users u
)
update public.categories c
set workflow_id = d.workflow_id
from defaults d
where c.user_id = d.user_id
  and c.workflow_id is null;

with users as (
  select distinct user_id from public.categories
  union
  select distinct user_id from public.resources
),
defaults as (
  select
    u.user_id,
    (
      select w.id
      from public.workflows w
      where w.user_id = u.user_id
      order by w.sort_order asc, w.created_at asc, w.id asc
      limit 1
    ) as workflow_id
  from users u
)
update public.resources r
set workflow_id = d.workflow_id
from defaults d
where r.user_id = d.user_id
  and r.workflow_id is null;

-- Safety backfill: if anything still has NULL workflow_id (edge cases / partial runs),
-- ensure a workflow exists and assign the user's first workflow.
insert into public.workflows (user_id, name, theme, sort_order)
select distinct x.user_id, 'Work', 'work', 0
from (
  select user_id from public.categories where workflow_id is null
  union
  select user_id from public.resources where workflow_id is null
) x
where not exists (select 1 from public.workflows w where w.user_id = x.user_id);

update public.categories c
set workflow_id = (
  select w.id
  from public.workflows w
  where w.user_id = c.user_id
  order by w.sort_order asc, w.created_at asc, w.id asc
  limit 1
)
where c.workflow_id is null;

update public.resources r
set workflow_id = (
  select w.id
  from public.workflows w
  where w.user_id = r.user_id
  order by w.sort_order asc, w.created_at asc, w.id asc
  limit 1
)
where r.workflow_id is null;

-- After backfill, enforce workflow_id presence.
alter table public.categories
  alter column workflow_id set not null;

alter table public.resources
  alter column workflow_id set not null;

-- FK to workflows
alter table public.categories
  add constraint categories_workflow_id_fkey
  foreign key (workflow_id) references public.workflows (id) on delete cascade;

alter table public.resources
  add constraint resources_workflow_id_fkey
  foreign key (workflow_id) references public.workflows (id) on delete cascade;

create index if not exists categories_user_workflow_idx
  on public.categories (user_id, workflow_id, sort_order);

create index if not exists resources_user_workflow_idx
  on public.resources (user_id, workflow_id);

-- Rebuild uniqueness constraints to be workflow-scoped.
drop index if exists public.categories_user_name_unique;
create unique index if not exists categories_user_workflow_name_unique
  on public.categories (user_id, workflow_id, lower(name));

drop index if exists public.resources_user_url_unique_active;
create unique index if not exists resources_user_workflow_url_unique_active
  on public.resources (user_id, workflow_id, url)
  where deleted_at is null;

-- Enforce: resources.category_id must belong to the same workflow.
create unique index if not exists categories_id_workflow_unique
  on public.categories (id, workflow_id);

-- Drop the old single-column FK (name is stable in Postgres defaults).
alter table public.resources
  drop constraint if exists resources_category_id_fkey;

alter table public.resources
  add constraint resources_category_id_workflow_fkey
  foreign key (category_id, workflow_id)
  references public.categories (id, workflow_id);


