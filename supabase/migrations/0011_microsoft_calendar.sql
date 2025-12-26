-- Cerna: Microsoft Calendar (Phase 4) - enable provider='microsoft'

do $$
begin
  if to_regclass('public.calendar_accounts') is null then
    raise exception 'calendar_accounts does not exist. Run migration 0010_google_calendar.sql first.';
  end if;

  -- Expand provider check constraint from ('google') to ('google','microsoft')
  alter table public.calendar_accounts
    drop constraint if exists calendar_accounts_provider_check;

  alter table public.calendar_accounts
    add constraint calendar_accounts_provider_check
    check (provider in ('google', 'microsoft'));
end $$;
