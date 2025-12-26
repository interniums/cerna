# Phase 2 Plan — Command Center v1 (Solo)

## Objective

Build the daily “get oriented → act → focus” loop inside a workflow.

## Deliverables

- **Native Tasks v1 (per-workflow)**:
- Create, complete, basic list view
- Optional due date
- Optional URL attachment (resource link)
- Undo for destructive actions where applicable
- Clear states: loading/empty/error/success; prevent double-submit
- **Focus Mode v1**:
- Pomodoro timer
- When active: reduce clutter (mute/hide non-essential UI; keep essentials + current task prominent)
- **Calendar widget shell** (no provider yet):
- States: not connected, connected placeholder, loading, error
- CTA: “Connect Google Calendar” (wired later)
- **Instrumentation**:
- time-to-focus, tasks created/completed, focus sessions started/completed

## Data model (minimal)

- `tasks`:
- `id, user_id, workflow_id, title, status, due_at?, url?, created_at, updated_at, completed_at?`
- Optional `focus_sessions`:
- `id, user_id, workflow_id, task_id?, started_at, ended_at?, duration_s, status`

## UX constraints

- No business logic inside UI handlers; use named functions and server actions.
- Keyboard support + focus states; predictable flows; confirm destructive actions; allow undo when feasible.

## Acceptance criteria