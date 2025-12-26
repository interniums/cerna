-- Cerna: Command Center v1 (Tasks + Focus sessions)

-- Tasks (per-workflow)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  due_at timestamptz,
  url text,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_workflow_status_idx
  on public.tasks (user_id, workflow_id, status, created_at desc);

create index if not exists tasks_user_workflow_due_idx
  on public.tasks (user_id, workflow_id, due_at asc nulls last);

alter table public.tasks enable row level security;

create policy "tasks_select_own"
on public.tasks for select
to authenticated
using (user_id = auth.uid());

create policy "tasks_write_with_entitlement"
on public.tasks for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

drop trigger if exists set_updated_at_tasks on public.tasks;
create trigger set_updated_at_tasks
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Focus sessions (optional, v0: store start/end + duration + optional task link)
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_s integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists focus_sessions_user_workflow_started_idx
  on public.focus_sessions (user_id, workflow_id, started_at desc);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions_select_own"
on public.focus_sessions for select
to authenticated
using (user_id = auth.uid());

create policy "focus_sessions_write_with_entitlement"
on public.focus_sessions for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

drop trigger if exists set_updated_at_focus_sessions on public.focus_sessions;
create trigger set_updated_at_focus_sessions
  before update on public.focus_sessions
  for each row execute function public.set_updated_at();

-- Instrumentation events (lightweight, append-only)
create table if not exists public.instrumentation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  name text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists instrumentation_events_user_workflow_created_idx
  on public.instrumentation_events (user_id, workflow_id, created_at desc);

alter table public.instrumentation_events enable row level security;

create policy "instrumentation_events_select_own"
on public.instrumentation_events for select
to authenticated
using (user_id = auth.uid());

create policy "instrumentation_events_write_with_entitlement"
on public.instrumentation_events for insert
to authenticated
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));


