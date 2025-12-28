-- Cerna: Integrations v1 (generic accounts + external items, link-only)

-- Integration accounts (public metadata; user owns the row)
create table if not exists public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  external_account_id text not null,
  display_name text,
  meta jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integration_accounts_user_provider_external_unique
  on public.integration_accounts (user_id, provider, external_account_id);

create index if not exists integration_accounts_user_provider_idx
  on public.integration_accounts (user_id, provider);

alter table public.integration_accounts enable row level security;

create policy "integration_accounts_select_own"
on public.integration_accounts for select
to authenticated
using (user_id = auth.uid());

create policy "integration_accounts_write_with_entitlement"
on public.integration_accounts for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

drop trigger if exists set_updated_at_integration_accounts on public.integration_accounts;
create trigger set_updated_at_integration_accounts
  before update on public.integration_accounts
  for each row execute function public.set_updated_at();

-- Tokens are stored encrypted (app-level), and should never be selectable by client.
-- We intentionally do NOT add a select policy here; server uses service role to read/write.
create table if not exists public.integration_account_tokens (
  integration_account_id uuid primary key references public.integration_accounts (id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  scopes text[] not null default '{}'::text[]
);

alter table public.integration_account_tokens enable row level security;

-- External items (link-only): normalized references to provider objects (messages, tasks, notes, files)
create table if not exists public.external_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  integration_account_id uuid references public.integration_accounts (id) on delete set null,
  provider text not null,
  type text not null,
  external_id text not null,
  external_url text not null,
  title text,
  summary text,
  status text,
  due_at timestamptz,
  author text,
  channel text,
  occurred_at timestamptz,
  raw jsonb,
  synced_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists external_items_user_provider_type_external_unique
  on public.external_items (user_id, provider, type, external_id);

create index if not exists external_items_user_provider_type_occurred_idx
  on public.external_items (user_id, provider, type, occurred_at desc nulls last);

create index if not exists external_items_user_created_idx
  on public.external_items (user_id, created_at desc);

alter table public.external_items enable row level security;

create policy "external_items_select_own"
on public.external_items for select
to authenticated
using (user_id = auth.uid());

create policy "external_items_write_with_entitlement"
on public.external_items for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

drop trigger if exists set_updated_at_external_items on public.external_items;
create trigger set_updated_at_external_items
  before update on public.external_items
  for each row execute function public.set_updated_at();

-- Links between Cerna-native entities and external items
create table if not exists public.external_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_kind text not null check (source_kind in ('task', 'resource', 'note')),
  source_id uuid not null,
  external_item_id uuid not null references public.external_items (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists external_links_user_source_external_unique
  on public.external_links (user_id, source_kind, source_id, external_item_id);

create index if not exists external_links_user_source_idx
  on public.external_links (user_id, source_kind, source_id);

alter table public.external_links enable row level security;

create policy "external_links_select_own"
on public.external_links for select
to authenticated
using (user_id = auth.uid());

create policy "external_links_write_with_entitlement"
on public.external_links for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

-- Per-account incremental sync state
create table if not exists public.sync_cursors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  integration_account_id uuid not null references public.integration_accounts (id) on delete cascade,
  scope text not null,
  cursor text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists sync_cursors_user_account_scope_unique
  on public.sync_cursors (user_id, integration_account_id, scope);

alter table public.sync_cursors enable row level security;

create policy "sync_cursors_select_own"
on public.sync_cursors for select
to authenticated
using (user_id = auth.uid());

create policy "sync_cursors_write_with_entitlement"
on public.sync_cursors for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

drop trigger if exists set_updated_at_sync_cursors on public.sync_cursors;
create trigger set_updated_at_sync_cursors
  before update on public.sync_cursors
  for each row execute function public.set_updated_at();


