import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, X } from 'lucide-react'
import type { ModuleId } from '../Navbar'
import { answerChip } from '../lib/chipEngine'
import { useLanguage } from '../lib/useLanguage'

type ChipMessage = { id: number; role: 'chip' | 'user'; text: string; tab?: ModuleId; suggestions?: string[]; animate?: boolean }

const MODULE_LABELS: Record<ModuleId, { vi: string; en: string }> = {
  home: { vi: 'Home', en: 'Home' },
  hash: { vi: 'SHA-256', en: 'SHA-256' },
  mining: { vi: 'Mining', en: 'Mining' },
  rsa: { vi: 'RSA', en: 'RSA' },
  flashcards: { vi: 'Flashcards', en: 'Flashcards' },
  project: { vi: 'Project', en: 'Project' },
  team: { vi: 'Team', en: 'Team' },
  advanced: { vi: 'Advanced', en: 'Advanced' },
}

const GREETING: Record<'VN' | 'EN', { text: string; suggestions: string[] }> = {
  VN: {
    text: 'Chíp Chíp! Chíp là trợ lý của phòng lab Blockchain. Muốn Chíp giới thiệu một module hay giải thích khái niệm nào?',
    suggestions: [
      'Web này có những phần nào?',
      'Khu Mining làm được gì?',
      'RSA dùng để làm gì?',
      'Flashcards hoạt động ra sao?',
      'Blockchain là gì?',
      'Nonce dùng để làm gì?',
      'Làm sao để đào block trong web?',
      'Web này khác gì blockchain thật?',
    ],
  },
  EN: {
    text: 'Chíp Chíp! I am the assistant of this Blockchain lab. Want me to introduce a module or explain a concept?',
    suggestions: [
      'What sections does this web have?',
      'What can the Mining area do?',
      'What is RSA used for?',
      'How do the Flashcards work?',
      'Blockchain là gì?',
      'Nonce dùng để làm gì?',
      'How do I mine a block in this web?',
      'How is this web different from a real blockchain?',
    ],
  },
}

function TypingText({ text }: { text: string }) {
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState(reducedMotion ? text.length : 0)
  useEffect(() => {
    if (reducedMotion) { setShown(text.length); return }
    setShown(0)
    const stepMs = 20
    const maxMs = 1500
    const interval = Math.min(stepMs, Math.max(4, maxMs / Math.max(1, text.length)))
    let current = 0
    const timer = window.setInterval(() => {
      current += 1
      setShown(current)
      if (current >= text.length) window.clearInterval(timer)
    }, interval)
    return () => window.clearInterval(timer)
  }, [text, reducedMotion])
  return <>{text.slice(0, shown)}</>
}

