import { CheckCircle2, Circle } from 'lucide-react'
import { courseColor, formatTimeLeft, subtaskProgress } from '../lib.js'

export default function RunnerUpCard({ task, onOpen, onToggleComplete }) {
  const { total, done } = subtaskProgress(task)

  return (
    <div
      className={`rounded-md border p-4 cursor-pointer transition-colors ${
        task.overdue ? 'bg-critical/10 border-critical' : 'bg-panel border-line'
      }`}
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: courseColor(task.courseCode) }}
            />
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink/50 truncate">
              {task.courseCode || 'No course'}
            </span>
          </div>
          <h3 className="font-medium text-ink text-sm leading-snug line-clamp-2">{task.title}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete(task)
          }}
          className="shrink-0"
          aria-label="Mark as done"
        >
          {task.completed ? (
            <CheckCircle2 size={18} className="text-forest" />
          ) : (
            <Circle size={18} className="text-ink/25 hover:text-forest" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs">
        <span className={task.overdue ? 'text-critical font-medium' : 'text-ink/60'}>
          {formatTimeLeft(task.dueDate)}
        </span>
        {total > 0 && <span className="text-ink/40">{done}/{total}</span>}
      </div>
    </div>
  )
}
