import { format, differenceInHours, differenceInDays, isToday, isThisWeek } from 'date-fns'

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isToday(date)) return 'Today'
  return format(date, 'MMM d')
}

export function formatDateFull(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return format(date, 'MMM d, HH:mm')
}

export function formatDatetime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return format(date, 'MMM d, yyyy HH:mm')
}

export function hoursAgo(d: Date | string): number {
  const date = typeof d === 'string' ? new Date(d) : d
  return differenceInHours(new Date(), date)
}

export function daysLate(completedAt: Date | null, originalDueAt: Date | null): number {
  if (!completedAt || !originalDueAt) return 0
  return differenceInDays(completedAt, originalDueAt)
}

export function isLate(dueAt: Date | string | null | undefined): boolean {
  if (!dueAt) return false
  const date = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
  return date < new Date()
}

export function isDueThisWeek(dueAt: Date | string | null | undefined): boolean {
  if (!dueAt) return false
  const date = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
  return isThisWeek(date, { weekStartsOn: 1 })
}

export function taskProgress(done: number, total: number): number {
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

// Avatar background colours by index
const AV_COLORS = [
  '#4C6EF5', '#E8590C', '#0CA678', '#AE3EC9',
  '#1C7ED6', '#F08C00', '#D6336C', '#2F9E44',
]
export function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff
  return AV_COLORS[Math.abs(h) % AV_COLORS.length]
}

export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}
