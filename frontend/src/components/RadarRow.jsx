import { courseColor, formatShortDate, subtaskProgress } from '../lib.js'

export default function RadarRow({ task, onOpen }) {
  const { total, done } = subtaskProgress(task)

  return (
    <button
      onClick={() => onOpen(task)}
      className="w-full flex items-center gap-3 py-2.5 text-left border-b border-line/60 last:border-0 opacity-70 hover:opacity-100 transition-opacity"
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: courseColor(task.courseCode) }}
      />
      <span className={`flex-1 min-w-0 text-sm truncate ${task.overdue ? 'text-critical' : 'text-ink/80'}`}>
        {task.title}
      </span>
      {total > 0 && <span className="text-xs text-ink/40 shrink-0">{done}/{total}</span>}
      <span className="text-xs text-ink/50 shrink-0 w-20 text-right">{formatShortDate(task.dueDate)}</span>
    </button>
  )
}
