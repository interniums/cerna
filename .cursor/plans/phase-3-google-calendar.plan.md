# Phase 3 Plan — Google Calendar v1 (Read-only, Multi-account)

## Objective
Reduce calendar tab switching: show “next meetings” + “join” in the active workflow.

## Deliverables
- Connect **multiple Google accounts**.
- “Next 3 meetings” widget:
  - event title/time
  - join link button when available
  - open calendar link
  - source labeling (which account)
  - clear loading/empty/error states; reconnect CTA for revoked/expired auth
- Per-workflow visibility settings:
  - choose which connected accounts are shown in each workflow (default: all on)

## Architecture
- Introduce a provider interface (example shape):
  - `CalendarProvider.listUpcomingEvents({ userId, accountId, limit, timeWindow })`
- Implement **GoogleCalendarProvider** behind that interface.
- Token handling:
  - least-privilege scopes
  - refresh token storage (encrypted / server-side only)
  - explicit connect/disconnect

## Data model (typical)
- `calendar_accounts`: `id,user_id,provider('google'),email,display_name,created_at,last_error?`
- `calendar_account_tokens`: `calendar_account_id,access_token,refresh_token,expires_at` (encrypted)
- `workflow_calendar_visibility`: `workflow_id,calendar_account_id,enabled`

## Acceptance criteria
- Multi-account works; failure modes are explicit with a clear reconnect path.
- No surprise storage; user understands what’s connected and where events come from.


