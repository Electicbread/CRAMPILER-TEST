// Minimal toast event bus. Any component calls showToast(); ToastContainer
// (mounted once in App.jsx) is the only thing that listens and renders.
let listeners = []
let idCounter = 0

export function subscribeToast(fn) {
    listeners.push(fn)
    return () => {
        listeners = listeners.filter((l) => l !== fn)
    }
}

export function showToast({ message, type = 'info', actionLabel, onAction, duration = 4000 }) {
    const id = ++idCounter
    const toast = { id, message, type, actionLabel, onAction, duration }
    listeners.forEach((l) => l(toast))
    return id
}