export default function ChipChip({ onNavigate }: { onNavigate: (tab: ModuleId) => void }) {
  const language = useLanguage()
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [welcomeVisible, setWelcomeVisible] = useState(true)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [messages, setMessages] = useState<ChipMessage[]>([])
  const nextId = useRef(1)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const labels = language === 'VN'
    ? { title: 'Trợ lý Chíp Chíp', placeholder: 'Nhập câu hỏi của bạn…', open: 'Mở tab', ariaOpen: 'Mở trợ lý Chíp Chíp', ariaClose: 'Đóng trợ lý Chíp Chíp', send: 'Gửi' }
    : { title: 'Chíp Chíp assistant', placeholder: 'Type your question…', open: 'Open tab', ariaOpen: 'Open Chíp Chíp assistant', ariaClose: 'Close Chíp Chíp assistant', send: 'Send' }

  useEffect(() => {
    if (!welcomeVisible) return
    const timer = window.setTimeout(() => setWelcomeVisible(false), 5000)
    return () => window.clearTimeout(timer)
  }, [welcomeVisible])

  useEffect(() => {
    if (messages.length) return
    setMessages([{ id: 0, role: 'chip', text: GREETING[language].text, suggestions: GREETING[language].suggestions, animate: false }])
  }, [language, messages.length])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    inputRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [messages, pending])

  async function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed || pending) return
    setInput('')
    setPending(true)
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', text: trimmed }])
    const reply = await answerChip(trimmed, language)
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'chip', text: reply.text, tab: reply.tab, suggestions: reply.suggestions, animate: true }])
    setPending(false)
  }

  return (
    <div className="fixed bottom-5 left-4 z-40 flex flex-col items-start gap-3 sm:bottom-6 sm:left-6">
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={labels.title}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.18 }}
            className="flex h-[min(480px,calc(100dvh-110px))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <ChickIcon size={26} />
                <div>
                  <strong className="block text-xs font-semibold text-slate-100">{labels.title}</strong>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-violet-300">HUB · Blockchain Lab</span>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={labels.ariaClose} className="grid size-8 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 transition hover:border-slate-500 hover:text-slate-100"><X size={15} /></button>
            </header>
            <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 ${message.role === 'user' ? 'bg-violet-500/25 text-slate-100' : 'border border-slate-800 bg-[#0b0f19]/80 text-slate-200'}`}>
                    {message.role === 'chip' && message.animate && !reducedMotion ? <TypingText text={message.text} /> : message.text}
                    {message.role === 'chip' && message.tab && (
                      <button type="button" onClick={() => { onNavigate(message.tab!); setOpen(false) }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-violet-300/30 bg-violet-300/10 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-violet-200 transition hover:bg-violet-300/20">
                        {labels.open} {MODULE_LABELS[message.tab][language === 'VN' ? 'vi' : 'en']}
                      </button>
                    )}
                    {message.suggestions?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {message.suggestions.map((suggestion) => (
                          <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[10px] text-slate-300 transition hover:border-violet-300/40 hover:text-slate-100">{suggestion}</button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {pending && <div className="flex justify-start"><span className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 px-3 py-2 font-mono text-[10px] text-slate-500">{language === 'VN' ? 'Chíp đang nghĩ…' : 'Chíp is thinking…'}</span></div>}
            </div>
            <form
              onSubmit={(event) => { event.preventDefault(); void ask(input) }}
              className="flex items-center gap-2 border-t border-slate-800 px-3 py-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={labels.placeholder}
                aria-label={labels.placeholder}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#0b0f19]/80 px-3 py-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-300/50"
              />
              <button type="submit" aria-label={labels.send} disabled={pending || !input.trim()} className="grid size-9 shrink-0 place-items-center rounded-lg border border-violet-300/30 bg-violet-300/10 text-violet-200 transition enabled:hover:bg-violet-300/20 disabled:opacity-40"><ArrowUp size={16} /></button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {welcomeVisible && !open && (
          <motion.div
            key="chip-welcome"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="relative max-w-[240px] rounded-2xl rounded-bl-sm border border-violet-300/30 bg-slate-900/95 px-3.5 py-2.5 text-xs font-semibold leading-5 text-slate-100 shadow-lg shadow-black/40 backdrop-blur-md"
          >
            {language === 'VN' ? 'Chào người đẹp đã ghé chơi!!!' : 'Hello, thanks for visiting!!!'}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={labels.ariaOpen}
        aria-expanded={open}
        whileTap={{ scale: 0.92 }}
        className="grid size-14 place-items-center rounded-full border border-violet-300/30 bg-slate-900/90 shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-violet-300/60"
      >
        <ChickIcon size={34} />
      </motion.button>
    </div>
  )
}

function ChickIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22" fill="rgba(168,85,247,0.14)" />
      <circle cx="23" cy="26" r="14" fill="#fbbf24" />
      <circle cx="18" cy="16" r="9" fill="#fcd34d" />
      <circle cx="15.5" cy="15" r="2" fill="#0b0f19" />
      <circle cx="16.2" cy="14.4" r="0.7" fill="#ffffff" />
      <path d="M9 16 L4 18.5 L9.5 20 Z" fill="#f97316" />
      <path d="M2.5 21 q3.5 -2.5 6.5 0" stroke="#f97316" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M26 22 q6 1 7 7 q-5 2 -8 -2 Z" fill="#f59e0b" />
      <path d="M14 8 q1.5 -3 3.5 -1" stroke="#fbbf24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M19 7 q1 -2.5 3 -0.5" stroke="#fbbf24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}
