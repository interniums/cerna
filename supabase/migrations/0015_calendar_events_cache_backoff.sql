-- Cerna: Calendar events cache - provider backoff/cooldown (Phase 1.1)
--
-- Goal:
-- - Persist short cooldown windows when providers throttle (429 / usage limits)
-- - Avoid repeated upstream calls during throttling; serve cached events instead.

alter table public.workflow_calendar_events_cache
  add column if not exists provider_cooldowns jsonb not null default '{}'::jsonb;

alter table public.workflow_calendar_events_cache
  add column if not exists provider_backoff jsonb not null default '{}'::jsonb;


