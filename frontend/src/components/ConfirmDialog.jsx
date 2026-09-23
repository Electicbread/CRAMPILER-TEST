export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-overlay/40 flex items-center justify-center z-50 px-4 animate-fade-in"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="bg-paper border border-line rounded-sm max-w-sm w-full p-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h3 className="font-serif text-lg text-ink mb-1">{title}</h3>
        <p className="text-sm text-ink/70 mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-ink/60 px-3 py-1.5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-sm font-medium text-white bg-critical px-3 py-1.5 rounded-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
