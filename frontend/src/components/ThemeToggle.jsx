import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme, subscribeTheme } from '../theme.js'

export default function ThemeToggle({ className = '' }) {
    const [theme, setThemeState] = useState(getTheme())

    // Listen for changes made by ANY ThemeToggle instance, not just this one.
    useEffect(() => subscribeTheme(setThemeState), [])

    return (
        <button
            onClick={() => toggleTheme()}
            className={`flex items-center gap-2 text-xs text-ink/60 hover:text-ink transition-colors ${className}`}
            aria-label="Toggle dark mode"
        >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
    )
}