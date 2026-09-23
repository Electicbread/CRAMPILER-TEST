import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import CalendarView from './components/CalendarView.jsx'
import CoursesManager from './components/CoursesManager.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import TaskDrawer from './components/TaskDrawer.jsx'
import DashboardSettingsMenu from './components/DashboardSettingsMenu.jsx'
import ToastContainer from './components/ToastContainer.jsx'
import { api } from './api.js'
import { showToast } from './toast.js'
import CongratsPopup from './components/CongratsPopup.jsx'
import ChatWidget from './components/ChatWidget.jsx'

const TITLES = {
  dashboard: 'Dashboard',
  calendar: 'Calendar',
  courses: 'Courses & syllabus weights',
  settings: 'Settings',
}

const UNDO_WINDOW_MS = 5000

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [allTasks, setAllTasks] = useState([])
  const [courses, setCourses] = useState([])
  const [syncStatus, setSyncStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [hideOverdue, setHideOverdue] = useState(() => {
    try {
      return localStorage.getItem('crampiler-hide-overdue') === 'true'
    } catch {
      return false
    }
  })
  const [excludedCourses, setExcludedCourses] = useState(() => {
    try {
      const raw = localStorage.getItem('crampiler-excluded-courses')
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Persist Dashboard filter settings across reloads.
  useEffect(() => {
    try { localStorage.setItem('crampiler-hide-overdue', String(hideOverdue)) } catch { }
  }, [hideOverdue])

  useEffect(() => {
    try { localStorage.setItem('crampiler-excluded-courses', JSON.stringify([...excludedCourses])) } catch { }
  }, [excludedCourses])
  const [celebratingTask, setCelebratingTask] = useState(null)

  const pendingDeletesRef = useRef(new Map()) // taskId -> { task, timeoutId }

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [tasksData, coursesData, statusData] = await Promise.all([
        api.getAllTasks(),
        api.getCourses(),
        api.getSyncStatus().catch(() => null),
      ])
      setAllTasks(tasksData)
      setCourses(coursesData)
      if (statusData) setSyncStatus(statusData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
    const interval = setInterval(() => loadAll(true), 60000)
    return () => clearInterval(interval)
  }, [loadAll])

  useEffect(() => {
    if (tab !== 'courses') loadAll(true) // CoursesManager fetches its own data
  }, [tab, loadAll])

  function patchTask(id, patch) {
    setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  // Optimistic: flip the checkbox instantly, then confirm with the server
  // in the background and silently reconcile scores/ranking once it replies.
  async function toggleTaskComplete(task) {
    const nextCompleted = !task.completed
    const prevSubtasks = task.subtasks
    patchTask(task.id, {
      completed: nextCompleted,
      subtasks: task.subtasks?.map((s) => ({ ...s, completed: nextCompleted })) ?? [],
    })
    if (nextCompleted) setCelebratingTask(task)
    try {
      await api.setComplete(task.id, nextCompleted)
      loadAll(true)
    } catch (err) {
      patchTask(task.id, { completed: task.completed, subtasks: prevSubtasks })
      showToast({ message: `Couldn't update "${task.title}": ${err.message}`, type: 'error' })
    }
  }

  async function toggleSubtask(taskId, subtask) {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return
    const nextCompleted = !subtask.completed
    const prevSubtasks = task.subtasks
    const prevCompleted = task.completed
    const nextSubtasks = task.subtasks.map((s) => (s.id === subtask.id ? { ...s, completed: nextCompleted } : s))
    const allDone = nextSubtasks.length > 0 && nextSubtasks.every((s) => s.completed)
    patchTask(taskId, { subtasks: nextSubtasks, completed: allDone })
    if (allDone && !prevCompleted) setCelebratingTask(task)
    try {
      await api.updateSubtask(taskId, { subtaskId: subtask.id, completed: nextCompleted })
      loadAll(true)
    } catch (err) {
      patchTask(taskId, { subtasks: prevSubtasks, completed: prevCompleted })
      showToast({ message: `Couldn't update subtask: ${err.message}`, type: 'error' })
    }
  }

  // Delete immediately from the UI, but hold off the real DELETE call for
  // the undo window — Undo just cancels the pending call and restores it.
  function deleteTaskWithUndo(task) {
    setAllTasks((prev) => prev.filter((t) => t.id !== task.id))
    setSelectedTaskId((id) => (id === task.id ? null : id))

    const timeoutId = setTimeout(async () => {
      pendingDeletesRef.current.delete(task.id)
      try {
        await api.deleteTask(task.id)
      } catch (err) {
        setAllTasks((prev) => [...prev, task])
        showToast({ message: `Couldn't delete "${task.title}": ${err.message}`, type: 'error' })
      }
    }, UNDO_WINDOW_MS)

    pendingDeletesRef.current.set(task.id, { task, timeoutId })

    showToast({
      message: `Deleted "${task.title}"`,
      actionLabel: 'Undo',
      duration: UNDO_WINDOW_MS,
      onAction: () => {
        const pending = pendingDeletesRef.current.get(task.id)
        if (!pending) return
        clearTimeout(pending.timeoutId)
        pendingDeletesRef.current.delete(task.id)
        setAllTasks((prev) => [...prev, task])
      },
    })
  }

  function toggleCourseFilter(courseCode) {
    setExcludedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseCode)) next.delete(courseCode)
      else next.add(courseCode)
      return next
    })
  }

  const activeTasks = allTasks
    .filter((t) => !t.completed)
    .sort((a, b) => b.velocityScore - a.velocityScore)
  const completedTasks = allTasks
    .filter((t) => t.completed)
    .sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0))

  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) || null

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      <Sidebar active={tab} onChange={setTab} syncStatus={syncStatus} />

      <div className="flex-1 px-5 md:px-8 py-8 pb-20 md:pb-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-ink">{TITLES[tab]}</h2>
          {tab === 'dashboard' && (
            <DashboardSettingsMenu
              courses={courses}
              hideOverdue={hideOverdue}
              onToggleHideOverdue={() => setHideOverdue((v) => !v)}
              excludedCourses={excludedCourses}
              onToggleCourse={toggleCourseFilter}
            />
          )}
        </div>

        {tab === 'dashboard' && (
          <Dashboard
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            courses={courses}
            loading={loading}
            hideOverdue={hideOverdue}
            excludedCourses={excludedCourses}
            onRefresh={() => loadAll(true)}
            onOpenTask={(t) => setSelectedTaskId(t.id)}
            onChanged={() => loadAll(true)}
            onToggleComplete={toggleTaskComplete}
          />
        )}

        {tab === 'calendar' && (
          <CalendarView
            tasks={allTasks}
            courses={courses}
            onOpenTask={(t) => setSelectedTaskId(t.id)}
            onChanged={() => loadAll(true)}
          />
        )}

        {tab === 'courses' && <CoursesManager />}

        {tab === 'settings' && <SettingsPanel onSynced={() => loadAll(true)} />}
      </div>

      <TaskDrawer
        task={selectedTask}
        courses={courses}
        onClose={() => setSelectedTaskId(null)}
        onChanged={() => loadAll(true)}
        onToggleComplete={toggleTaskComplete}
        onToggleSubtask={toggleSubtask}
        onDeleteWithUndo={deleteTaskWithUndo}
      />

      <ToastContainer />
      <CongratsPopup task={celebratingTask} onClose={() => setCelebratingTask(null)} />

      <ToastContainer />
      <CongratsPopup task={celebratingTask} onClose={() => setCelebratingTask(null)} />
      <ChatWidget />
    </div>
  )
}