-- Cerna: Integration logs (debugging)

create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  integration_account_id uuid references public.integration_accounts (id) on delete set null,
  provider text not null,
  stage text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists integration_logs_user_created_idx
  on public.integration_logs (user_id, created_at desc);

create index if not exists integration_logs_user_provider_created_idx
  on public.integration_logs (user_id, provider, created_at desc);

alter table public.integration_logs enable row level security;

create policy "integration_logs_select_own"
on public.integration_logs for select
to authenticated
using (user_id = auth.uid());

-- Writes are typically done server-side via service role.
create policy "integration_logs_insert_own_with_entitlement"
on public.integration_logs for insert
to authenticated
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));


