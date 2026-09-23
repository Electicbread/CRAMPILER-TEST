import { useEffect, useState } from 'react'
import { X, CheckCircle2, Circle, Plus, Trash2, Pencil, Check } from 'lucide-react'
import { api } from '../api.js'
import { formatDue, isoToLocalInput, localInputToIso, subtaskProgress } from '../lib.js'

const FALLBACK_CATEGORIES = ['Homework', 'Quiz', 'Midterm', 'Final']

function categoriesFor(courseCode, courses) {
  const course = courses?.find((c) => c.courseCode === courseCode)
  const keys = course ? Object.keys(course.categoryWeights || {}) : []
  return keys.length > 0 ? keys : FALLBACK_CATEGORIES
}

export default function TaskDrawer({ task, courses, onClose, onChanged, onToggleComplete, onToggleSubtask, onDeleteWithUndo }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [newSubtask, setNewSubtask] = useState('')

  const open = !!task

  useEffect(() => {
    if (task) {
      setEditing(false)
      setForm({
        title: task.title,
        courseCode: task.courseCode || '',
        category: task.category || 'Homework',
        dueDate: isoToLocalInput(task.dueDate),
        latePenaltyEnabled: !!task.latePenaltyEnabled,
      })
    }
  }, [task?.id])

  useEffect(() => {
    if (!form) return
    const valid = categoriesFor(form.courseCode, courses)
    if (!valid.includes(form.category)) {
      setForm((f) => ({ ...f, category: valid[0] }))
    }
  }, [form?.courseCode, courses])

  if (!open || !form) return null

  const course = courses.find((c) => c.courseCode === task.courseCode)
  const weightPct = Math.round((course?.categoryWeights?.[task.category] ?? 0.1) * 100)
  const { total, done } = subtaskProgress(task)

  async function addSubtask(e) {
    e.preventDefault()
    if (!newSubtask.trim()) return
    await api.updateSubtask(task.id, { description: newSubtask.trim(), completed: false })
    setNewSubtask('')
    onChanged()
  }

  async function deleteSubtask(subtask) {
    await api.deleteSubtask(task.id, subtask.id)
    onChanged()
  }

  async function saveEdit(e) {
    e.preventDefault()
    await api.updateTask(task.id, {
      title: form.title.trim(),
      courseCode: form.courseCode || null,
      category: form.category,
      dueDate: localInputToIso(form.dueDate),
      latePenaltyEnabled: form.latePenaltyEnabled,
    })
    setEditing(false)
    onChanged()
  }

  function handleDelete() {
    onDeleteWithUndo(task)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink/30 z-40 animate-fade-in" onClick={onClose} />

      <div
        className="fixed z-50 bg-panel border-line shadow-xl
                   inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] border-t
                   sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:w-[26rem]
                   sm:max-h-none sm:rounded-none sm:border-t-0 sm:border-l
                   overflow-y-auto animate-slide-up"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => onToggleComplete(task)} aria-label="Mark as done">
                {task.completed ? (
                  <CheckCircle2 size={22} className="text-forest" />
                ) : (
                  <Circle size={22} className="text-ink/25 hover:text-forest" />
                )}
              </button>
              <span className="text-xs text-ink/50">{task.completed ? 'Completed' : 'Active'}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setEditing((v) => !v)} className="text-ink/40 hover:text-forest" aria-label="Edit">
                <Pencil size={16} />
              </button>
              <button onClick={handleDelete} className="text-ink/40 hover:text-critical" aria-label="Delete">
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} className="text-ink/40 hover:text-ink/70" aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          {editing ? (
            <form onSubmit={saveEdit} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-ink/60 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Course</label>
                  <select
                    value={form.courseCode}
                    onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                    className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
                  >
                    <option value="">No course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.courseCode}>{c.courseCode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
                  >
                    {categoriesFor(form.courseCode, courses).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Due date</label>
                <input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={form.latePenaltyEnabled}
                  onChange={(e) => setForm({ ...form, latePenaltyEnabled: e.target.checked })}
                  className="accent-forest"
                />
                Apply late penalty if overdue (&minus;10% weight/day, instead of critical override)
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(false)} className="text-sm text-ink/60 px-3 py-1.5">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-1.5 text-sm font-medium text-white bg-forest px-3 py-1.5 rounded-sm">
                  <Check size={14} /> Save
                </button>
              </div>
            </form>
          ) : (
            <h2 className="font-serif text-xl text-ink mb-5 leading-snug">{task.title}</h2>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs text-ink/50 mb-0.5">Syllabus weight</p>
              <p className="text-ink font-medium">{weightPct}%</p>
            </div>
            <div>
              <p className="text-xs text-ink/50 mb-0.5">Due</p>
              <p className={`font-medium ${task.overdue ? 'text-critical' : 'text-ink'}`}>{formatDue(task.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50 mb-0.5">Velocity score</p>
              <p className="text-ink font-medium">{task.velocityScore?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50 mb-0.5">Late penalty</p>
              <p className="text-ink font-medium">{task.latePenaltyEnabled ? 'On' : 'Off'}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink/50">
                Subtasks {total > 0 && `(${done}/${total})`}
              </h3>
            </div>

            {total > 0 && (
              <ul className="space-y-2 mb-3">
                {task.subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm group">
                    <button onClick={() => onToggleSubtask(task.id, s)} className="shrink-0">
                      {s.completed ? (
                        <CheckCircle2 size={16} className="text-forest" />
                      ) : (
                        <Circle size={16} className="text-ink/30" />
                      )}
                    </button>
                    <span className={`flex-1 ${s.completed ? 'line-through text-ink/40' : 'text-ink'}`}>
                      {s.description}
                    </span>
                    <button
                      onClick={() => deleteSubtask(s)}
                      className="text-ink/30 hover:text-critical opacity-0 group-hover:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={addSubtask} className="flex items-center gap-2">
              <Plus size={14} className="text-ink/40 shrink-0" />
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask&hellip;"
                className="flex-1 bg-transparent border-b border-line/60 focus:border-forest text-sm py-1 outline-none"
              />
            </form>
            <p className="text-xs text-ink/40 mt-3">
              Checking a box lowers this task's Deficit (D) and instantly recalculates its Velocity Score.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}