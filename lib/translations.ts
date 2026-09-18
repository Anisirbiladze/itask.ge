export interface TranslationEntry {
  page: string
  default: string
}

export const DEFAULT_TRANSLATIONS: Record<string, TranslationEntry> = {
  /* ── Global / Navigation ─────────────────────────────────────── */
  'nav.board':           { page: 'global', default: 'Board' },
  'nav.team':            { page: 'global', default: 'Team' },
  'nav.reports':         { page: 'global', default: 'Reports' },
  'nav.people':          { page: 'global', default: 'People' },
  'nav.settings':        { page: 'global', default: 'Settings' },
  'nav.translations':    { page: 'global', default: 'Translations' },
  'nav.companies':       { page: 'global', default: 'Companies' },
  'nav.all':             { page: 'global', default: 'All' },
  'nav.signout':         { page: 'global', default: 'Sign out' },
  'btn.new_task':        { page: 'global', default: 'New task' },
  'global.open':         { page: 'global', default: 'open' },
  'global.stuck':        { page: 'global', default: 'stuck' },
  'global.no_tasks':     { page: 'global', default: 'No tasks yet.' },
  'global.add_one':      { page: 'global', default: '+ Add one' },

  /* ── Status labels (used on Board + Team) ─────────────────────── */
  'status.not_started':  { page: 'global', default: 'Not started' },
  'status.working':      { page: 'global', default: 'Working on it' },
  'status.done':         { page: 'global', default: 'Done' },
  'status.waiting':      { page: 'global', default: 'Waiting' },

  /* ── Board page ───────────────────────────────────────────────── */
  'board.group_company': { page: 'board', default: 'Group by company' },
  'board.group_person':  { page: 'board', default: 'Group by person' },
  'board.filter_all':    { page: 'board', default: 'All tasks' },
  'board.filter_stuck':  { page: 'board', default: 'Stuck only' },
  'board.filter_week':   { page: 'board', default: 'Due this week' },
  'board.filter_unassigned': { page: 'board', default: 'Unassigned' },
  'board.col_task':      { page: 'board', default: 'Task' },
  'board.col_owner':     { page: 'board', default: 'Owner' },
  'board.col_company':   { page: 'board', default: 'Company' },
  'board.col_status':    { page: 'board', default: 'Status' },
  'board.col_timeline':  { page: 'board', default: 'Timeline' },
  'board.col_due':       { page: 'board', default: 'Due' },
  'board.col_priority':  { page: 'board', default: 'Priority' },
  'board.add_task':      { page: 'board', default: '+ Add task' },
  'board.add_task_to':   { page: 'board', default: '+ Add task to' },

  /* ── Team page ────────────────────────────────────────────────── */
  'team.expand_all':     { page: 'team', default: 'Expand all' },
  'team.collapse_all':   { page: 'team', default: 'Collapse all' },
  'team.no_tasks':       { page: 'team', default: 'No tasks' },
  'team.tasks':          { page: 'team', default: 'tasks' },
  'team.overdue':        { page: 'team', default: 'overdue' },

  /* ── People page ──────────────────────────────────────────────── */
  'people.add_person':   { page: 'people', default: 'Add person' },
  'people.search':       { page: 'people', default: 'Search people…' },
  'people.reset_pw':     { page: 'people', default: 'Reset password' },
  'people.no_results':   { page: 'people', default: 'No people found.' },
  'people.all_companies':{ page: 'people', default: 'All companies' },
  'people.role_ceo':     { page: 'people', default: 'CEO' },
  'people.role_member':  { page: 'people', default: 'Member' },

  /* ── Reports page ─────────────────────────────────────────────── */
  'reports.export_csv':  { page: 'reports', default: 'Export CSV' },
  'reports.period':      { page: 'reports', default: 'Period' },
  'reports.company':     { page: 'reports', default: 'Company' },
  'reports.week':        { page: 'reports', default: 'This week' },
  'reports.month':       { page: 'reports', default: 'This month' },
  'reports.last7':       { page: 'reports', default: 'Last 7 days' },
  'reports.last30':      { page: 'reports', default: 'Last 30 days' },
  'reports.by_person':   { page: 'reports', default: 'By person' },
  'reports.by_company':  { page: 'reports', default: 'By company' },
  'reports.completed':   { page: 'reports', default: 'Completed' },
  'reports.on_time':     { page: 'reports', default: 'On time' },
  'reports.overdue':     { page: 'reports', default: 'Overdue' },
  'reports.pushed':      { page: 'reports', default: 'Due pushed' },
  'reports.open':        { page: 'reports', default: 'Open' },
  'reports.person':      { page: 'reports', default: 'Person' },
  'reports.all':         { page: 'reports', default: 'All' },

  /* ── Settings page ────────────────────────────────────────────── */
  'settings.general':         { page: 'settings', default: 'General' },
  'settings.recurring':       { page: 'settings', default: 'Recurring tasks' },
  'settings.handoffs':        { page: 'settings', default: 'Handoff rules' },
  'settings.checklists':      { page: 'settings', default: 'Checklist templates' },
  'settings.save':            { page: 'settings', default: 'Save' },
  'settings.cancel':          { page: 'settings', default: 'Cancel' },
  'settings.add':             { page: 'settings', default: '+ Add' },
  'settings.delete':          { page: 'settings', default: 'Delete' },
  'settings.edit':            { page: 'settings', default: 'Edit' },
  'settings.handoff_hours':   { page: 'settings', default: 'Flag tasks as stuck after' },
  'settings.hours':           { page: 'settings', default: 'hours' },
  'settings.require_reason':  { page: 'settings', default: 'Require reason when changing due date' },
  'settings.members_change_due': { page: 'settings', default: 'Members can change due date' },
  'settings.checklist_progress': { page: 'settings', default: 'Checklist drives progress' },
  'settings.members_see_peers':  { page: 'settings', default: 'Members see function peers' },

  /* ── Task detail modal ─────────────────────────────────────────── */
  'task.created_by':     { page: 'task', default: 'Created' },
  'task.originally_due': { page: 'task', default: 'Originally due' },
  'task.due_now':        { page: 'task', default: 'Due now' },
  'task.checklist':      { page: 'task', default: 'Checklist' },
  'task.add_image':      { page: 'task', default: 'Add image' },
  'task.add_link':       { page: 'task', default: 'Add link' },
  'task.history':        { page: 'task', default: 'History' },
  'task.btn_edit':       { page: 'task', default: 'Edit task' },
  'task.btn_change_due': { page: 'task', default: 'Change due' },
  'task.btn_mark_done':  { page: 'task', default: 'Mark done' },
  'task.btn_reopen':     { page: 'task', default: 'Reopen' },
  'task.btn_delete':     { page: 'task', default: 'Delete' },
  'task.btn_save':       { page: 'task', default: 'Save changes' },
  'task.btn_cancel':     { page: 'task', default: 'Cancel' },
  'task.edit_title':     { page: 'task', default: 'Edit task' },
  'task.field_title':    { page: 'task', default: 'Title' },
  'task.field_desc':     { page: 'task', default: 'Description' },
  'task.field_priority': { page: 'task', default: 'Priority' },
  'task.field_company':  { page: 'task', default: 'Company' },
  'task.field_assignee': { page: 'task', default: 'Assignee' },
  'task.priority_low':   { page: 'task', default: 'Low' },
  'task.priority_mid':   { page: 'task', default: 'Medium' },
  'task.priority_high':  { page: 'task', default: 'High' },
  'task.unassigned':     { page: 'task', default: '— Unassigned —' },
  'task.no_company':     { page: 'task', default: '— None —' },
  'task.change_due_title': { page: 'task', default: 'Change due date' },
  'task.reason_label':   { page: 'task', default: 'Reason (required)' },
  'task.reason_placeholder': { page: 'task', default: 'Why is the due date changing?' },
  'task.saving':         { page: 'task', default: 'Saving…' },
  'task.delete_confirm': { page: 'task', default: 'Delete this task? It will be archived.' },
  'task.parent_task':    { page: 'task', default: 'Parent task' },

  /* ── Translations page ──────────────────────────────────────────── */
  'translations.title':  { page: 'translations', default: 'Translations' },
  'translations.key':    { page: 'translations', default: 'Key' },
  'translations.default':{ page: 'translations', default: 'Default (EN)' },
  'translations.value':  { page: 'translations', default: 'Translation' },
  'translations.save':   { page: 'translations', default: 'Save all' },
  'translations.saved':  { page: 'translations', default: 'Saved!' },
}

export const PAGES = ['global', 'board', 'team', 'people', 'reports', 'settings', 'task', 'translations'] as const
export type TranslationPage = typeof PAGES[number]

export const PAGE_LABELS: Record<string, string> = {
  global: 'Global / Nav',
  board: 'Board',
  team: 'Team',
  people: 'People',
  reports: 'Reports',
  settings: 'Settings',
  task: 'Task modal',
  translations: 'Translations',
}
