const PROGRESS_STORAGE_KEY = 'hubblock-flashcard-progress-v2'
const LEGACY_REVIEW_STORAGE_KEY = 'hubblock-flashcard-review-v1'

export type LeitnerBox = 1 | 2 | 3
export type ReviewAction = 'again' | 'known'

export type FlashcardProgress = {
  version: 2
  boxes: Record<number, LeitnerBox>
  dailyGoal: number
  streak: number
  lastGoalDate: string | null
  studiedCount: number
  studiedDate: string | null
  badges: string[]
}

export type FlashcardLike = { id: number; category: string }

export const BADGE_IDS = ['topic-complete', 'streak-3', 'streak-7', 'know-50'] as const
export type BadgeId = (typeof BADGE_IDS)[number]

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function dateKey(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultProgress(): FlashcardProgress {
  return { version: 2, boxes: {}, dailyGoal: 10, streak: 0, lastGoalDate: null, studiedCount: 0, studiedDate: null, badges: [] }
}

function isFlashcardProgress(value: unknown): value is FlashcardProgress {
  if (!value || typeof value !== 'object') return false
  const progress = value as Record<string, unknown>
  return progress.version === 2 &&
    typeof progress.boxes === 'object' && progress.boxes !== null &&
    (progress.dailyGoal === 5 || progress.dailyGoal === 10 || progress.dailyGoal === 20) &&
    typeof progress.streak === 'number' &&
    Array.isArray(progress.badges)
}

function migrateLegacyBoxes(): Record<number, LeitnerBox> {
  const storage = safeLocalStorage()
  if (!storage) return {}
  try {
    const value: unknown = JSON.parse(storage.getItem(LEGACY_REVIEW_STORAGE_KEY) ?? '{}')
    if (!value || typeof value !== 'object') return {}
    const boxes: Record<number, LeitnerBox> = {}
    for (const [key, status] of Object.entries(value as Record<string, unknown>)) {
      const id = Number(key)
      if (!Number.isInteger(id)) continue
      if (status === 'known') boxes[id] = 3
      else if (status === 'again') boxes[id] = 1
    }
    return boxes
  } catch {
    return {}
  }
}

function renewDay(progress: FlashcardProgress): FlashcardProgress {
  const today = dateKey(0)
  const yesterday = dateKey(-1)
  if (progress.studiedDate === today && (progress.lastGoalDate === null || progress.lastGoalDate >= yesterday)) {
    return progress
  }
  const next: FlashcardProgress = { ...progress, badges: [...progress.badges] }
  if (next.studiedDate !== today) {
    next.studiedCount = 0
    next.studiedDate = today
  }
  if (next.lastGoalDate !== null && next.lastGoalDate < yesterday) {
    next.streak = 0
  }
  return next
}

export function loadProgress(): FlashcardProgress {
  const storage = safeLocalStorage()
  const raw = storage?.getItem(PROGRESS_STORAGE_KEY)
  if (raw === null || raw === undefined) {
    return { ...defaultProgress(), boxes: migrateLegacyBoxes() }
  }
  try {
    const value: unknown = JSON.parse(raw)
    if (isFlashcardProgress(value)) {
      return renewDay({ ...value, boxes: { ...value.boxes }, badges: [...value.badges] })
    }
  } catch {
    // corrupted v2 payload: start fresh instead of resurrecting legacy v1 data
  }
  return renewDay(defaultProgress())
}

export function saveProgress(progress: FlashcardProgress): void {
  const storage = safeLocalStorage()
  if (!storage) return
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // storage unavailable or full: ignore
  }
}

export function getBox(progress: FlashcardProgress, cardId: number): LeitnerBox {
  return progress.boxes[cardId] ?? 1
}

export function applyReview(progress: FlashcardProgress, cardId: number, action: ReviewAction): FlashcardProgress {
  const today = dateKey(0)
  const yesterday = dateKey(-1)
  const next: FlashcardProgress = { ...progress, boxes: { ...progress.boxes }, badges: [...progress.badges] }
  const currentBox = next.boxes[cardId] ?? 1
  next.boxes[cardId] = action === 'again' ? 1 : currentBox >= 3 ? 3 : ((currentBox + 1) as LeitnerBox)
  if (next.studiedDate !== today) {
    next.studiedCount = 0
    next.studiedDate = today
  }
  next.studiedCount += 1
  if (next.studiedCount >= next.dailyGoal && next.lastGoalDate !== today) {
    next.streak = next.lastGoalDate === yesterday ? next.streak + 1 : 1
    next.lastGoalDate = today
  }
  return next
}

export function setDailyGoal(progress: FlashcardProgress, dailyGoal: number): FlashcardProgress {
  if (dailyGoal !== 5 && dailyGoal !== 10 && dailyGoal !== 20) return progress
  return { ...progress, dailyGoal }
}

export function resetProgress(progress: FlashcardProgress): FlashcardProgress {
  return { ...defaultProgress(), dailyGoal: progress.dailyGoal }
}

export function countKnown(progress: FlashcardProgress, cards: FlashcardLike[]): number {
  return cards.filter((card) => progress.boxes[card.id] === 3).length
}

export function checkBadges(progress: FlashcardProgress, cards: FlashcardLike[]): BadgeId[] {
  const earned: BadgeId[] = []
  if (countKnown(progress, cards) >= 50) earned.push('know-50')
  if (progress.streak >= 3) earned.push('streak-3')
  if (progress.streak >= 7) earned.push('streak-7')
  const byCategory = new Map<string, FlashcardLike[]>()
  cards.forEach((card) => {
    const list = byCategory.get(card.category)
    if (list) list.push(card)
    else byCategory.set(card.category, [card])
  })
  for (const categoryCards of byCategory.values()) {
    if (categoryCards.length > 0 && categoryCards.every((card) => progress.boxes[card.id] === 3)) {
      earned.push('topic-complete')
      break
    }
  }
  return earned
}

export function earnNewBadges(progress: FlashcardProgress, cards: FlashcardLike[]): { progress: FlashcardProgress; newly: BadgeId[] } {
  const met = checkBadges(progress, cards)
  const newly = met.filter((badge) => !progress.badges.includes(badge))
  if (newly.length === 0) return { progress, newly }
  return { progress: { ...progress, badges: [...progress.badges, ...newly] }, newly }
}
