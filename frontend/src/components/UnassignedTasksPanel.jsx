import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api.js'
import { showToast } from '../toast.js'

function isUnassigned(task) {
    return !task.courseCode || task.courseCode === 'UNASSIGNED'
}

export default function UnassignedTasksPanel({ tasks, courses, onChanged }) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState(() => new Set())
    const [bulkCourse, setBulkCourse] = useState(courses[0]?.courseCode ?? '')
    const [busy, setBusy] = useState(false)

    // Fix: courses often loads AFTER this component's first mount, so the
    // useState initializer above can end up stuck on '' forever. Sync it
    // once real courses arrive, without clobbering a choice the user already made.
    useEffect(() => {
        if (!bulkCourse && courses[0]) setBulkCourse(courses[0].courseCode)
    }, [courses, bulkCourse])

    const unassigned = tasks.filter(isUnassigned)
    if (unassigned.length === 0 || courses.length === 0) return null

    function toggleSelected(id) {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // notify=false lets bulk assignment skip the per-task refetch and do one at the end instead.
    async function assignOne(task, courseCode, notify = true) {
        try {
            await api.updateTask(task.id, {
                title: task.title,
                courseCode: courseCode || null,
                category: task.category,
                dueDate: task.dueDate,
                latePenaltyEnabled: !!task.latePenaltyEnabled,
            })
            if (notify) onChanged()
        } catch (err) {
            showToast({ message: `Couldn't assign "${task.title}": ${err.message}`, type: 'error' })
        }
    }

    async function assignSelected() {
        if (!bulkCourse || selected.size === 0) return
        setBusy(true)
        try {
            const toAssign = unassigned.filter((t) => selected.has(t.id))
            await Promise.all(toAssign.map((t) => assignOne(t, bulkCourse, false)))
            onChanged() // one refetch for the whole batch, not one per task
            showToast({ message: `Assigned ${toAssign.length} task${toAssign.length === 1 ? '' : 's'} to ${bulkCourse}`, type: 'success' })
            setSelected(new Set())
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="mb-6 pb-6 border-b border-line">
            <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink">
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Unassigned tasks ({unassigned.length}) &mdash; from sync, no course matched yet
            </button>

            {open && (
                <div className="mt-3">
                    <p className="text-xs text-ink/50 mb-3">
                        Blackboard's calendar feed doesn't include course info, so synced tasks land here until
                        you assign them. Select a few and bulk-assign, or pick one at a time.
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                        <select
                            value={bulkCourse}
                            onChange={(e) => setBulkCourse(e.target.value)}
                            className="bg-transparent border-b border-line focus:border-forest px-1 py-1 text-sm outline-none"
                        >
                            {courses.map((c) => (
                                <option key={c.id} value={c.courseCode}>{c.courseCode}</option>
                            ))}
                        </select>
                        <button
                            onClick={assignSelected}
                            disabled={selected.size === 0 || busy}
                            className="text-sm font-medium text-white bg-forest disabled:opacity-40 px-3 py-1 rounded-sm"
                        >
                            {busy ? 'Assigning\u2026' : `Assign ${selected.size || ''} selected`}
                        </button>
                    </div>

                    <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                        {unassigned.map((task) => (
                            <li key={task.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={selected.has(task.id)}
                                    onChange={() => toggleSelected(task.id)}
                                    className="accent-forest shrink-0"
                                />
                                <span className="flex-1 truncate text-ink/80">{task.title}</span>
                                <select
                                    defaultValue=""
                                    onChange={(e) => e.target.value && assignOne(task, e.target.value)}
                                    className="text-xs bg-transparent border-b border-line/60 focus:border-forest px-1 py-0.5 outline-none shrink-0"
                                >
                                    <option value="" disabled>Quick assign&hellip;</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.courseCode}>{c.courseCode}</option>
                                    ))}
                                </select>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}