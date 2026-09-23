import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

export const NONE_KEY = '__none__'

export default function DashboardSettingsMenu({ courses, hideOverdue, onToggleHideOverdue, excludedCourses, onToggleCourse }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="text-ink/50 hover:text-forest p-1.5"
                aria-label="Dashboard settings"
            >
                <SlidersHorizontal size={18} />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-64 bg-panel border border-line rounded-md shadow-lg p-4 z-40 animate-scale-in">
                    <label className="flex items-center gap-2 text-sm text-ink/80 mb-4">
                        <input type="checkbox" checked={hideOverdue} onChange={onToggleHideOverdue} className="accent-forest" />
                        Hide overdue activities
                    </label>

                    <p className="text-xs font-medium uppercase tracking-wide text-ink/50 mb-2">Show courses</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {courses.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 text-sm text-ink/80">
                                <input
                                    type="checkbox"
                                    checked={!excludedCourses.has(c.courseCode)}
                                    onChange={() => onToggleCourse(c.courseCode)}
                                    className="accent-forest"
                                />
                                {c.courseCode}
                            </label>
                        ))}
                        <label className="flex items-center gap-2 text-sm text-ink/80">
                            <input
                                type="checkbox"
                                checked={!excludedCourses.has(NONE_KEY)}
                                onChange={() => onToggleCourse(NONE_KEY)}
                                className="accent-forest"
                            />
                            No course
                        </label>
                    </div>
                </div>
            )}
        </div>
    )
}