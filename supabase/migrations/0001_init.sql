-- Cerna: initial schema (auth, resources, billing)

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Insert profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Billing: customers, subscriptions, entitlements
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_subscription_id text not null unique,
  status text not null,
  current_period_end timestamptz,
  price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;
alter table public.stripe_subscriptions enable row level security;
alter table public.entitlements enable row level security;

-- Allow users to read their own billing state.
create policy "stripe_customers_select_own"
on public.stripe_customers for select
to authenticated
using (user_id = auth.uid());

create policy "stripe_subscriptions_select_own"
on public.stripe_subscriptions for select
to authenticated
using (user_id = auth.uid());

create policy "entitlements_select_own"
on public.entitlements for select
to authenticated
using (user_id = auth.uid());

-- Allow users to create their own stripe customer mapping (needed before subscription exists).
create policy "stripe_customers_insert_own"
on public.stripe_customers for insert
to authenticated
with check (user_id = auth.uid());

-- Internal helper: returns true only for the current user when they have an active entitlement.
create or replace function public.has_active_entitlement(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when target_user <> auth.uid() then false
      else coalesce((select is_active from public.entitlements where user_id = target_user), false)
    end
$$;

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_user_name_unique
  on public.categories (user_id, lower(name));

alter table public.categories enable row level security;

create policy "categories_select_own"
on public.categories for select
to authenticated
using (user_id = auth.uid());

create policy "categories_write_with_entitlement"
on public.categories for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

-- Resources
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  url text not null,
  title text,
  description text,
  favicon_url text,
  image_url text,
  notes text,
  status text not null default 'unread' check (status in ('unread', 'archived')),
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  visit_count integer not null default 0,
  last_visited_at timestamptz,
  deleted_at timestamptz,
  tsv tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, '')
    )
  ) stored,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_user_id_idx on public.resources (user_id);
create index if not exists resources_category_id_idx on public.resources (category_id);
create index if not exists resources_tsv_gin_idx on public.resources using gin (tsv);

-- Unique per user/url for non-deleted rows
create unique index if not exists resources_user_url_unique_active
  on public.resources (user_id, url)
  where deleted_at is null;

-- Vector index (cosine). Requires ANALYZE + enough rows to be effective.
create index if not exists resources_embedding_ivfflat_idx
  on public.resources using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.resources enable row level security;

create policy "resources_select_own"
on public.resources for select
to authenticated
using (user_id = auth.uid());

create policy "resources_write_with_entitlement"
on public.resources for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists tags_user_name_unique
  on public.tags (user_id, lower(name));

alter table public.tags enable row level security;

create policy "tags_select_own"
on public.tags for select
to authenticated
using (user_id = auth.uid());

create policy "tags_write_with_entitlement"
on public.tags for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

-- Resource tags
create table if not exists public.resource_tags (
  resource_id uuid not null references public.resources (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, tag_id)
);

create index if not exists resource_tags_user_id_idx on public.resource_tags (user_id);

alter table public.resource_tags enable row level security;

create policy "resource_tags_select_own"
on public.resource_tags for select
to authenticated
using (user_id = auth.uid());

create policy "resource_tags_write_with_entitlement"
on public.resource_tags for all
to authenticated
using (user_id = auth.uid() and public.has_active_entitlement(user_id))
with check (user_id = auth.uid() and public.has_active_entitlement(user_id));

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_resources on public.resources;
create trigger set_updated_at_resources
  before update on public.resources
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_stripe_subscriptions on public.stripe_subscriptions;
create trigger set_updated_at_stripe_subscriptions
  before update on public.stripe_subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_entitlements on public.entitlements;
create trigger set_updated_at_entitlements
  before update on public.entitlements
  for each row execute function public.set_updated_at();


