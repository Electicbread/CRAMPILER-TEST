import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../api.js'
import ThemeToggle from './ThemeToggle.jsx'

export default function SettingsPanel({ onSynced }) {
  const [icsUrl, setIcsUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function handleSync(e) {
    e.preventDefault()
    if (!icsUrl.trim()) return
    setStatus('syncing')
    setMessage('')
    try {
      const result = await api.syncFeed(icsUrl.trim())
      setStatus('done')
      setMessage(result)
      onSynced?.()
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h3 className="font-serif text-lg text-ink mb-1">Blackboard sync</h3>
        <p className="text-sm text-ink/60 mb-4">
          Paste your private Blackboard .ics feed link once &mdash; CramPiler re-checks it
          automatically every hour after that (see the sync status in the sidebar).
        </p>

        <form onSubmit={handleSync} className="flex gap-2">
          <input
            type="url"
            required
            placeholder="https://blackboard.youruni.edu/private/feed.ics"
            value={icsUrl}
            onChange={(e) => setIcsUrl(e.target.value)}
            className="flex-1 bg-transparent border-b border-line focus:border-forest px-1 py-1.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={status === 'syncing'}
            className="flex items-center gap-1.5 text-sm font-medium text-forest disabled:text-ink/30 px-2"
          >
            <RefreshCw size={14} className={status === 'syncing' ? 'animate-spin' : ''} />
            {status === 'syncing' ? 'Syncing' : 'Sync now'}
          </button>
        </form>

        <p className="text-xs mt-2 text-ink/50">
          {status === 'done' && message}
          {status === 'error' && <span className="text-critical">{message}</span>}
          {status === 'idle' && 'Not synced yet this session.'}
        </p>
      </div>

      <div>
        <h3 className="font-serif text-lg text-ink mb-1">Appearance</h3>
        <p className="text-sm text-ink/60 mb-3">Switch between light and dark, calm-brown-and-green either way.</p>
        <ThemeToggle />
      </div>

      <div>
        <h3 className="font-serif text-lg text-ink mb-1">How priority is calculated</h3>
        <p className="text-sm text-ink/60">
          V = W &times; (1 + D) / H &mdash; syllabus weight, times one plus your incomplete-subtask
          fraction, divided by hours remaining. Overdue tasks are pinned to the top until you mark
          them done or delete them, unless you've turned on that task's Late Penalty toggle, which
          lets its weight decay 10% per day late instead.
        </p>
      </div>
    </div>
  )
}
