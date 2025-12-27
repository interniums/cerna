-- Cerna: Resources manual ordering
--
-- Goal:
-- - Allow manual ordering for non-pinned resources (pinned always stays above non-pinned).
-- - Keep existing pinned ordering via `pinned_at` and essentials ordering via `essential_at`.

alter table public.resources
  add column if not exists sort_order integer;

create index if not exists resources_user_workflow_pinned_sort_idx
  on public.resources (user_id, workflow_id, is_pinned desc, sort_order asc nulls last, pinned_at asc nulls last, created_at desc);


