-- Cerna: Tasks v2 (priority, description, primary app, ordering)

alter table public.tasks
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high'));

alter table public.tasks
  add column if not exists description text;

-- Primary app: either a saved Resource or a free-form URL (or both).
alter table public.tasks
  add column if not exists primary_resource_id uuid references public.resources (id) on delete set null;

alter table public.tasks
  add column if not exists primary_url text;

-- Manual ordering for tasks within a workflow/status (and optionally within tab buckets).
alter table public.tasks
  add column if not exists sort_order integer;

create index if not exists tasks_user_workflow_status_sort_idx
  on public.tasks (user_id, workflow_id, status, sort_order asc nulls last, created_at desc);


