import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpenCheck, CircleAlert, RotateCw, Shuffle, ThumbsDown, ThumbsUp } from 'lucide-react'

type Flashcard = { id: number; category: string; question: string; answer: string }
type ReviewStatus = 'again' | 'known'

const reviewStorageKey = 'hubblock-flashcard-review-v1'

function isFlashcardList(value: unknown): value is Flashcard[] {
  return Array.isArray(value) && value.every((item) => typeof item.id === 'number' && typeof item.category === 'string' && typeof item.question === 'string' && typeof item.answer === 'string')
}

function loadReviewStates(): Record<number, ReviewStatus> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(reviewStorageKey) ?? '{}')
    if (!value || typeof value !== 'object') return {}
    return Object.fromEntries(Object.entries(value).filter(([, status]) => status === 'again' || status === 'known')) as Record<number, ReviewStatus>
  } catch {
    return {}
  }
}

export default function TabFlashcards() {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [category, setCategory] = useState('Tất cả')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffledIds, setShuffledIds] = useState<number[] | null>(null)
  const [reviewStates, setReviewStates] = useState<Record<number, ReviewStatus>>(loadReviewStates)

  useEffect(() => {
    const controller = new AbortController()
    async function loadCards() {
      setLoading(true)
      setLoadError('')
      try {
        const response = await fetch('/flashcards.json', { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data: unknown = await response.json()
        if (!isFlashcardList(data)) throw new Error('Invalid flashcard data')
        setCards(data)
        setIndex(0)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setLoadError('Không tải được public/flashcards.json. Hãy thử tải lại dữ liệu.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadCards()
    return () => controller.abort()
  }, [reloadToken])

  useEffect(() => {
    localStorage.setItem(reviewStorageKey, JSON.stringify(reviewStates))
  }, [reviewStates])

  const categories = useMemo(() => ['Tất cả', ...new Set(cards.map((card) => card.category))], [cards])
  const categoryCards = useMemo(() => category === 'Tất cả' ? cards : cards.filter((card) => card.category === category), [cards, category])
  const deck = useMemo(() => {
    if (!shuffledIds) return categoryCards
    const byId = new Map(categoryCards.map((card) => [card.id, card]))
    return shuffledIds.map((id) => byId.get(id)).filter((card): card is Flashcard => Boolean(card))
  }, [categoryCards, shuffledIds])
  const current = deck[index]
  const reviewedCount = cards.filter((card) => reviewStates[card.id]).length

  function selectCategory(value: string) {
    setCategory(value)
    setIndex(0)
    setFlipped(false)
    setShuffledIds(null)
  }

  function move(direction: number) {
    setIndex((currentIndex) => (currentIndex + direction + deck.length) % deck.length)
    setFlipped(false)
  }

  function randomCard() {
    const shuffled = [...categoryCards]
    for (let currentIndex = shuffled.length - 1; currentIndex > 0; currentIndex -= 1) {
      const randomIndex = Math.floor(Math.random() * (currentIndex + 1))
      ;[shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]]
    }
    setShuffledIds(shuffled.map((card) => card.id))
    setIndex(0)
    setFlipped(false)
  }

  function review(status: ReviewStatus) {
    if (!current) return
    setReviewStates((previous) => ({ ...previous, [current.id]: status }))
  }

  if (loading) return <div className="grid min-h-[360px] place-items-center rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md"><div className="flex items-center gap-3 text-xs text-slate-300"><RotateCw size={16} className="animate-spin text-emerald-300" />Đang tải bộ câu hỏi...</div></div>
  if (loadError) return <section role="alert" className="rounded-2xl border border-rose-400/20 bg-slate-900/90 p-6 text-center backdrop-blur-md"><CircleAlert size={22} className="mx-auto text-rose-300" /><p className="mt-3 text-xs text-rose-100">{loadError}</p><button type="button" onClick={() => setReloadToken((value) => value + 1)} className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-[10px] text-slate-200 transition hover:border-slate-500">Tải lại</button></section>
  if (!current) return <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center text-xs text-slate-400">Chưa có câu hỏi trong chủ đề này.</section>

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-emerald-300"><BookOpenCheck size={16} /><span className="font-mono text-[9px] uppercase tracking-[0.12em]">Blockchain knowledge deck</span></div><h3 className="mt-2 text-sm font-semibold text-slate-100">Flashcards</h3><p className="mt-1 text-[10px] text-slate-400">{cards.length} câu hỏi · Đã đánh giá {reviewedCount}/{cards.length} thẻ</p></div><label><span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">Lọc chủ đề</span><select value={category} onChange={(event) => selectCategory(event.target.value)} className="h-9 min-w-40 rounded-lg border border-slate-800 bg-[#0b0f19] px-3 text-[10px] text-slate-200 outline-none focus:border-emerald-300/40">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div><div className="mt-5"><div className="mb-2 flex items-center justify-between font-mono text-[9px] text-slate-400"><span>Thẻ {index + 1} / {deck.length}</span><span>{Math.round(((index + 1) / deck.length) * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><motion.div className="h-full rounded-full bg-emerald-300" animate={{ width: `${((index + 1) / deck.length) * 100}%` }} transition={{ duration: 0.25 }} /></div></div></section>

      <div className="[perspective:1200px]"><motion.div role="button" tabIndex={0} aria-label={flipped ? 'Thẻ đã lật, bấm để xem câu hỏi' : 'Bấm thẻ để lật xem đáp án'} onClick={() => setFlipped((value) => !value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFlipped((value) => !value) } }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55, ease: [0.2, 0.75, 0.25, 1] }} style={{ transformStyle: 'preserve-3d' }} className="relative min-h-[320px] w-full cursor-pointer sm:min-h-[380px]">
        <article aria-hidden={flipped} style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md transition hover:border-emerald-300/35 sm:p-10"><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-emerald-200">{current.category}</span><span className="font-mono text-[9px] text-slate-500">ID {String(current.id).padStart(2, '0')}</span></div><div className="flex flex-1 flex-col justify-center py-8"><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500">Câu hỏi</span><p className="mt-4 max-w-3xl text-xl font-medium leading-relaxed text-slate-100 sm:text-2xl">{current.question}</p></div><span className="inline-flex items-center gap-2 text-[9px] text-slate-500"><RotateCw size={12} />Nhấp thẻ hoặc dùng nút “Lật xem đáp án”</span></article>
        <article aria-hidden={!flipped} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 flex flex-col rounded-2xl border border-emerald-300/25 bg-slate-900/95 p-6 shadow-xl backdrop-blur-md sm:p-10"><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-emerald-200">{current.category}</span><span className="font-mono text-[9px] text-emerald-300">ĐÁP ÁN</span></div><div className="flex flex-1 flex-col justify-center py-8"><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500">Giải thích</span><p className="mt-4 max-w-3xl text-base leading-7 text-slate-100 sm:text-lg">{current.answer}</p></div><span className="inline-flex items-center gap-2 text-[9px] text-slate-500"><RotateCw size={12} />Nhấp thẻ để quay lại câu hỏi</span></article>
      </motion.div></div>

      <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => move(-1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 text-[10px] font-semibold text-slate-200 transition hover:border-slate-600"><ArrowLeft size={14} />Thẻ trước</button><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={randomCard} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 text-[10px] font-semibold text-slate-200 transition hover:border-slate-600"><Shuffle size={13} />Xáo trộn</button><button type="button" aria-pressed={reviewStates[current.id] === 'again'} onClick={() => review('again')} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-[9px] font-semibold transition ${reviewStates[current.id] === 'again' ? 'border-rose-400/40 bg-rose-400/[0.12] text-rose-100' : 'border-rose-400/20 bg-rose-400/[0.04] text-rose-200 hover:border-rose-400/40'}`}><ThumbsDown size={12} />Cần học lại</button><button type="button" aria-pressed={reviewStates[current.id] === 'known'} onClick={() => review('known')} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-[9px] font-semibold transition ${reviewStates[current.id] === 'known' ? 'border-emerald-300/40 bg-emerald-300/[0.12] text-emerald-100' : 'border-emerald-300/20 bg-emerald-300/[0.04] text-emerald-200 hover:border-emerald-300/40'}`}><ThumbsUp size={12} />Đã thuộc</button></div><button type="button" onClick={() => move(1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 text-[10px] font-semibold text-slate-200 transition hover:border-slate-600">Thẻ tiếp theo<ArrowRight size={14} /></button></div>
    </div>
  )
}