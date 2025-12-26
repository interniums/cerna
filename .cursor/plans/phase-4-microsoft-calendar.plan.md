# Phase 4 Plan — Microsoft Calendar (Outlook.com + M365, Later)

## Objective
Support Microsoft calendars after Google is stable, without changing the widget UX.

## Deliverables
- Implement **MicrosoftCalendarProvider** (Microsoft Graph).
- Support:
  - Outlook.com accounts
  - Microsoft 365 work/school tenants (Entra/Azure AD)
  - multi-account connections
- Reuse:
  - same widget UI from Phase 3
  - same workflow visibility settings model

## Risks / edge cases
- Tenant admin consent / blocked scopes → must show clear “blocked by org” error state.
- Token refresh + session expiry reliability.

## Acceptance criteria
- A user can connect one personal and one work Microsoft account and see combined upcoming meetings.
- Errors are explicit and recoverable (reconnect/disconnect).


