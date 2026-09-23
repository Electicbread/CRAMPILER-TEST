const COURSE_TAGS = ['#5B7A99', '#8C6A54', '#5B8266', '#8E5B7A', '#78824A', '#6B5B8E']

export function courseColor(courseCode = '') {
  let hash = 0
  for (let i = 0; i < courseCode.length; i++) hash = courseCode.charCodeAt(i) + ((hash << 5) - hash)
  return COURSE_TAGS[Math.abs(hash) % COURSE_TAGS.length]
}

export function formatDue(dueDate) {
  if (!dueDate) return 'No due date'
  const d = new Date(dueDate)
  const dateLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${dateLabel}, ${timeLabel}`
}

export function formatShortDate(dueDate) {
  if (!dueDate) return 'No date'
  return new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** "in 5 days", "in 12 hours", "3 days ago" style label used on task cards. */
export function formatTimeLeft(dueDate) {
  if (!dueDate) return 'No due date'
  const diffMs = new Date(dueDate) - new Date()
  const diffHrs = diffMs / (1000 * 60 * 60)

  if (diffHrs < 0) {
    const hoursLate = Math.abs(diffHrs)
    if (hoursLate < 24) return `${Math.round(hoursLate)}h overdue`
    return `${Math.floor(hoursLate / 24)}d overdue`
  }
  if (diffHrs < 1) return `${Math.round(diffHrs * 60)}m left`
  if (diffHrs < 24) return `${Math.round(diffHrs)}h left`
  return `${Math.floor(diffHrs / 24)}d left`
}

/** "10 mins ago", "2 hours ago" — for the sidebar sync indicator. */
export function formatRelativeTime(iso) {
  if (!iso) return 'never'
  const diffMs = new Date() - new Date(iso)
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Deficit (D) as shown to the user: fraction of subtasks still incomplete,
 * mirrors VelocityScoringService exactly so the UI and the backend always
 * agree on what "D" means for a given task.
 */
export function computeDeficit(task) {
  const subtasks = task.subtasks || []
  if (subtasks.length === 0) return 1.0
  const done = subtasks.filter((s) => s.completed).length
  return (subtasks.length - done) / subtasks.length
}

export function subtaskProgress(task) {
  const total = task.subtasks?.length ?? 0
  const done = task.subtasks?.filter((s) => s.completed).length ?? 0
  return { total, done }
}

/** Builds a 6-row x 7-col month grid (Sun-Sat) of Date objects. */
export function getMonthMatrix(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  const weeks = []
  let cursor = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function localInputToIso(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

export function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Burnout Heatmap: for a week of Date objects, sums the syllabus weight (W,
 * as a 0-100 percentage) of every active task due that week, using each
 * task's course's category weight. Buckets into calm/watch/critical so the
 * calendar can color-code weeks by cumulative grade pressure.
 */
export function weekBurnout(weekDays, tasks, courses) {
  const courseByCode = new Map(courses.map((c) => [c.courseCode, c]))
  let totalWeight = 0

  for (const task of tasks) {
    if (task.completed || !task.dueDate) continue
    const due = new Date(task.dueDate)
    const inWeek = weekDays.some((d) => isSameDay(d, due))
    if (!inWeek) continue
    const course = courseByCode.get(task.courseCode)
    const fraction = course?.categoryWeights?.[task.category] ?? 0.1
    totalWeight += fraction * 100
  }

  let level = 'calm'
  if (totalWeight >= 50) level = 'critical'
  else if (totalWeight >= 25) level = 'watch'

  return { totalWeight: Math.round(totalWeight), level }
}

export const BURNOUT_COLORS = {
  calm: 'transparent',
  watch: '#C98A3E33',
  critical: '#A6402C33',
}


/**
 * How many completed tasks have a completedAt within the last 7 days.
 * Uses completedAt (when it was actually finished), not dueDate.
 */
export function completedThisWeek(completedTasks) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return completedTasks.filter((t) => t.completedAt && new Date(t.completedAt) >= weekAgo).length
}

/**
 * Consecutive-day streak: counts backward from today, day by day, as long
 * as each day has at least one task with a completedAt on it. Stops at the
 * first gap.
 */
export function computeStreak(completedTasks) {
  const completedDates = new Set(
    completedTasks.filter((t) => t.completedAt).map((t) => new Date(t.completedAt).toDateString()),
  )
  if (completedDates.size === 0) return 0

  let streak = 0
  const cursor = new Date()
  while (completedDates.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}