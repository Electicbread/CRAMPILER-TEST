import { useState } from 'react'
import { Plus, RefreshCw, ChevronDown, ChevronRight, Flame } from 'lucide-react'
import HeroCard from './HeroCard.jsx'
import RunnerUpCard from './RunnerUpCard.jsx'
import RadarRow from './RadarRow.jsx'
import TaskFormModal from './TaskFormModal.jsx'
import { NONE_KEY } from './DashboardSettingsMenu.jsx'
import { computeStreak, completedThisWeek } from '../lib.js'

export default function Dashboard({
  activeTasks, completedTasks, courses, loading,
  hideOverdue, excludedCourses,
  onRefresh, onOpenTask, onChanged, onToggleComplete,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  if (loading) return <p className="text-ink/60 py-8">Calculating your priorities&hellip;</p>

  const filtered = activeTasks.filter((t) => {
    if (hideOverdue && t.overdue) return false
    const key = t.courseCode || NONE_KEY
    if (excludedCourses.has(key)) return false
    return true
  })

  const streak = computeStreak(completedTasks)
  const weekCount = completedThisWeek(completedTasks)

  if (activeTasks.length === 0 || filtered.length === 0) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-forest px-3 py-1.5 rounded-sm"
          >
            <Plus size={15} /> Add task
          </button>
        </div>
        <div className="py-12 text-center border border-dashed border-line rounded-md">
          <p className="font-serif text-lg text-ink">
            {activeTasks.length === 0 ? 'Nothing on your plate.' : 'No tasks match your current filters.'}
          </p>
          <p className="text-ink/60 mt-1 text-sm">
            {activeTasks.length === 0
              ? 'Sync your Blackboard feed or add a task to get started.'
              : 'Check the settings icon above to adjust what\u2019s hidden.'}
          </p>
        </div>
        <TaskFormModal open={modalOpen} courses={courses} onClose={() => setModalOpen(false)} onSaved={onChanged} />
      </div>
    )
  }

  const [hero, ...rest] = filtered
  const runnerUps = rest.slice(0, 2)
  const radar = rest.slice(2)

  return (
    <div>
      {(streak > 0 || weekCount > 0) && (
        <div className="flex items-center gap-4 mb-4 text-sm text-ink/60">
          {streak > 0 && (
            <span className="flex items-center gap-1.5">
              <Flame size={15} className="text-amber" />
              {streak}-day streak
            </span>
          )}
          {weekCount > 0 && <span>{weekCount} done this week</span>}
        </div>
      )}

      <div className="flex justify-end gap-2 mb-4">
        <button onClick={onRefresh} className="text-ink/50 hover:text-forest p-1.5" aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-forest px-3 py-1.5 rounded-sm"
        >
          <Plus size={15} /> Add task
        </button>
      </div>

      <HeroCard task={hero} onOpen={onOpenTask} onToggleComplete={onToggleComplete} />

      {runnerUps.length > 0 && (
        <div className={`grid gap-4 mt-4 ${runnerUps.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {runnerUps.map((t) => (
            <RunnerUpCard key={t.id} task={t} onOpen={onOpenTask} onToggleComplete={onToggleComplete} />
          ))}
        </div>
      )}

      {radar.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-line" />
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink/50">Upcoming Radar</h3>
            <div className="flex-1 h-px bg-line" />
          </div>
          <p className="text-xs text-ink/40 mb-2">
            Everything else, in date order &mdash; nothing urgent yet, but nothing's slipping through the cracks either.
          </p>
          <div>
            {radar.map((t) => (
              <RadarRow key={t.id} task={t} onOpen={onOpenTask} />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setArchiveOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink/80"
          >
            {archiveOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Completed ({completedTasks.length})
          </button>
          {archiveOpen && (
            <div className="mt-2 border-t border-line">
              {completedTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-line/60 last:border-0">
                  <span className="flex-1 text-sm text-ink/40 line-through truncate">{t.title}</span>
                  <button onClick={() => onOpenTask(t)} className="text-xs text-forest shrink-0">
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <TaskFormModal open={modalOpen} courses={courses} onClose={() => setModalOpen(false)} onSaved={onChanged} />
    </div>
  )
}