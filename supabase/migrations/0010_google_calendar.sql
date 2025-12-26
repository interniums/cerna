-- Cerna: Google Calendar v1 (read-only, multi-account)

-- Connected calendar accounts (public metadata)
create table if not exists public.calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google')),
  email text not null,
  display_name text,
  last_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists calendar_accounts_user_provider_email_unique
  on public.calendar_accounts (user_id, provider, lower(email));

alter table public.calendar_accounts enable row level security;

create policy "calendar_accounts_select_own"
on public.calendar_accounts for select
to authenticated
using (user_id = auth.uid());

create policy "calendar_accounts_write_with_entitlement"
on public.calendar_accounts for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

-- Tokens are stored encrypted (app-level), and should never be selectable by client.
-- We intentionally do NOT add a select policy here; server uses service role to read.
create table if not exists public.calendar_account_tokens (
  calendar_account_id uuid primary key references public.calendar_accounts (id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text not null,
  expires_at timestamptz not null
);

alter table public.calendar_account_tokens enable row level security;

-- Per-workflow visibility (default: enabled)
create table if not exists public.workflow_calendar_visibility (
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  calendar_account_id uuid not null references public.calendar_accounts (id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (workflow_id, calendar_account_id)
);

alter table public.workflow_calendar_visibility enable row level security;

create policy "workflow_calendar_visibility_select_own"
on public.workflow_calendar_visibility for select
to authenticated
using (
  exists (
    select 1
    from public.calendar_accounts a
    where a.id = workflow_calendar_visibility.calendar_account_id
      and a.user_id = auth.uid()
  )
);

create policy "workflow_calendar_visibility_write_with_entitlement"
on public.workflow_calendar_visibility for all
to authenticated
using (
  public.has_active_entitlement(auth.uid())
  and exists (
    select 1
    from public.calendar_accounts a
    where a.id = workflow_calendar_visibility.calendar_account_id
      and a.user_id = auth.uid()
  )
)
with check (
  public.has_active_entitlement(auth.uid())
  and exists (
    select 1
    from public.calendar_accounts a
    where a.id = workflow_calendar_visibility.calendar_account_id
      and a.user_id = auth.uid()
  )
);


