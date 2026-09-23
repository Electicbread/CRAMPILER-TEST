import { CheckCircle2, Circle } from 'lucide-react'
import { courseColor, formatDue, formatTimeLeft, subtaskProgress } from '../lib.js'

export default function HeroCard({ task, onOpen, onToggleComplete }) {
  const { total, done } = subtaskProgress(task)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div
      className={`rounded-md border p-6 md:p-8 cursor-pointer transition-colors ${
        task.overdue ? 'bg-critical/10 border-critical' : 'bg-panel border-line'
      }`}
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: courseColor(task.courseCode) }}
            />
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              {task.courseCode || 'No course'} &middot; {task.category}
            </span>
            {task.overdue && (
              <span className="text-xs font-semibold uppercase tracking-wide text-critical">Overdue</span>
            )}
          </div>
          <h2 className="font-serif text-2xl md:text-3xl text-ink leading-snug">{task.title}</h2>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete(task)
          }}
          className="shrink-0 mt-1"
          aria-label="Mark as done"
        >
          {task.completed ? (
            <CheckCircle2 size={28} className="text-forest" />
          ) : (
            <Circle size={28} className="text-ink/25 hover:text-forest" />
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-sm">
        <span className={`font-medium ${task.overdue ? 'text-critical' : 'text-ink/70'}`}>
          {formatTimeLeft(task.dueDate)}
        </span>
        <span className="text-ink/50">{formatDue(task.dueDate)}</span>
        <span className="text-ink/50">Velocity {task.velocityScore?.toFixed(2)}</span>
      </div>

      {total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-ink/50 mb-1">
            <span>{done}/{total} subtasks complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-line/40 rounded-full overflow-hidden">
            <div className="h-full bg-forest transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
