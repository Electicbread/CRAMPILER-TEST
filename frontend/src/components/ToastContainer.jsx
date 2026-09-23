import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { subscribeToast } from '../toast.js'

const TYPE_STYLES = {
    info: 'bg-ink text-paper',
    success: 'bg-forest text-white',
    error: 'bg-critical text-white',
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState([])

    useEffect(() => {
        return subscribeToast((toast) => {
            setToasts((prev) => [...prev, toast])
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }, toast.duration)
        })
    }, [])

    function dismiss(id) {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    if (toasts.length === 0) return null

    return (
        <div className="fixed z-50 bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 flex flex-col gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 rounded-md px-4 py-3 shadow-lg animate-slide-up ${TYPE_STYLES[t.type] || TYPE_STYLES.info}`}
                >
                    <span className="flex-1 text-sm">{t.message}</span>
                    {t.actionLabel && (
                        <button
                            onClick={() => {
                                t.onAction?.()
                                dismiss(t.id)
                            }}
                            className="text-sm font-semibold underline shrink-0"
                        >
                            {t.actionLabel}
                        </button>
                    )}
                    <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 shrink-0" aria-label="Dismiss">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    )
}