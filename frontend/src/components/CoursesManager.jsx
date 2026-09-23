import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, X, TriangleAlert } from 'lucide-react'
import { api } from '../api.js'
import { courseColor } from '../lib.js'
import { PROGRAM_TEMPLATES } from '../data/programTemplates.js'
import { COURSE_TYPE_TEMPLATES, COURSE_TYPE_LABELS } from '../data/courseTypeTemplates.js'
import { showToast } from '../toast.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import UnassignedTasksPanel from './UnassignedTasksPanel.jsx'

const TYPE_OPTIONS = Object.keys(COURSE_TYPE_TEMPLATES)

function resolveTemplateWeights(courseEntry) {
  if (courseEntry.categoryWeights) return courseEntry.categoryWeights
  if (courseEntry.type && COURSE_TYPE_TEMPLATES[courseEntry.type]) return COURSE_TYPE_TEMPLATES[courseEntry.type]
  return {}
}

export default function CoursesManager() {
  const [courses, setCourses] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [newCategoryDraft, setNewCategoryDraft] = useState({})
  const [applyTypeDraft, setApplyTypeDraft] = useState({})
  const [confirmingApplyFor, setConfirmingApplyFor] = useState(null)

  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState(90)
  const [newType, setNewType] = useState('')
  const [creating, setCreating] = useState(false)

  const [selectedProgramName, setSelectedProgramName] = useState(PROGRAM_TEMPLATES[0]?.name ?? '')
  const selectedProgram = PROGRAM_TEMPLATES.find((p) => p.name === selectedProgramName)

  const [selectedYear, setSelectedYear] = useState(selectedProgram?.years[0]?.year ?? '')
  const yearObj = selectedProgram?.years.find((y) => y.year === selectedYear)

  const [selectedSemester, setSelectedSemester] = useState(yearObj?.semesters[0]?.semester ?? '')
  const semesterObj = yearObj?.semesters.find((s) => s.semester === selectedSemester)

  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')

  function handleProgramChange(name) {
    setSelectedProgramName(name)
    const program = PROGRAM_TEMPLATES.find((p) => p.name === name)
    const firstYear = program?.years[0]?.year ?? ''
    setSelectedYear(firstYear)
    const firstYearObj = program?.years.find((y) => y.year === firstYear)
    setSelectedSemester(firstYearObj?.semesters[0]?.semester ?? '')
    setSeedMessage('')
  }

  function handleYearChange(year) {
    setSelectedYear(year)
    const newYearObj = selectedProgram?.years.find((y) => y.year === year)
    setSelectedSemester(newYearObj?.semesters[0]?.semester ?? '')
    setSeedMessage('')
  }

  // silent=true skips the full-page loading placeholder, so an in-progress
  // UI state (like the Unassigned panel being expanded) doesn't get torn
  // down and remounted every time a background refresh runs.
  async function load(silent = false) {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [coursesData, tasksData] = await Promise.all([api.getCourses(), api.getAllTasks()])
      setCourses(coursesData)
      setTasks(tasksData)
    } catch (e) {
      setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const code = newCode.trim()
    if (!code || !newName.trim()) return

    if (courses.some((c) => c.courseCode.toLowerCase() === code.toLowerCase())) {
      showToast({ message: `A course with code "${code}" already exists.`, type: 'error' })
      return
    }

    setCreating(true)
    try {
      await api.createCourse({
        courseCode: code,
        courseName: newName.trim(),
        targetGrade: newTarget / 100,
        categoryWeights: newType ? COURSE_TYPE_TEMPLATES[newType] : {},
      })
      setNewCode('')
      setNewName('')
      setNewTarget(90)
      setNewType('')
      load(true)
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  async function handleSeedProgram() {
    const templateCourses = semesterObj?.courses ?? []
    if (templateCourses.length === 0) {
      setSeedMessage('No courses defined for this term yet in programTemplates.js.')
      return
    }
    setSeeding(true)
    setSeedMessage('')
    try {
      const existingCodes = new Set(courses.map((c) => c.courseCode.toLowerCase()))
      const toCreate = templateCourses.filter((c) => !existingCodes.has(c.code.toLowerCase()))
      const results = await Promise.allSettled(
        toCreate.map((c) =>
          api.createCourse({
            courseCode: c.code,
            courseName: c.name,
            targetGrade: 0.9,
            categoryWeights: resolveTemplateWeights(c),
          }),
        ),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      const added = results.length - failed
      setSeedMessage(
        `Added ${added} course${added === 1 ? '' : 's'}` +
        (toCreate.length < templateCourses.length ? ` (${templateCourses.length - toCreate.length} already existed, skipped)` : '') +
        (failed > 0 ? ` — ${failed} failed` : ''),
      )
      load(true)
    } finally {
      setSeeding(false)
    }
  }

  function updateLocalField(id, field, value) {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  function updateLocalWeight(id, category, value) {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, categoryWeights: { ...c.categoryWeights, [category]: value } } : c)),
    )
  }

  async function commitCourse(course) {
    try {
      await api.updateCourse(course.id, course)
    } catch (err) {
      showToast({ message: err.message, type: 'error' })
      load(true)
    }
  }

  async function addCategory(course) {
    const name = (newCategoryDraft[course.id] || '').trim()
    if (!name) return
    if (course.categoryWeights?.[name] !== undefined) {
      setNewCategoryDraft((d) => ({ ...d, [course.id]: '' }))
      return
    }
    const updated = { ...course, categoryWeights: { ...course.categoryWeights, [name]: 0 } }
    setCourses((prev) => prev.map((c) => (c.id === course.id ? updated : c)))
    setNewCategoryDraft((d) => ({ ...d, [course.id]: '' }))
    await api.updateCourse(course.id, updated)
  }

  async function removeCategory(course, category) {
    const { [category]: _, ...rest } = course.categoryWeights || {}
    const updated = { ...course, categoryWeights: rest }
    setCourses((prev) => prev.map((c) => (c.id === course.id ? updated : c)))
    await api.updateCourse(course.id, updated)
  }

  function requestApplyTemplate(course) {
    const type = applyTypeDraft[course.id]
    if (!type) return
    const hasExisting = Object.keys(course.categoryWeights || {}).length > 0
    if (hasExisting) {
      setConfirmingApplyFor(course)
    } else {
      applyTemplate(course)
    }
  }

  async function applyTemplate(course) {
    const type = applyTypeDraft[course.id]
    if (!type) return
    const updated = { ...course, categoryWeights: { ...COURSE_TYPE_TEMPLATES[type] } }
    setCourses((prev) => prev.map((c) => (c.id === course.id ? updated : c)))
    setConfirmingApplyFor(null)
    await api.updateCourse(course.id, updated)
    showToast({ message: `Applied "${COURSE_TYPE_LABELS[type]}" template to ${course.courseCode}`, type: 'success' })
  }

  async function handleDelete(id) {
    await api.deleteCourse(id)
    setDeletingId(null)
    load(true)
  }

  function progressFor(courseCode) {
    const courseTasks = tasks.filter((t) => t.courseCode === courseCode)
    const done = courseTasks.filter((t) => t.completed).length
    return { done, total: courseTasks.length }
  }

  if (loading) return <p className="text-ink/60 py-8">Loading courses&hellip;</p>
  if (error) return <p className="text-critical py-8">Couldn't load courses: {error}</p>

  return (
    <div>
      <UnassignedTasksPanel tasks={tasks} courses={courses} onChanged={() => load(true)} />

      {PROGRAM_TEMPLATES.length > 0 && (
        <div className="mb-6 pb-6 border-b border-line">
          <label className="block text-xs text-ink/60 mb-2">Add courses from your curriculum</label>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] text-ink/50 mb-1">Program</label>
              <select
                value={selectedProgramName}
                onChange={(e) => handleProgramChange(e.target.value)}
                className="bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
              >
                {PROGRAM_TEMPLATES.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-ink/50 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
              >
                {selectedProgram?.years.map((y) => (
                  <option key={y.year} value={y.year}>{y.year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-ink/50 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
              >
                {yearObj?.semesters.map((s) => (
                  <option key={s.semester} value={s.semester}>{s.semester}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSeedProgram}
              disabled={seeding}
              className="text-sm font-medium text-forest border border-forest disabled:opacity-50 px-3 py-1.5 rounded-sm"
            >
              {seeding ? 'Adding\u2026' : `Add ${semesterObj?.courses.length ?? 0} course${semesterObj?.courses.length === 1 ? '' : 's'}`}
            </button>
          </div>
          {seedMessage && <p className="text-xs text-ink/50 mt-2">{seedMessage}</p>}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 mb-6 pb-6 border-b border-line">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Course code</label>
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="CSS121P"
            className="w-28 bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-ink/60 mb-1">Course name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Computer Programming 1"
            className="w-full bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Target grade %</label>
          <input
            type="number"
            min="0"
            max="100"
            value={newTarget}
            onChange={(e) => setNewTarget(Number(e.target.value))}
            className="w-20 bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Syllabus type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
          >
            <option value="">Blank (build manually)</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{COURSE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-forest disabled:opacity-50 px-3 py-1.5 rounded-sm"
        >
          <Plus size={15} /> Add course
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="text-ink/60">No courses yet &mdash; add one above to start setting syllabus weights.</p>
      ) : (
        <div className="divide-y divide-line">
          {courses.map((course) => {
            const isOpen = expandedId === course.id
            const categories = Object.keys(course.categoryWeights || {})
            const totalWeight = Object.values(course.categoryWeights || {}).reduce((a, b) => a + b, 0)
            const weightPct = Math.round(totalWeight * 100)
            const weightOk = weightPct === 100
            const { done, total } = progressFor(course.courseCode)

            return (
              <div key={course.id} className="py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-1 h-8 rounded-sm shrink-0" style={{ backgroundColor: courseColor(course.courseCode) }} />
                  <button onClick={() => setExpandedId(isOpen ? null : course.id)} className="text-ink/40 shrink-0">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <input
                    value={course.courseCode}
                    onChange={(e) => updateLocalField(course.id, 'courseCode', e.target.value)}
                    onBlur={() => commitCourse(course)}
                    className="w-24 bg-transparent border-b border-transparent focus:border-forest text-sm font-medium outline-none"
                  />
                  <input
                    value={course.courseName}
                    onChange={(e) => updateLocalField(course.id, 'courseName', e.target.value)}
                    onBlur={() => commitCourse(course)}
                    className="flex-1 min-w-[120px] bg-transparent border-b border-transparent focus:border-forest text-sm outline-none"
                  />

                  {total > 0 && (
                    <span className="text-xs text-ink/50 shrink-0">{done}/{total} done</span>
                  )}

                  <div className="flex items-center gap-1 text-sm text-ink/60 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={Math.round((course.targetGrade ?? 0) * 100)}
                      onChange={(e) => updateLocalField(course.id, 'targetGrade', Number(e.target.value) / 100)}
                      onBlur={() => commitCourse(course)}
                      className="w-14 bg-transparent border-b border-transparent focus:border-forest text-right outline-none"
                    />
                    <span>% target</span>
                  </div>

                  <span className={`text-xs shrink-0 ${weightOk ? 'text-forest' : 'text-critical font-medium'}`}>
                    {weightPct}% weighted
                  </span>

                  <button onClick={() => setDeletingId(course.id)} className="text-ink/30 hover:text-critical shrink-0" aria-label="Delete course">
                    <Trash2 size={15} />
                  </button>
                </div>

                {!weightOk && categories.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 ml-9 text-xs text-critical">
                    <TriangleAlert size={13} className="shrink-0" />
                    Weights total {weightPct}%, not 100% &mdash; every task's Velocity Score in this course is
                    off until this adds up.
                  </div>
                )}

                {isOpen && (
                  <div className="mt-3 pl-9 space-y-3">
                    {categories.length === 0 && (
                      <p className="text-sm text-ink/40">No categories yet &mdash; add one below, or apply a syllabus type template.</p>
                    )}
                    {categories.map((category) => {
                      const value = course.categoryWeights[category]
                      return (
                        <div key={category} className="flex items-center gap-3">
                          <label className="w-40 text-sm text-ink/70 shrink-0 truncate" title={category}>{category}</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={value}
                            onChange={(e) => updateLocalWeight(course.id, category, parseFloat(e.target.value))}
                            onMouseUp={() => commitCourse(course)}
                            onTouchEnd={() => commitCourse(course)}
                            className="flex-1 accent-forest"
                          />
                          <span className="w-10 text-sm text-ink/70 text-right tabular-nums">{Math.round(value * 100)}%</span>
                          <button onClick={() => removeCategory(course, category)} className="text-ink/30 hover:text-critical shrink-0" aria-label={`Remove ${category}`}>
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        value={newCategoryDraft[course.id] || ''}
                        onChange={(e) => setNewCategoryDraft((d) => ({ ...d, [course.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory(course))}
                        placeholder="Add category (e.g. Prelim)"
                        className="flex-1 bg-transparent border-b border-line focus:border-forest px-1 py-1 text-sm outline-none"
                      />
                      <button onClick={() => addCategory(course)} className="text-sm text-forest font-medium shrink-0">
                        Add
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-line/60 mt-2">
                      <select
                        value={applyTypeDraft[course.id] || ''}
                        onChange={(e) => setApplyTypeDraft((d) => ({ ...d, [course.id]: e.target.value }))}
                        className="bg-transparent border-b border-line focus:border-forest px-1 py-1 text-xs outline-none"
                      >
                        <option value="">Apply a syllabus type&hellip;</option>
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{COURSE_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => requestApplyTemplate(course)}
                        disabled={!applyTypeDraft[course.id]}
                        className="text-xs font-medium text-forest disabled:opacity-40 shrink-0"
                      >
                        Apply (replaces all categories above)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Delete this course?"
        message="Its assignments won't be deleted, but they'll lose their syllabus weight until reassigned."
        onConfirm={() => handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmDialog
        open={!!confirmingApplyFor}
        title="Replace this course's categories?"
        message={
          confirmingApplyFor
            ? `This overwrites all ${Object.keys(confirmingApplyFor.categoryWeights || {}).length} existing categories in ${confirmingApplyFor.courseCode} with the "${COURSE_TYPE_LABELS[applyTypeDraft[confirmingApplyFor.id]]}" template.`
            : ''
        }
        confirmLabel="Apply template"
        onConfirm={() => applyTemplate(confirmingApplyFor)}
        onCancel={() => setConfirmingApplyFor(null)}
      />
    </div>
  )
}