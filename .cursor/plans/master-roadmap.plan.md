# Master Roadmap (All Phases)

## Product thesis

- **Problem**: context switching fatigue.
- **Core loop**: open → pick **Workflow** → see **Now** (tasks + next meeting + essentials) → start **Focus** → finish → repeat.

## Principles

- **Workflow-first**: everything (library, tasks, focus, widgets) is scoped to a workflow.
- **Widgets > clients**: show what matters; click-through to source tools.
- **Read-only first** for integrations; expand only when reliability + demand is proven.
- **Privacy-first**: least-privilege scopes, explicit connect/disconnect, clear data boundaries.

## Metrics (solo)

- **Primary**: D7/D30 retention; weekly returning users.
- **Behavioral**:
- Time-to-focus (open → start focus)
- Tasks completed/day
- Calendar joins from widget (once shipped)
- Essentials usage (opens/day)
- **Quality**: integration error rate, reconnect success rate.

## Phase sequence (decisions baked in)

1. **Phase 1**: Workflows + workflow-scoped Library/Essentials + theme cues (schema-first).
2. **Phase 2**: Command Center v1 (Native Tasks + Focus Mode + Calendar widget shell).
3. **Phase 3**: Google Calendar v1 (read-only, multi-account) + per-workflow visibility.
4. **Phase 4**: Microsoft Calendar later (Outlook.com + M365) reusing the same provider interface.
5. **Phase 5**: Morning Briefing (non-AI first; AI optional later).
6. **Phase 6 (last)**: Browser extension (quick capture + opt-in new-tab).

## Architecture boundaries (to avoid refactors)

- **Routing**: workflow in URL (`/app/w/[workflowId]/...`) to keep SSR deterministic and caching safe.
- **Integration interfaces**: