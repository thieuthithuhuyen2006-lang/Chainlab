import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import type { ModuleId } from '../Navbar'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ArrowRight, Award, BookOpenCheck, CalendarCheck, Check, CircleAlert, Flame, Layers, RotateCcw, RotateCw, Shuffle, Target, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useBi, useLanguage } from '../lib/useLanguage'
import { playSound } from '../lib/sound'
import { translations, type TranslationKey } from '../lib/i18n'
import { applyReview, countKnown, earnNewBadges, getBox, loadProgress, resetProgress, saveProgress, setDailyGoal, type BadgeId, type FlashcardProgress } from '../lib/flashcardProgress'

type Flashcard = { id: number; category: string; question: string; answer: string; level?: 'basic' | 'intermediate' | 'advanced' }
type ReviewStatus = 'again' | 'known'
type LevelFilter = 'all' | 'basic' | 'intermediate' | 'advanced'

function isFlashcardList(value: unknown): value is Flashcard[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item.id === 'number' &&
    typeof item.category === 'string' &&
    typeof item.question === 'string' &&
    typeof item.answer === 'string' &&
    (item.level === undefined || ['basic', 'intermediate', 'advanced'].includes(item.level))
  )
}

function getCardLevel(card: Flashcard): LevelFilter {
  return card.level ?? 'basic'
}

function fillTemplate(template: string, vars: Record<string, number | string>): string {
  return Object.entries(vars).reduce((result, [key, value]) => result.replace(`{${key}}`, String(value)), template)
}

const levelFilterOptions: LevelFilter[] = ['all', 'basic', 'intermediate', 'advanced']

const levelLabels: Record<LevelFilter, TranslationKey> = {
  all: 'fcLevelAll',
  basic: 'fcLevelBasic',
  intermediate: 'fcLevelIntermediate',
  advanced: 'fcLevelAdvanced',
}

const badgeLabelKeys: Record<BadgeId, TranslationKey> = {
  'topic-complete': 'fcBadgeTopicComplete',
  'streak-3': 'fcBadgeStreak3',
  'streak-7': 'fcBadgeStreak7',
  'know-50': 'fcBadgeKnow50',
}

const badgeDefs: { id: BadgeId; labelKey: TranslationKey; icon: LucideIcon }[] = [
  { id: 'topic-complete', labelKey: 'fcBadgeTopicComplete', icon: BookOpenCheck },
  { id: 'streak-3', labelKey: 'fcBadgeStreak3', icon: Flame },
  { id: 'streak-7', labelKey: 'fcBadgeStreak7', icon: Flame },
  { id: 'know-50', labelKey: 'fcBadgeKnow50', icon: Target },
]

const dailyGoalOptions = [5, 10, 20]

