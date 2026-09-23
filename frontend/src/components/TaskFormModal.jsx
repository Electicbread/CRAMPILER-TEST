import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../api.js'
import { localInputToIso } from '../lib.js'

const FALLBACK_CATEGORIES = ['Homework', 'Quiz', 'Midterm', 'Final']

function categoriesFor(courseCode, courses) {
  const course = courses?.find((c) => c.courseCode === courseCode)
  const keys = course ? Object.keys(course.categoryWeights || {}) : []
  return keys.length > 0 ? keys : FALLBACK_CATEGORIES
}

/** Add-task modal. Editing an existing task happens in TaskDrawer instead. */
export default function TaskFormModal({ open, courses, defaultDate, onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [category, setCategory] = useState('Homework')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Effect #1 (already existed): reset the whole form whenever the modal opens.
  useEffect(() => {
    if (!open) return
    setTitle('')
    setCourseCode(courses?.[0]?.courseCode ?? '')
    setCategory('Homework')
    setDueDate(defaultDate || '')
    setError(null)
  }, [open])

  // Effect #2 (new): whenever the selected course changes, make sure the
  // currently selected category is actually valid for that course. If you
  // pick a course whose syllabus doesn't have "Homework" as a category,
  // this swaps the selection to that course's first real category instead
  // of silently submitting an invalid one.
  useEffect(() => {
    const valid = categoriesFor(courseCode, courses)
    if (!valid.includes(category)) setCategory(valid[0])
  }, [courseCode, courses])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.createTask({
        title: title.trim(),
        courseCode: courseCode || null,
        category,
        dueDate: localInputToIso(dueDate),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    < div className="fixed inset-0 bg-overlay/40 flex items-center justify-center z-50 px-4 animate-fade-in" onClick={onClose} >
      <div
        className="bg-panel border border-line rounded-sm max-w-md w-full p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-serif text-xl text-ink">Add task</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-ink/60 mb-1">Title</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Problem Set 4"
              className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Course</label>
              <select
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
              >
                <option value="">No course</option>
                {courses?.map((c) => (
                  <option key={c.id} value={c.courseCode}>
                    {c.courseCode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-ink/60 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
              >
                {categoriesFor(courseCode, courses).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink/60 mb-1">Due date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
            />
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-ink/60 px-3 py-1.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm font-medium text-white bg-forest disabled:opacity-50 px-4 py-1.5 rounded-sm"
            >
              {saving ? 'Saving\u2026' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div >
  )
}