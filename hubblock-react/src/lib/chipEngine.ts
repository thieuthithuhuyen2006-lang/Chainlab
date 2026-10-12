import type { ModuleId } from '../Navbar'
import { chipWebEntries, loadChipCards, type ChipEntry } from './chipKnowledge.ts'

export type ChipReply = {
  text: string
  tab?: ModuleId
  suggestions: string[]
  known: boolean
}

export function normalizeVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalizeVietnamese(text).split(' ').filter((token) => token.length >= 3)
}

const STOPWORDS = new Set([
  'va', 'thi', 'la', 'co', 'khong', 'cua', 'cho', 've', 'duoc', 'can', 'nen', 'toi', 'ban', 'chung', 'minh',
  'nay', 'nao', 'hom', 'luc', 'lam', 'dang', 'da', 'se', 'du', 'ai', 'giup', 'huong', 'dan', 'tai', 'sao',
  'bao', 'nhieu', 'trong', 'ngoai', 'de', 'den', 'voi', 'hay', 'hoi', 'muon', 'gio', 'jay', 'day', 'ay', 'no',
  'a', 'an', 'the', 'and', 'to', 'of', 'on', 'is', 'are', 'what', 'how', 'do', 'does', 'this', 'that', 'there',
  'here', 'can', 'you', 'your', 'i', 'we', 'for', 'with', 'about', 'will', 'would',
])

function contentTokens(text: string): string[] {
  return tokenize(text).filter((token) => !STOPWORDS.has(token))
}

let knowledgePromise: Promise<ChipEntry[]> | null = null

export function getChipKnowledge(): Promise<ChipEntry[]> {
  if (!knowledgePromise) {
    knowledgePromise = loadChipCards().then((cards) => [...chipWebEntries, ...cards])
  }
  return knowledgePromise
}

function scoreEntry(entry: ChipEntry, questionTokens: string[], normalizedQuestion: string): number {
  const haystackTokens = new Set(tokenize(`${entry.question.vi} ${entry.question.en} ${entry.answer.vi} ${entry.answer.en} ${entry.keywords.join(' ')}`))
  const questionTokenSet = new Set(tokenize(`${entry.question.vi} ${entry.question.en}`))
  let score = 0
  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeVietnamese(keyword)
    if (normalizedKeyword && normalizedQuestion.includes(normalizedKeyword)) score += 3
  }
  for (const token of questionTokens) {
    if (questionTokenSet.has(token)) score += 2
    else if (haystackTokens.has(token)) score += 1
  }
  return score
}

const FALLBACK = {
  vi: 'Chíp chưa biết câu này. Chíp chỉ trả lời dựa trên nội dung của web và bộ flashcards thôi — bạn thử một trong các câu bên dưới nhé?',
  en: 'Chíp doesn\'t know this one yet. Chíp only answers from the web content and the flashcard deck — try one of the questions below?',
}

const POPULAR: { vi: string; en: string }[] = [
  { vi: 'Web này có những phần nào?', en: 'What sections does this web have?' },
  { vi: 'Blockchain là gì?', en: 'Blockchain là gì?' },
  { vi: 'Nonce dùng để làm gì?', en: 'Nonce dùng để làm gì?' },
  { vi: 'Làm sao để đào block trong web?', en: 'How do I mine a block in this web?' },
  { vi: 'Flashcards hoạt động ra sao?', en: 'How do the Flashcards work?' },
  { vi: 'Web này khác gì blockchain thật?', en: 'How is this web different from a real blockchain?' },
]

function popularQuestions(language: 'VN' | 'EN'): string[] {
  return POPULAR.map((item) => (language === 'VN' ? item.vi : item.en)).slice(0, 3)
}

export async function answerChip(question: string, language: 'VN' | 'EN'): Promise<ChipReply> {
  const entries = await getChipKnowledge()
  const normalizedQuestion = normalizeVietnamese(question)
  const questionTokens = contentTokens(question)
  if (!normalizedQuestion) {
    return { text: language === 'VN' ? 'Bạn muốn hỏi Chíp điều gì?' : 'What would you like to ask Chíp?', suggestions: popularQuestions(language), known: false }
  }
  const ranked = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, questionTokens, normalizedQuestion) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.entry.id.startsWith('card-') ? 1 : 0) - (b.entry.id.startsWith('card-') ? 1 : 0))

  const best = ranked[0]
  if (!best || best.score < 4) {
    return { text: language === 'VN' ? FALLBACK.vi : FALLBACK.en, suggestions: popularQuestions(language), known: false }
  }

  const suggestions = ranked
    .slice(1, 4)
    .map((item) => (language === 'VN' ? item.entry.question.vi : item.entry.question.en))
  while (suggestions.length < 3) {
    const extra = popularQuestions(language).find((item) => item !== best.entry.question.vi && !suggestions.includes(item))
    if (!extra) break
    suggestions.push(extra)
  }

  return {
    text: language === 'VN' ? best.entry.answer.vi : best.entry.answer.en,
    tab: best.entry.tab,
    suggestions: suggestions.slice(0, 3),
    known: true,
  }
}
