import { useState } from 'react'
import { MessageCircleQuestion, X, Send } from 'lucide-react'
import { api } from '../api.js'

export default function ChatWidget() {
    const [open, setOpen] = useState(false)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! Ask me anything about how CramPiler works." },
    ])
    const [sending, setSending] = useState(false)

    async function send(e) {
        e.preventDefault()
        const text = input.trim()
        if (!text || sending) return

        const history = messages.map((m) => ({ role: m.role, content: m.content }))
        setMessages((prev) => [...prev, { role: 'user', content: text }])
        setInput('')
        setSending(true)
        try {
            const { reply } = await api.sendChatMessage(text, history)
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        } catch (err) {
            setMessages((prev) => [...prev, { role: 'assistant', content: `Something went wrong: ${err.message}` }])
        } finally {
            setSending(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen((v) => !v)}
                className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 bg-forest text-white rounded-full p-3 shadow-lg"
                aria-label="Ask about CramPiler"
            >
                {open ? <X size={20} /> : <MessageCircleQuestion size={20} />}
            </button>

            {open && (
                <div className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-40 w-80 max-w-[calc(100vw-2rem)] h-96 bg-panel border border-line rounded-md shadow-xl flex flex-col animate-scale-in">
                    <div className="px-4 py-3 border-b border-line">
                        <h3 className="font-serif text-sm text-ink">Ask CramPiler</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`text-sm max-w-[85%] px-3 py-2 rounded-md ${m.role === 'user' ? 'bg-forest text-white ml-auto' : 'bg-line/30 text-ink'
                                    }`}
                            >
                                {m.content}
                            </div>
                        ))}
                        {sending && <div className="text-xs text-ink/40">Thinking&hellip;</div>}
                    </div>

                    <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-line">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="How does the priority score work?"
                            className="flex-1 bg-transparent border-b border-line focus:border-forest text-sm px-1 py-1 outline-none"
                        />
                        <button type="submit" disabled={sending} className="text-forest disabled:opacity-40" aria-label="Send">
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </>
    )
}