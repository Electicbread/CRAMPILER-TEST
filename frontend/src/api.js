const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') || ''
  return contentType.includes('application/json') ? res.json() : res.text()
}

export const api = {
  // Tasks — active tasks are the Velocity Engine's Priority Pool
  getAllTasks: () => request('/tasks'),
  getActiveTasksByVelocity: () => request('/tasks/velocity'),
  getCompletedTasks: () => request('/tasks/completed'),
  createTask: (task) => request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, task) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  setComplete: (id, completed) =>
    request(`/tasks/${id}/complete`, { method: 'PUT', body: JSON.stringify({ completed }) }),

  // Subtasks — the D (Deficit) input
  updateSubtask: (assignmentId, payload) =>
    request(`/tasks/${assignmentId}/subtasks`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSubtask: (assignmentId, subtaskId) =>
    request(`/tasks/${assignmentId}/subtasks/${subtaskId}`, { method: 'DELETE' }),

  // Sync
  syncFeed: (icsUrl) => request('/sync', { method: 'POST', body: JSON.stringify({ icsUrl }) }),
  getSyncStatus: () => request('/sync/status'),

  // Courses — the W (Weight) input
  getCourses: () => request('/courses'),
  createCourse: (course) => request('/courses', { method: 'POST', body: JSON.stringify(course) }),
  updateCourse: (id, course) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(course) }),
  updateWeights: (courseId, weights) =>
    request(`/courses/${courseId}/weights`, { method: 'PUT', body: JSON.stringify(weights) }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),

  sendChatMessage: (message, history) =>
    request('/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
}
