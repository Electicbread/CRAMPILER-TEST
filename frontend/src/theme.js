const STORAGE_KEY = 'crampiler-theme'

// Pub/sub so every <ThemeToggle/> instance (sidebar, settings, wherever
// else one gets added) stays in sync when ANY of them changes the theme —
// same pattern as toast.js.
let listeners = []

export function subscribeTheme(fn) {
    listeners.push(fn)
    return () => {
        listeners = listeners.filter((l) => l !== fn)
    }
}

export function getTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    listeners.forEach((l) => l(theme))
}

export function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark'
    setTheme(next)
    return next
}