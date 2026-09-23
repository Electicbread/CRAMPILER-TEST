import { LayoutDashboard, CalendarDays, BookOpen, Settings as SettingsIcon, CircleCheck, CircleAlert } from 'lucide-react'
import { formatRelativeTime } from '../lib.js'
import ThemeToggle from './ThemeToggle.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ active, onChange, syncStatus }) {
  const synced = syncStatus?.lastSyncedAt
  const hasError = !!syncStatus?.lastError

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-52 shrink-0 border-r border-line min-h-screen py-8 px-4">
        <div className="mb-8 px-2">
          <h1 className="font-serif text-2xl tracking-tight text-ink">CramPiler</h1>
          <p className="text-xs text-ink/50 mt-1">What to do next, calculated.</p>
        </div>

        <nav className="space-y-1 flex-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-left transition-colors ${isActive ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-line/40'
                  }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 px-3 py-2 text-xs text-ink/50 border-t border-line pt-4">
          {hasError ? (
            <CircleAlert size={14} className="text-critical shrink-0" />
          ) : (
            <CircleCheck size={14} className="text-forest shrink-0" />
          )}
          <span>
            {hasError ? 'Sync failed' : synced ? `Synced ${formatRelativeTime(synced)}` : 'Not synced yet'}
          </span>
        </div>
        <div className="px-3 mt-2">
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-panel border-t border-line flex z-30">
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${isActive ? 'text-forest' : 'text-ink/50'
                }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </>
  )
} 