import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { courseColor, getMonthMatrix, isSameDay, isoToLocalInput, weekBurnout, BURNOUT_COLORS } from '../lib.js'
import TaskFormModal from './TaskFormModal.jsx'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ tasks, courses, onOpenTask, onChanged }) {
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month])

  const tasksByDay = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const key = new Date(t.dueDate).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    }
    return map
  }, [tasks])

  const selectedTasks = (tasksByDay.get(selectedDay.toDateString()) || []).sort(
    (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
  )

  const today = new Date()

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="text-ink/50 hover:text-forest p-1">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-serif text-lg text-ink w-40 text-center">
            {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="text-ink/50 hover:text-forest p-1">
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={() => {
            setCursor(new Date())
            setSelectedDay(new Date())
          }}
          className="text-sm text-forest font-medium"
        >
          Today
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-ink/50">
        <span className="font-medium">Burnout Heatmap:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-transparent border border-line" /> Calm</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BURNOUT_COLORS.watch }} /> 25%+ that week</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BURNOUT_COLORS.critical }} /> 50%+ that week</span>
      </div>

      <div className="border-t border-l border-line">
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="text-xs text-ink/50 text-center py-1.5 border-r border-b border-line bg-line/10">
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => {
          const burnout = weekBurnout(week, tasks, courses)
          return (
            <div
              key={wi}
              className="grid grid-cols-7"
              style={{ backgroundColor: BURNOUT_COLORS[burnout.level] }}
              title={burnout.level !== 'calm' ? `${burnout.totalWeight}% of your grade is due this week` : undefined}
            >
              {week.map((day, di) => {
                const inMonth = day.getMonth() === month
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selectedDay)
                const dayTasks = tasksByDay.get(day.toDateString()) || []

                return (
                  <button
                    key={di}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[72px] text-left p-1.5 border-r border-b border-line align-top ${!inMonth ? 'opacity-40' : ''
                      } ${isSelected ? 'ring-2 ring-inset ring-forest' : ''}`}
                  >
                    <span
                      className={`text-xs inline-flex items-center justify-center w-5 h-5 rounded-full ${isToday ? 'bg-amber text-[#2E2419] font-semibold' : 'text-ink/70'
                        }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className={`text-[10px] leading-tight truncate px-1 rounded-sm ${t.completed ? 'line-through opacity-50' : ''
                            } ${t.overdue ? 'font-semibold' : ''}`}
                          style={{
                            backgroundColor: t.overdue ? '#A6402C33' : `${courseColor(t.courseCode)}22`,
                            color: t.overdue ? '#A6402C' : courseColor(t.courseCode),
                          }}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && <div className="text-[10px] text-ink/40">+{dayTasks.length - 3} more</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-serif text-lg text-ink">
            {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-forest px-3 py-1.5 rounded-sm"
          >
            <Plus size={14} /> Add task
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <p className="text-sm text-ink/50 py-4 border-t border-line">Nothing due this day.</p>
        ) : (
          <div className="border-t border-line">
            {selectedTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTask(t)}
                className="w-full flex items-center gap-3 py-2.5 text-left border-b border-line/60 last:border-0"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: courseColor(t.courseCode) }} />
                <span className={`flex-1 text-sm truncate ${t.completed ? 'line-through text-ink/40' : t.overdue ? 'text-critical' : 'text-ink'}`}>
                  {t.title}
                </span>
                <span className="text-xs text-ink/40 shrink-0">{t.courseCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <TaskFormModal
        open={modalOpen}
        courses={courses}
        defaultDate={isoToLocalInput(
          new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 23, 59).toISOString(),
        )}
        onClose={() => setModalOpen(false)}
        onSaved={onChanged}
      />
    </div>
  )
}
