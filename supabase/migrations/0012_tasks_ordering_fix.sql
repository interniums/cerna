-- Cerna: Tasks ordering hotfix
--
-- Why this exists:
-- We previously introduced task ordering in `0011_tasks_priority_description_order.sql`,
-- but the repo also contains `0011_microsoft_calendar.sql`. Some migration runners treat
-- the numeric prefix as the version, so a duplicate prefix can cause one migration to be skipped.
--
-- This migration is safe to run multiple times (uses IF NOT EXISTS) and ensures the tasks
-- ordering column exists.

-- Priority + description (kept in sync with the original tasks v2 migration)
alter table public.tasks
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high'));

alter table public.tasks
  add column if not exists description text;

-- Primary app: either a saved Resource or a free-form URL (or both).
alter table public.tasks
  add column if not exists primary_resource_id uuid references public.resources (id) on delete set null;

alter table public.tasks
  add column if not exists primary_url text;

-- Manual ordering for tasks within a workflow/status.
alter table public.tasks
  add column if not exists sort_order integer;

create index if not exists tasks_user_workflow_status_sort_idx
  on public.tasks (user_id, workflow_id, status, sort_order asc nulls last, created_at desc);


