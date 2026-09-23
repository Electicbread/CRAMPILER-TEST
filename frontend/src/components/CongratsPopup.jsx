import { useEffect } from 'react'
import { PartyPopper, X } from 'lucide-react'

const AUTO_DISMISS_MS = 2500

export default function CongratsPopup({ task, onClose }) {
    useEffect(() => {
        if (!task) return
        const timeout = setTimeout(onClose, AUTO_DISMISS_MS)
        return () => clearTimeout(timeout)
    }, [task, onClose])

    if (!task) return null

    return (
        <div
            className="fixed inset-0 bg-overlay/30 flex items-center justify-center z-[60] px-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-panel border border-forest rounded-md max-w-sm w-full p-6 text-center animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute mt-[-40px] ml-[280px] text-ink/40 hover:text-ink/70" aria-label="Dismiss">
                    <X size={16} />
                </button>
                <PartyPopper size={32} className="text-forest mx-auto mb-3" />
                <h3 className="font-serif text-xl text-ink mb-1">Nice work!</h3>
                <p className="text-sm text-ink/60">You finished &ldquo;{task.title}&rdquo;.</p>
            </div>
        </div>
    )
}