export default function TabFlashcards({ onNavigate }: { onNavigate: (tab: ModuleId) => void }) {
  const b = useBi()
  const language = useLanguage()
  const t = (key: TranslationKey) => translations[language][key]

  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [category, setCategory] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [viewMode, setViewMode] = useState<'topics' | 'study'>('topics')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffledIds, setShuffledIds] = useState<number[] | null>(null)
  const [progress, setProgress] = useState<FlashcardProgress>(loadProgress)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: 'badge' | 'info' }[]>([])
  const toastIdRef = useRef(0)
  const seenBadgesRef = useRef<string[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadCards() {
      setLoading(true)
      setLoadError('')
      try {
        const extraFiles = [
          `${import.meta.env.BASE_URL}flashcards-extra-1.json`,
          `${import.meta.env.BASE_URL}flashcards-extra-2.json`,
          `${import.meta.env.BASE_URL}flashcards-extra-3.json`,
          `${import.meta.env.BASE_URL}flashcards-extra-4.json`,
          `${import.meta.env.BASE_URL}flashcards-extra-5.json`,
          `${import.meta.env.BASE_URL}flashcards-extra-6.json`,
        ]
        const responses = await Promise.allSettled(
          extraFiles.map((file) => fetch(file, { signal: controller.signal }))
        )
        const extraCards: Flashcard[] = []
        for (let i = 0; i < responses.length; i++) {
          const result = responses[i]
          if (result.status === 'fulfilled' && result.value.ok) {
            const data: unknown = await result.value.json()
            if (isFlashcardList(data)) {
              extraCards.push(...data)
            }
          }
        }
        const response = await fetch(`${import.meta.env.BASE_URL}flashcards.json`, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const baseData: unknown = await response.json()
        if (!isFlashcardList(baseData)) throw new Error('Invalid flashcard data')
        const allCards = [...baseData, ...extraCards]
        setCards(allCards)
        setProgress((previous) => earnNewBadges(previous, allCards).progress)
        setIndex(0)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setLoadError('flashcards_load_failed')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadCards()
    return () => controller.abort()
  }, [reloadToken])

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  function pushToast(message: string, tone: 'badge' | 'info') {
    const id = (toastIdRef.current += 1)
    setToasts((previous) => [...previous.slice(-2), { id, message, tone }])
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id))
    }, 3200)
  }

  useEffect(() => {
    const seen = seenBadgesRef.current
    if (seen === null) {
      seenBadgesRef.current = progress.badges
      return
    }
    const newly = progress.badges.filter((badge): badge is BadgeId => !seen.includes(badge))
    seenBadgesRef.current = progress.badges
    newly.forEach((badge) => {
      playSound('success')
      pushToast(fillTemplate(t('fcToastBadge'), { badge: t(badgeLabelKeys[badge]) }), 'badge')
    })
  })

  const allCategories = useMemo(() => [...new Set(cards.map((card) => card.category))].sort(), [cards])

  const filteredCards = useMemo(() => {
    let result = cards
    if (category !== 'all') {
      result = result.filter((card) => card.category === category)
    }
    if (levelFilter !== 'all') {
      result = result.filter((card) => getCardLevel(card) === levelFilter)
    }
    return result
  }, [cards, category, levelFilter])

  const topicStats = useMemo(() => {
    const stats: Record<string, { total: number; known: number }> = {}
    cards.forEach((card) => {
      const cat = card.category
      if (!stats[cat]) stats[cat] = { total: 0, known: 0 }
      stats[cat].total++
      if (progress.boxes[card.id] === 3) stats[cat].known++
    })
    return stats
  }, [cards, progress])

  const categoryCards = useMemo(() => filteredCards, [filteredCards])
  const deck = useMemo(() => {
    if (!shuffledIds) return categoryCards
    const byId = new Map(categoryCards.map((card) => [card.id, card]))
    return shuffledIds.map((id) => byId.get(id)).filter((card): card is Flashcard => Boolean(card))
  }, [categoryCards, shuffledIds])
  const current = deck[index]
  const reviewedCount = cards.filter((card) => progress.boxes[card.id] !== undefined).length
  const knownCount = countKnown(progress, cards)

  function selectCategory(value: string) {
    setCategory(value)
    setViewMode('study')
    setIndex(0)
    setFlipped(false)
    setShuffledIds(null)
  }

  function setLevelFilterAndReset(value: LevelFilter) {
    setLevelFilter(value)
    setIndex(0)
    setFlipped(false)
    setShuffledIds(null)
  }

  function goBackToTopics() {
    setViewMode('topics')
    setCategory('all')
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
    playSound(status === 'again' ? 'undo' : 'verified')
    const cardId = current.id
    setProgress((previous) => earnNewBadges(applyReview(previous, cardId, status), cards).progress)
  }

  function reviewToday() {
    const prioritized = [...categoryCards]
      .sort((a, b) => getBox(progress, a.id) - getBox(progress, b.id) || a.id - b.id)
      .slice(0, 10)
    setShuffledIds(prioritized.map((card) => card.id))
    setIndex(0)
    setFlipped(false)
  }

  function doResetProgress() {
    setProgress((previous) => resetProgress(previous))
    setResetConfirm(false)
    pushToast(t('fcResetDone'), 'info')
  }

  const badgesStrip = (
    <section aria-label={t('fcBadges')} className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500 data-[theme=light]:text-slate-600">{t('fcBadges')}</span>
      {badgeDefs.map(({ id, labelKey, icon: BadgeIcon }) => {
        const earned = progress.badges.includes(id)
        return (
          <span key={id} title={t(labelKey)} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] transition ${earned ? 'border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200 data-[theme=light]:border-emerald-400/40 data-[theme=light]:text-emerald-700' : 'border-slate-800 bg-slate-900/80 text-slate-500 data-[theme=light]:border-slate-300 data-[theme=light]:bg-white/80 data-[theme=light]:text-slate-400'}`}>
            <BadgeIcon size={11} className={earned ? 'text-emerald-300 data-[theme=light]:text-emerald-600' : 'text-slate-600 data-[theme=light]:text-slate-400'} />
            {t(labelKey)}
          </span>
        )
      })}
    </section>
  )

  const toastContainer = (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }} className="pointer-events-auto flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-md data-[theme=light]:border-emerald-400/40 data-[theme=light]:bg-white/95">
            {toast.tone === 'badge' ? <Award size={13} className="shrink-0 text-emerald-300 data-[theme=light]:text-emerald-600" /> : <Check size={13} className="shrink-0 text-emerald-300 data-[theme=light]:text-emerald-600" />}
            <span className="text-[10px] font-semibold text-emerald-200 data-[theme=light]:text-emerald-700">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  if (loading) return <div className="grid min-h-[360px] place-items-center rounded-2xl border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/90 data-[theme=light]:bg-white/90 backdrop-blur-md"><div className="flex items-center gap-3 text-xs text-slate-300 data-[theme=light]:text-slate-700"><RotateCw size={16} className="animate-spin text-emerald-300 data-[theme=light]:text-emerald-700" />{b('Đang tải bộ câu hỏi...', 'Loading flashcards...')}</div></div>
  if (loadError) return <section role="alert" className="rounded-2xl border border-rose-400/20 bg-slate-900/90 data-[theme=light]:bg-white/90 p-6 text-center backdrop-blur-md"><CircleAlert size={22} className="mx-auto text-rose-300" /><p className="mt-3 text-xs text-rose-100 data-[theme=light]:text-rose-700">{b('Không tải được public/flashcards.json. Hãy thử tải lại dữ liệu.', 'Could not load public/flashcards.json. Please try reloading the data.')}</p><button type="button" onClick={() => setReloadToken((value) => value + 1)} className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-[10px] text-slate-200 data-[theme=light]:text-slate-800 transition hover:border-slate-500">{b('Tải lại', 'Reload')}</button></section>
  if (viewMode === 'topics') {
    const overallTotal = cards.length
    const overallPercent = overallTotal > 0 ? Math.round((knownCount / overallTotal) * 100) : 0
    return (
      <MotionConfig reducedMotion="user">
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="rounded-2xl border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/90 data-[theme=light]:bg-white/90 p-5 shadow-xl backdrop-blur-md sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 data-[theme=light]:text-emerald-700"><BookOpenCheck size={16} /><span className="font-mono text-[9px] uppercase tracking-[0.12em]">Blockchain knowledge deck</span></div>
                <h3 className="mt-2 text-sm font-semibold text-slate-100 data-[theme=light]:text-slate-900">Flashcards</h3>
                <p className="mt-1 text-[10px] text-slate-400 data-[theme=light]:text-slate-500">{t('fcSelectTopic')} · <span className="font-mono text-emerald-300/90 data-[theme=light]:text-emerald-600">{t('fcKnown')} {knownCount}/{overallTotal} ({overallPercent}%)</span></p>
              </div>
              <button type="button" onClick={() => onNavigate('home')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/80 data-[theme=light]:bg-white/90 px-3 text-[10px] font-semibold text-slate-200 data-[theme=light]:text-slate-800 transition hover:border-slate-600 data-[theme=light]:hover:border-slate-400"><ArrowLeft size={13} />{t('fcBack')}</button>
            </div>
          </section>

          {badgesStrip}

          <section aria-label={t('fcTopicGridTitle')}>
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 data-[theme=light]:text-slate-600">{t('fcTopicGridTitle')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <motion.button type="button" onClick={() => selectCategory('all')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="group relative overflow-hidden rounded-xl border border-violet-300/30 bg-violet-500/[0.08] p-4 text-left shadow-xl backdrop-blur-md transition hover:border-violet-300/50 hover:bg-violet-500/[0.12]">
                <div className="flex items-center justify-between gap-2"><span className="grid size-8 place-items-center rounded-lg border border-violet-300/25 bg-violet-300/[0.08] text-violet-200 data-[theme=light]:text-violet-600"><Layers size={15} /></span><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-violet-300 data-[theme=light]:text-violet-600">{t('fcAllTopics')}</span></div>
                <strong className="mt-3 block text-sm font-semibold text-slate-100 data-[theme=light]:text-slate-900">{fillTemplate(t('fcCardsCount'), { count: overallTotal })}</strong>
                <span className="mt-1 block font-mono text-[9px] text-slate-400 data-[theme=light]:text-slate-500">{t('fcKnown')} {knownCount}/{overallTotal}</span>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800 data-[theme=light]:bg-slate-200"><div className="h-full rounded-full bg-emerald-300 data-[theme=light]:bg-emerald-500" style={{ width: `${overallPercent}%` }} /></div>
              </motion.button>
              {allCategories.map((name, position) => {
                const stat = topicStats[name] ?? { total: 0, known: 0 }
                const percent = stat.total > 0 ? Math.round((stat.known / stat.total) * 100) : 0
                return (
                  <motion.button key={name} type="button" onClick={() => selectCategory(name)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(position * 0.03, 0.3) }} className="group relative overflow-hidden rounded-xl border border-purple-900/40 data-[theme=light]:border-purple-400/50 bg-slate-900/90 data-[theme=light]:bg-white/90 p-4 text-left shadow-xl backdrop-blur-md transition hover:border-violet-300/40 hover:bg-violet-500/[0.06]">
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-[8px] text-slate-600 data-[theme=light]:text-slate-400">0{position + 1}</span><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500 data-[theme=light]:text-slate-600">{fillTemplate(t('fcCardsCount'), { count: stat.total })}</span></div>
                    <strong className="mt-2 block text-sm font-semibold leading-5 text-slate-100 data-[theme=light]:text-slate-900">{name}</strong>
                    <span className="mt-1 block font-mono text-[9px] text-slate-400 data-[theme=light]:text-slate-500">{t('fcKnown')} {stat.known}/{stat.total}</span>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800 data-[theme=light]:bg-slate-200"><div className="h-full rounded-full bg-emerald-300 data-[theme=light]:bg-emerald-500" style={{ width: `${percent}%` }} /></div>
                  </motion.button>
                )
              })}
            </div>
          </section>
        </div>
        {toastContainer}
      </MotionConfig>
    )
  }
  const currentTopicStat = category === 'all' ? { total: cards.length, known: knownCount } : topicStats[category] ?? { total: 0, known: 0 }

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-2xl border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/90 data-[theme=light]:bg-white/90 p-5 shadow-xl backdrop-blur-md sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-emerald-300 data-[theme=light]:text-emerald-700"><BookOpenCheck size={16} /><span className="font-mono text-[9px] uppercase tracking-[0.12em]">Blockchain knowledge deck</span></div><h3 className="mt-2 text-sm font-semibold text-slate-100 data-[theme=light]:text-slate-900">Flashcards</h3><p className="mt-1 text-[10px] text-slate-400 data-[theme=light]:text-slate-500">{b(`${cards.length} câu hỏi · Đã đánh giá ${reviewedCount}/${cards.length} thẻ`, `${cards.length} cards · Reviewed ${reviewedCount}/${cards.length} cards`)} · <span className="font-mono text-emerald-300/90 data-[theme=light]:text-emerald-600">{fillTemplate(t('fcProgress'), { known: currentTopicStat.known, total: currentTopicStat.total })}</span></p></div><div className="flex flex-wrap items-end gap-3"><button type="button" onClick={goBackToTopics} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/80 data-[theme=light]:bg-white/90 px-3 text-[10px] font-semibold text-slate-200 data-[theme=light]:text-slate-800 transition hover:border-slate-600 data-[theme=light]:hover:border-slate-400"><ArrowLeft size={13} />{t('fcBackToTopics')}</button><label><span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500 data-[theme=light]:text-slate-600">{b('Lọc chủ đề', 'Filter topic')}</span><select value={category} onChange={(event) => selectCategory(event.target.value)} className="h-9 min-w-40 rounded-lg border border-slate-800 data-[theme=light]:border-slate-300 bg-[#0b0f19] data-[theme=light]:bg-white px-3 text-[10px] text-slate-200 data-[theme=light]:text-slate-800 outline-none focus:border-emerald-300/40">{allCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div role="group" aria-label={t('fcLevelFilter')}><span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500 data-[theme=light]:text-slate-600">{t('fcLevelFilter')}</span><div className="flex flex-wrap items-center gap-1.5">{levelFilterOptions.map((value) => <button key={value} type="button" onClick={() => setLevelFilterAndReset(value)} aria-pressed={levelFilter === value} className={`h-9 rounded-lg border px-2.5 text-[9px] font-semibold transition ${levelFilter === value ? 'border-emerald-300/40 bg-emerald-300/[0.12] text-emerald-100 data-[theme=light]:text-emerald-700' : 'border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/80 data-[theme=light]:bg-white/90 text-slate-300 data-[theme=light]:text-slate-700 hover:border-slate-600 data-[theme=light]:hover:border-slate-400'}`}>{t(levelLabels[value])}</button>)}</div></div></div></div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3"><div role="group" aria-label={t('fcDailyGoal')}><span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500 data-[theme=light]:text-slate-600">{t('fcDailyGoal')}</span><div className="flex items-center gap-1.5">{dailyGoalOptions.map((goal) => <button key={goal} type="button" onClick={() => setProgress((previous) => setDailyGoal(previous, goal))} aria-pressed={progress.dailyGoal === goal} className={`h-8 rounded-lg border px-2.5 font-mono text-[9px] font-semibold transition ${progress.dailyGoal === goal ? 'border-emerald-300/40 bg-emerald-300/[0.12] text-emerald-100 data-[theme=light]:text-emerald-700' : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600 data-[theme=light]:border-slate-300 data-[theme=light]:bg-white/90 data-[theme=light]:text-slate-700 data-[theme=light]:hover:border-slate-400'}`}>{goal}</button>)}</div></div><span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-2.5 font-mono text-[9px] font-semibold text-amber-200 data-[theme=light]:border-amber-400/40 data-[theme=light]:text-amber-700" title={fillTemplate(t('fcStreak'), { count: progress.streak })}>🔥 {progress.streak}</span><div className="min-w-44 flex-1"><div className="mb-1 flex items-center justify-between font-mono text-[9px] text-slate-400 data-[theme=light]:text-slate-500"><span>{fillTemplate(t('fcTodayProgress'), { count: progress.studiedCount, goal: progress.dailyGoal })}</span><span>{progress.dailyGoal > 0 ? Math.min(100, Math.round((progress.studiedCount / progress.dailyGoal) * 100)) : 0}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800 data-[theme=light]:bg-slate-200"><div className="h-full rounded-full bg-emerald-300 data-[theme=light]:bg-emerald-500" style={{ width: `${progress.dailyGoal > 0 ? Math.min(100, (progress.studiedCount / progress.dailyGoal) * 100) : 0}%` }} /></div></div><div className="relative">{resetConfirm ? (<div role="alertdialog" aria-label={t('fcResetConfirmTitle')} className="absolute right-0 top-9 z-20 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md data-[theme=light]:border-slate-300 data-[theme=light]:bg-white/95"><strong className="block text-xs font-semibold text-slate-100 data-[theme=light]:text-slate-900">{t('fcResetConfirmTitle')}</strong><p className="mt-1.5 text-[10px] leading-5 text-slate-400 data-[theme=light]:text-slate-500">{t('fcResetConfirmDesc')}</p><div className="mt-3 flex gap-2"><button type="button" onClick={doResetProgress} className="h-8 flex-1 rounded-lg border border-rose-400/40 bg-rose-400/[0.12] px-2 text-[9px] font-semibold text-rose-100 transition hover:border-rose-400/60 data-[theme=light]:border-rose-400/50 data-[theme=light]:text-rose-700">{t('fcResetConfirmAction')}</button><button type="button" onClick={() => setResetConfirm(false)} className="h-8 flex-1 rounded-lg border border-slate-700 bg-slate-800/70 px-2 text-[9px] font-semibold text-slate-300 transition hover:border-slate-500 data-[theme=light]:border-slate-300 data-[theme=light]:bg-white data-[theme=light]:text-slate-700">{t('fcResetCancel')}</button></div></div>) : (<button type="button" onClick={() => setResetConfirm(true)} className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 text-[9px] font-semibold text-slate-300 transition hover:border-slate-600 data-[theme=light]:border-slate-300 data-[theme=light]:bg-white/90 data-[theme=light]:text-slate-700 data-[theme=light]:hover:border-slate-400"><RotateCcw size={12} />{t('fcResetProgress')}</button>)}</div></div>
              <div className="mt-5"><div className="mb-2 flex items-center justify-between font-mono text-[9px] text-slate-400 data-[theme=light]:text-slate-500"><span>{b(`Thẻ ${index + 1} / ${deck.length}`, `Card ${index + 1} / ${deck.length}`)}</span><span>{Math.round(((index + 1) / deck.length) * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800 data-[theme=light]:bg-slate-200"><motion.div className="h-full rounded-full bg-emerald-300 data-[theme=light]:bg-emerald-500" animate={{ width: `${((index + 1) / deck.length) * 100}%` }} transition={{ duration: 0.25 }} /></div></div></section>

      {badgesStrip}

      {current ? (<><div className="[perspective:1200px]"><motion.div role="button" tabIndex={0} aria-label={flipped ? b('Thẻ đã lật, bấm để xem câu hỏi', 'Card flipped, press to view the question') : b('Bấm thẻ để lật xem đáp án', 'Press the card to flip and reveal the answer')} onClick={() => setFlipped((value) => !value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFlipped((value) => !value) } }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55, ease: [0.2, 0.75, 0.25, 1] }} style={{ transformStyle: 'preserve-3d' }} className="relative min-h-[320px] w-full cursor-pointer sm:min-h-[380px]">
        <article aria-hidden={flipped} style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 flex flex-col rounded-2xl border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/90 data-[theme=light]:bg-white/90 p-6 shadow-xl backdrop-blur-md transition hover:border-emerald-300/35 sm:p-10"><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-emerald-200 data-[theme=light]:text-emerald-700">{current.category}</span><span className="font-mono text-[9px] text-slate-500 data-[theme=light]:text-slate-600">ID {String(current.id).padStart(2, '0')}</span></div><div className="flex flex-1 flex-col justify-center py-8"><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500 data-[theme=light]:text-slate-600">{b('Câu hỏi', 'Question')}</span><p className="mt-4 max-w-3xl text-xl font-medium leading-relaxed text-slate-100 data-[theme=light]:text-slate-900 sm:text-2xl">{current.question}</p></div><span className="inline-flex items-center gap-2 text-[9px] text-slate-500 data-[theme=light]:text-slate-600"><RotateCw size={12} />{b('Nhấp thẻ hoặc dùng nút “Lật xem đáp án”', 'Tap the card or use the “Reveal answer” button')}</span></article>
        <article aria-hidden={!flipped} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 flex flex-col rounded-2xl border border-emerald-300/25 bg-slate-900/95 data-[theme=light]:bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-10"><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-emerald-200 data-[theme=light]:text-emerald-700">{current.category}</span><span className="font-mono text-[9px] text-emerald-300 data-[theme=light]:text-emerald-700">{b('ĐÁP ÁN', 'ANSWER')}</span></div><div className="flex flex-1 flex-col justify-center py-8"><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500 data-[theme=light]:text-slate-600">{b('Giải thích', 'Explanation')}</span><p className="mt-4 max-w-3xl text-base leading-7 text-slate-100 data-[theme=light]:text-slate-900 sm:text-lg">{current.answer}</p></div><span className="inline-flex items-center gap-2 text-[9px] text-slate-500 data-[theme=light]:text-slate-600"><RotateCw size={12} />{b('Nhấp thẻ để quay lại câu hỏi', 'Tap the card to return to the question')}</span></article>
      </motion.div></div>

      <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => move(-1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/80 data-[theme=light]:bg-white/90 px-4 text-[10px] font-semibold text-slate-200 data-[theme=light]:text-slate-800 transition hover:border-slate-600 data-[theme=light]:hover:border-slate-400"><ArrowLeft size={14} />{b('Thẻ trước', 'Previous card')}</button><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={reviewToday} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/80 data-[theme=light]:bg-white/90 px-4 text-[10px] font-semibold text-slate-200 data-[theme=light]:text-slate-800 transition hover:border-slate-600 data-[theme=light]:hover:border-slate-400"><CalendarCheck size={13} />{t('fcReviewToday')}</button><button type="button" onClick={randomCard} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/80 data-[theme=light]:bg-white/90 px-4 text-[10px] font-semibold text-slate-200 data-[theme=light]:text-slate-800 transition hover:border-slate-600 data-[theme=light]:hover:border-slate-400"><Shuffle size={13} />{b('Xáo trộn', 'Shuffle')}</button><button type="button" aria-pressed={progress.boxes[current.id] === 1} onClick={() => review('again')} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-[9px] font-semibold transition ${progress.boxes[current.id] === 1 ? 'border-rose-400/40 bg-rose-400/[0.12] text-rose-100 data-[theme=light]:text-rose-700' : 'border-rose-400/20 bg-rose-400/[0.04] text-rose-200 data-[theme=light]:text-rose-600 hover:border-rose-400/40'}`}><ThumbsDown size={12} />{b('Cần học lại', 'Needs review')}</button><button type="button" aria-pressed={progress.boxes[current.id] === 3} onClick={() => review('known')} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-[9px] font-semibold transition ${progress.boxes[current.id] === 3 ? 'border-emerald-300/40 bg-emerald-300/[0.12] text-emerald-100 data-[theme=light]:text-emerald-700' : 'border-emerald-300/20 bg-emerald-300/[0.04] text-emerald-200 data-[theme=light]:text-emerald-700 hover:border-emerald-300/40'}`}><ThumbsUp size={12} />{b('Đã thuộc', 'Known')}</button></div><button type="button" onClick={() => move(1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/80 data-[theme=light]:bg-white/90 px-4 text-[10px] font-semibold text-slate-200 data-[theme=light]:text-slate-800 transition hover:border-slate-600 data-[theme=light]:hover:border-slate-400">{b('Thẻ tiếp theo', 'Next card')}<ArrowRight size={14} /></button></div></>) : (<section className="rounded-2xl border border-slate-800 data-[theme=light]:border-slate-300 bg-slate-900/90 data-[theme=light]:bg-white/90 p-8 text-center backdrop-blur-md"><CircleAlert size={20} className="mx-auto text-slate-500 data-[theme=light]:text-slate-600" /><p className="mt-3 text-xs text-slate-400 data-[theme=light]:text-slate-500">{t('fcNoMatchingCards')}</p></section>)}
    </div>
    {toastContainer}
    </MotionConfig>
  )
}