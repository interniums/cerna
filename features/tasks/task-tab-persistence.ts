export const TASK_TAB_VALUES = ['today', 'other', 'done'] as const

export type TaskTab = (typeof TASK_TAB_VALUES)[number]

export function isTaskTab(v: unknown): v is TaskTab {
  return v === 'today' || v === 'other' || v === 'done'
}

export function getTasksActiveTabKey(workflowId: string) {
  return `cerna.tasks.activeTab.${workflowId}`
}

export const TASKS_ACTIVE_TAB_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365


