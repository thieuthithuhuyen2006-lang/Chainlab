import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Copy, Fingerprint, LockKeyhole, Play, RotateCcw, Sigma, Square, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleId } from '../Navbar'
import { countDifferentBits, formatHash, sha256, sha256Bytes } from '../lib/sha256'

type Language = 'VN' | 'EN'
type Props = { onNavigate: (tab: ModuleId) => void }
type TranslationKey = keyof typeof translations.VN

const translations = {
  VN: {
    title: 'Hàm băm SHA-256', subtitle: 'Một đầu vào, một dấu vân tay số có thể kiểm chứng.',
    localNote: 'Hash SHA-256 thật, tính trực tiếp trong trình duyệt (Web Crypto). Không gửi dữ liệu đi đâu.',
    howTo: 'Cách sử dụng', step1: 'Nhập văn bản vào ô Input.', step2: 'Quan sát hash thay đổi sau một thoáng.', step3: 'Cuộn xuống thử từng tính chất.',
    input: 'Văn bản đầu vào (Input)', inputHint: 'Hash được tính trên byte UTF-8, không phải số ký tự.', placeholder: 'Nhập văn bản cần băm…', byte: 'byte UTF-8', digest: 'Kết quả SHA-256', copy: 'Sao chép hash', copied: 'Đã sao chép', limit: 'Giới hạn 1 MB. Hãy rút ngắn đầu vào để tính hash.',
    definition: 'Định nghĩa', tryIt: 'Thử ngay', meaning: 'Ý nghĩa trong blockchain',
    deterministic: 'Tính xác định (Deterministic)', defDet: 'Cùng một dữ liệu đầu vào luôn tạo ra cùng một hash.', meaningDet: 'Mọi node băm cùng dữ liệu đều nhận kết quả giống nhau, nhờ đó có thể kiểm chứng block.',
    runAgain: 'Băm lại lần nữa', run: 'Lần', same: '✓ Giống Run 1', different: 'Khác Run 1', maxRuns: 'Đã đủ 5 lần chạy.',
    avalanche: 'Hiệu ứng tuyết lở (Avalanche effect)', defAvalanche: 'Thay đổi rất nhỏ ở đầu vào làm nhiều bit đầu ra đổi gần như ngẫu nhiên.', meaningAvalanche: 'Sửa một ký tự trong dữ liệu block sẽ làm hash đổi mạnh, giúp phát hiện can thiệp.', inputA: 'Đầu vào A', inputB: 'Đầu vào B', presetChar: 'Đổi 1 ký tự', presetBit: 'Đổi 1 bit', presetSpace: 'Thêm dấu cách cuối', presetCase: 'Đổi hoa/thường',
    hexDiff: 'Khác biệt ký tự hex', bits: 'Số bit khác biệt', ideal: 'Giá trị lý tưởng xấp xỉ 50%.', viewBits: 'Xem lưới 256 bit (16 × 16)', hideBits: 'Ẩn lưới bit', randomRun: 'Chạy 20 lần đổi ngẫu nhiên 1 bit', randomWorking: 'Đang chạy 20 phép thử…', randomMean: 'Trung bình bit khác', expected: 'Kỳ vọng khoảng 50%',
    preimage: 'Kháng tiền ảnh (Pre-image resistance)', defPreimage: 'Với hash cho trước, việc tìm một đầu vào tạo ra nó gần như không khả thi.', meaningPreimage: 'Không thể suy ra dữ liệu gốc từ hash; tính chất này là nền tảng cho PoW và địa chỉ ví.', oneWay: 'Không thể suy ngược', notEncryption: 'SHA-256 là hàm một chiều, không phải mã hóa nên không có “giải mã”.', tryReverse: 'Thử giải ngược hash', stop: 'Dừng', exact: 'Khớp toàn bộ hash hiện tại', prefix: 'Khớp tiền tố ngắn', prefixLength: 'Số ký tự hex cần khớp', attempts: 'Số lần đã thử', rate: 'Tốc độ', elapsed: 'Thời gian chạy', recent: 'Chuỗi vừa thử', waiting: 'Chưa chạy', searching: 'Đang thử trong Web Worker', found: 'Tìm thấy ứng viên', exhausted: 'Đã chạm giới hạn lượt thử; không tìm thấy.', stopped: 'Đã dừng phép thử.',
    estimateFull: 'Cần trung bình ~2^255 lần thử để tìm tiền ảnh đầy đủ.', estimateRate: 'Ở tốc độ đo được', estimateYears: 'thời gian ước tính', universe: 'Tuổi vũ trụ khoảng 1.4 × 10^10 năm.', estimatePrefix: 'Tiền tố dài hơn một ký tự cần nhiều hơn khoảng 16 lần phép thử.',
    fixed: 'Đầu ra cố định (Fixed-length output)', defFixed: 'Đầu vào dài ngắn bất kỳ nhưng SHA-256 luôn trả về 256 bit.', meaningFixed: 'Block lớn hay nhỏ đều có hash dài 32 byte, dễ lưu trữ và so sánh.', compare: 'So sánh nhiều đầu vào', sampleEmpty: 'Chuỗi rỗng', sampleA: 'Một ký tự: “a”', sampleCurrent: 'Đầu vào hiện tại', sampleLong: 'Đoạn văn khoảng 1.000 ký tự', custom: 'Đầu vào của bạn', customPlaceholder: 'Nhập thêm để so sánh…', bytes: 'Kích thước (byte)', output: 'Đầu ra', outputFixed: '256 bit / 64 hex',
    vectors: 'Kiểm tra bằng test vector chuẩn', vectorEmpty: 'Chuỗi rỗng', vectorAbc: 'Chuỗi “abc”', vectorPass: 'Khớp chuẩn', vectorWait: 'Đang kiểm tra…', byteNotice: 'Byte được đếm theo UTF-8. SHA-256 nhận byte làm đầu vào; tiếng Việt có dấu có thể chiếm nhiều byte hơn số ký tự.', properties: 'Bốn tính chất SHA-256', bitGrid: 'Lưới so sánh 256 bit',
    bridgeTitle: 'Hash dùng ở đâu trong blockchain?', blockBefore: 'Block N−1', blockHash: 'Hash của block', blockHeader: 'Header Block N', previousHash: 'Previous hash', next: 'Tiếp theo: Cấu trúc Block',
    visual: 'Đang tính hash…', lastTried: 'Các chuỗi đã thử gần nhất', randomError: 'Không thể hoàn thành phép thử lúc này.', year: 'năm', seconds: 'giây',
  },
  EN: {
    title: 'SHA-256 hash function', subtitle: 'One input, one verifiable digital fingerprint.',
    localNote: 'Real SHA-256, computed in your browser with Web Crypto. Your data is never sent anywhere.',
    howTo: 'How to use', step1: 'Enter text in the Input field.', step2: 'Watch the hash update after a short pause.', step3: 'Scroll down and try each property.',
    input: 'Input text', inputHint: 'Hashing uses UTF-8 bytes, not the number of characters.', placeholder: 'Enter text to hash…', byte: 'UTF-8 bytes', digest: 'SHA-256 result', copy: 'Copy hash', copied: 'Copied', limit: '1 MB limit. Shorten the input to calculate its hash.',
    definition: 'Definition', tryIt: 'Try it', meaning: 'Why it matters in blockchain',
    deterministic: 'Deterministic (Tính xác định)', defDet: 'The same input data always produces the same hash.', meaningDet: 'Every node hashing the same data gets the same result, making blocks verifiable.',
    runAgain: 'Hash it again', run: 'Run', same: '✓ Matches Run 1', different: 'Differs from Run 1', maxRuns: 'The 5-run limit is reached.',
    avalanche: 'Avalanche effect (Hiệu ứng tuyết lở)', defAvalanche: 'A tiny input change makes many output bits change seemingly at random.', meaningAvalanche: 'Changing one character in a block changes its hash substantially, exposing tampering.', inputA: 'Input A', inputB: 'Input B', presetChar: 'Change 1 character', presetBit: 'Flip 1 bit', presetSpace: 'Append a space', presetCase: 'Toggle case',
    hexDiff: 'Different hex characters', bits: 'Different bits', ideal: 'The ideal value is approximately 50%.', viewBits: 'View 256-bit grid (16 × 16)', hideBits: 'Hide bit grid', randomRun: 'Run 20 random one-bit changes', randomWorking: 'Running 20 trials…', randomMean: 'Average differing bits', expected: 'Expected near 50%',
    preimage: 'Pre-image resistance (Kháng tiền ảnh)', defPreimage: 'Given a hash, finding an input that produces it is computationally infeasible.', meaningPreimage: 'The original data cannot be inferred from its hash; this supports PoW and wallet addresses.', oneWay: 'Cannot be reversed', notEncryption: 'SHA-256 is one-way, not encryption, so there is no “decryption”.', tryReverse: 'Try reversing the hash', stop: 'Stop', exact: 'Match the full current hash', prefix: 'Match a short prefix', prefixLength: 'Hex characters to match', attempts: 'Attempts', rate: 'Rate', elapsed: 'Elapsed', recent: 'Latest candidate', waiting: 'Not started', searching: 'Searching in a Web Worker', found: 'Candidate found', exhausted: 'Attempt limit reached; no match found.', stopped: 'Search stopped.',
    estimateFull: 'Finding a full preimage takes ~2^255 attempts on average.', estimateRate: 'At the measured rate of', estimateYears: 'the estimated time is', universe: 'The universe is about 1.4 × 10^10 years old.', estimatePrefix: 'Each additional hex character in the prefix takes about 16× more attempts.',
    fixed: 'Fixed-length output (Đầu ra cố định)', defFixed: 'Inputs of any length always produce a 256-bit SHA-256 output.', meaningFixed: 'Large or small blocks have a 32-byte hash, making storage and comparison simple.', compare: 'Compare multiple inputs', sampleEmpty: 'Empty string', sampleA: 'One character: “a”', sampleCurrent: 'Current input', sampleLong: 'Text of about 1,000 characters', custom: 'Your input', customPlaceholder: 'Enter another value to compare…', bytes: 'Size (bytes)', output: 'Output', outputFixed: '256 bit / 64 hex',
    vectors: 'Verify with standard test vectors', vectorEmpty: 'Empty string', vectorAbc: 'String “abc”', vectorPass: 'Standard match', vectorWait: 'Checking…', byteNotice: 'Bytes are counted using UTF-8. SHA-256 hashes bytes; accented text can use more bytes than characters.', properties: 'Four SHA-256 properties', bitGrid: '256-bit comparison grid',
    bridgeTitle: 'Where is hashing used in a blockchain?', blockBefore: 'Block N−1', blockHash: 'Block hash', blockHeader: 'Block N header', previousHash: 'Previous hash', next: 'Next: Block structure',
    visual: 'Calculating hash…', lastTried: 'Most recent candidates', randomError: 'The trials could not be completed.', year: 'years', seconds: 'seconds',
  },
} as const

const MAX_INPUT_BYTES = 1_000_000
const LONG_SAMPLE = Array.from({ length: 25 }, (_, index) => `Blockchain data sample ${index + 1}: transactions are linked, verified and secured with SHA-256. `).join('').slice(0, 1000)
const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const ABC_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
const encoder = new TextEncoder()

function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('hubblock-language') === 'EN' ? 'EN' : 'VN')
  useEffect(() => {
    const update = (event: Event) => setLanguage((event as CustomEvent<Language>).detail)
    window.addEventListener('hubblock-language-change', update)
    return () => window.removeEventListener('hubblock-language-change', update)
  }, [])
  return language
}

function useDigest(value: string) {
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (encoder.encode(value).length > MAX_INPUT_BYTES) {
        setResult('')
        setBusy(false)
        return
      }
      setBusy(true)
      void sha256(value).then((digest) => {
        if (!cancelled) setResult(digest)
      }).finally(() => {
        if (!cancelled) setBusy(false)
      })
    }, 150)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [value])
  return { hash: result, busy }
}

function Card({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <article className="sha-card min-w-0 rounded-xl border border-slate-800 bg-slate-900/75 p-4 shadow-lg shadow-black/10 sm:p-5"><header className="mb-4 flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200"><Icon size={16} /></span><h3 className="text-sm font-semibold leading-5 text-slate-100">{title}</h3></header>{children}</article>
}

function CardPart({ label, children }: { label: string; children: ReactNode }) {
  return <section className="sha-card-part border-t border-slate-800/90 py-3 first:border-0 first:pt-0 last:pb-0"><h4 className="mb-1.5 text-xs font-semibold text-slate-300">{label}</h4>{children}</section>
}

function HashGroups({ value, className = '' }: { value: string; className?: string }) {
  return <code className={`grid grid-cols-4 gap-x-2 gap-y-1 font-mono text-[11px] leading-5 sm:grid-cols-8 ${className}`} aria-label={`SHA-256: ${value}`}>{formatHash(value).map((group, index) => <span className="whitespace-nowrap" key={`${group}-${index}`}>{group}</span>)}</code>
}

function HashInput({ input, setInput, hash, busy, language, t, onCopy, copied }: { input: string; setInput: (value: string) => void; hash: string; busy: boolean; language: Language; t: (key: TranslationKey) => string; onCopy: () => void; copied: boolean }) {
  const byteCount = encoder.encode(input).length
  return <section className="sha-panel rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5" aria-label={t('input')}>
    <div className="flex flex-wrap items-end justify-between gap-2"><div><label htmlFor="sha256-main-input" className="block text-sm font-semibold text-slate-100">{t('input')}</label><p className="mt-1 text-xs text-slate-400">{t('inputHint')}</p></div><span className="font-mono text-xs text-slate-300">{byteCount.toLocaleString(language === 'VN' ? 'vi-VN' : 'en-US')} {t('byte')}</span></div>
    <textarea id="sha256-main-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={MAX_INPUT_BYTES} rows={2} placeholder={t('placeholder')} className="mt-3 w-full resize-y rounded-lg border border-slate-700 bg-[#0b0f19] px-3 py-2.5 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/10" />
    {byteCount > MAX_INPUT_BYTES && <p role="alert" className="mt-2 text-xs font-medium text-amber-200">{t('limit')}</p>}
    <div className="mt-4 flex items-start justify-between gap-3 border-t border-slate-800 pt-3"><div className="min-w-0 flex-1"><span className="mb-2 block text-xs font-semibold text-slate-300">{t('digest')} · {busy ? t('visual') : '256 bit / 64 hex'}</span>{hash ? <HashGroups value={hash} className="text-emerald-200" /> : <span className="text-xs text-slate-400">{t('visual')}</span>}</div><button type="button" onClick={onCopy} disabled={!hash} aria-label={t('copy')} title={copied ? t('copied') : t('copy')} className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition hover:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-40">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
  </section>
}

function PropertyMeaning({ text }: { text: string }) {
  return <p className="text-xs leading-5 text-slate-300">{text}</p>
}

function DeterministicCard({ input, hash, t }: { input: string; hash: string; t: (key: TranslationKey) => string }) {
  const [extraRuns, setExtraRuns] = useState<{ inputHash: string; runs: { hash: string; time: string }[] }>({ inputHash: '', runs: [] })
  const initialTime = useMemo(() => hash ? new Date().toLocaleTimeString() : '', [hash])
  const runs = hash ? [{ hash, time: initialTime }, { hash, time: initialTime }, ...(extraRuns.inputHash === hash ? extraRuns.runs : [])] : []
  const addRun = async () => {
    if (runs.length >= 5) return
    const nextHash = await sha256(input)
    const nextRun = { hash: nextHash, time: new Date().toLocaleTimeString() }
    setExtraRuns((current) => current.inputHash === hash && current.runs.length < 3
      ? { inputHash: hash, runs: [...current.runs, nextRun] }
      : { inputHash: hash, runs: [nextRun] })
  }
  return <Card title={t('deterministic')} icon={Fingerprint}>
    <CardPart label={t('definition')}><p className="text-xs leading-5 text-slate-300">{t('defDet')}</p></CardPart>
    <CardPart label={t('tryIt')}><div className="space-y-2" aria-live="polite">{runs.map((run, index) => <div key={`${index}-${run.time}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/50 p-2"><span className="text-xs font-semibold text-slate-300">{t('run')} {index + 1}</span><HashGroups value={run.hash} className="col-span-3 text-[10px] text-emerald-200 sm:col-span-1" /><span className="font-mono text-xs text-slate-400">{run.time}</span><span className={`col-span-3 inline-flex items-center gap-1 text-xs font-medium sm:col-span-1 ${run.hash === runs[0]?.hash ? 'text-emerald-300' : 'text-rose-300'}`}>{run.hash === runs[0]?.hash ? <Check size={13} /> : null}{run.hash === runs[0]?.hash ? t('same') : t('different')}</span></div>)}</div><button type="button" onClick={() => void addRun()} disabled={!hash || runs.length >= 5} aria-label={t('runAgain')} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:border-emerald-300/50 disabled:opacity-40"><RotateCcw size={14} />{runs.length >= 5 ? t('maxRuns') : t('runAgain')}</button></CardPart>
    <CardPart label={t('meaning')}><PropertyMeaning text={t('meaningDet')} /></CardPart>
  </Card>
}

function makeVariant(input: string, kind: 'character' | 'bit' | 'space' | 'case') {
  if (kind === 'space') return `${input} `
  if (!input) return kind === 'bit' ? String.fromCharCode(1) : 'a'
  const chars = [...input]
  const firstAsciiIndex = chars.findIndex((char) => char.charCodeAt(0) <= 0x7f)
  const index = firstAsciiIndex >= 0 ? firstAsciiIndex : 0
  const code = chars[index].charCodeAt(0)
  if (kind === 'bit') chars[index] = String.fromCharCode(code ^ 1)
  else if (kind === 'case') chars[index] = chars[index] === chars[index].toUpperCase() ? chars[index].toLowerCase() : chars[index].toUpperCase()
  else chars[index] = chars[index] === 'a' ? 'b' : 'a'
  return chars.join('')
}

function bitsOf(hash: string) {
  return [...hash].flatMap((digit) => Number.parseInt(digit, 16).toString(2).padStart(4, '0').split(''))
}

function AvalancheCard({ input, hash, t }: { input: string; hash: string; t: (key: TranslationKey) => string }) {
  const [inputBState, setInputBState] = useState<{ source: string; value: string }>({ source: input, value: makeVariant(input, 'character') })
  const inputB = inputBState.source === input ? inputBState.value : makeVariant(input, 'character')
  const [showBits, setShowBits] = useState(false)
  const [trials, setTrials] = useState<number[] | null>(null)
  const [trialBusy, setTrialBusy] = useState(false)
  const digestB = useDigest(inputB).hash
  const bitCount = hash && digestB ? countDifferentBits(hash, digestB) : 0
  const percent = (bitCount / 256 * 100).toFixed(1)
  const firstBits = useMemo(() => bitsOf(hash || '0'.repeat(64)), [hash])
  const secondBits = useMemo(() => bitsOf(digestB || '0'.repeat(64)), [digestB])
  const randomTrials = async () => {
    setTrialBusy(true)
    try {
      const source = encoder.encode(input)
      const tasks = Array.from({ length: 20 }, async () => {
        const bytes = source.length ? source.slice() : new Uint8Array([0])
        const target = Math.floor(Math.random() * bytes.length)
        bytes[target] ^= 1 << Math.floor(Math.random() * 8)
        const changedHash = await sha256Bytes(bytes)
        return countDifferentBits(hash, changedHash) / 256 * 100
      })
      setTrials(await Promise.all(tasks))
    } catch {
      setTrials([])
    } finally {
      setTrialBusy(false)
    }
  }
  const average = trials?.length ? (trials.reduce((sum, item) => sum + item, 0) / trials.length).toFixed(1) : null
  return <Card title={t('avalanche')} icon={Zap}>
    <CardPart label={t('definition')}><p className="text-xs leading-5 text-slate-300">{t('defAvalanche')}</p></CardPart>
    <CardPart label={t('tryIt')}><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-300">{t('inputA')}<textarea readOnly value={input} rows={2} className="mt-1.5 w-full resize-y rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs font-normal leading-5 text-slate-200" /></label><label className="text-xs font-semibold text-slate-300">{t('inputB')}<textarea value={inputB} onChange={(event) => setInputBState({ source: input, value: event.target.value })} rows={2} className="mt-1.5 w-full resize-y rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs font-normal leading-5 text-slate-200 outline-none focus:border-amber-300/60" /></label></div>
    <div className="mt-2 flex flex-wrap gap-1.5">{([['character', 'presetChar'], ['bit', 'presetBit'], ['space', 'presetSpace'], ['case', 'presetCase']] as const).map(([kind, key]) => <button key={kind} type="button" onClick={() => setInputBState({ source: input, value: makeVariant(input, kind) })} className="min-h-8 rounded-md border border-slate-700 px-2.5 text-xs text-slate-300 hover:border-amber-300/50 hover:text-amber-100">{t(key)}</button>)}</div>
      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/50 p-2.5"><span className="mb-1 block text-xs font-semibold text-slate-300">{t('hexDiff')}</span><div className="grid grid-cols-4 gap-x-2 gap-y-1 font-mono text-[10px] leading-5 sm:grid-cols-8" aria-label={t('hexDiff')}>{formatHash(hash || '0'.repeat(64)).map((group, groupIndex) => <span key={`${group}-${groupIndex}`}>{[...group].map((char, charIndex) => { const index = groupIndex * 8 + charIndex; return <span key={index} className={char === digestB[index] ? 'text-emerald-200' : 'rounded bg-rose-400/20 text-rose-200'}>{char}</span> })}</span>)}</div><div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs"><strong className="text-slate-100">{t('bits')}: {bitCount}/256 ({percent}%)</strong><span className="text-slate-400">{t('ideal')}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-amber-300 transition-[width]" style={{ width: `${percent}%` }} /></div>
      <button type="button" onClick={() => setShowBits((visible) => !visible)} className="mt-2 min-h-8 text-xs font-semibold text-amber-200 underline decoration-amber-200/40 underline-offset-4">{t(showBits ? 'hideBits' : 'viewBits')}</button>{showBits && <div className="mt-2 grid w-full max-w-[320px] grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5" role="img" aria-label={t('bitGrid')}>{firstBits.map((bit, index) => <span key={index} title={`bit ${index}: ${bit} → ${secondBits[index]}`} className={`aspect-square rounded-[2px] ${bit === secondBits[index] ? 'bg-slate-700' : 'bg-rose-400'}`} />)}</div>}</div>
      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/50 p-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-200">{t('randomMean')}</span><button type="button" onClick={() => void randomTrials()} disabled={trialBusy || !hash} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 text-xs font-semibold text-slate-200 disabled:opacity-50"><RotateCcw size={13} />{t(trialBusy ? 'randomWorking' : 'randomRun')}</button></div>{average && <div className="mt-2 flex items-baseline justify-between"><strong className="font-mono text-xl text-emerald-200">{average}%</strong><span className="text-xs text-slate-400">{t('expected')}</span></div>}</div>
    </CardPart>
    <CardPart label={t('meaning')}><PropertyMeaning text={t('meaningAvalanche')} /></CardPart>
  </Card>
}

function PreimageCard({ hash, t }: { hash: string; t: (key: TranslationKey) => string }) {
  const [shortMode, setShortMode] = useState(true)
  const [prefixLength, setPrefixLength] = useState(4)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')
  const [attemptCount, setAttemptCount] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const [worker, setWorker] = useState<Worker | null>(null)
  const [clockStart, setClockStart] = useState(0)
  const attemptsPerSecond = elapsedMs > 0 ? attemptCount / (elapsedMs / 1000) : 0
  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setElapsedMs(Date.now() - clockStart), 250)
    return () => window.clearInterval(interval)
  }, [running, clockStart])
  useEffect(() => () => worker?.terminate(), [worker])
  const stop = () => {
    worker?.postMessage({ type: 'cancel' })
    worker?.terminate()
    setWorker(null)
    setRunning(false)
    setStatus(t('stopped'))
  }
  const start = () => {
    if (!hash || running) return
    const nextWorker = new Worker(new URL('./preimage.worker.ts', import.meta.url), { type: 'module' })
    const started = Date.now()
    const targetPrefix = shortMode ? hash.slice(0, prefixLength) : hash
    setWorker(nextWorker)
    setRunning(true)
    setStatus(t('searching'))
    setAttemptCount(0)
    setElapsedMs(0)
    setClockStart(started)
    setRecent([])
    nextWorker.onmessage = (event: MessageEvent<{ type: string; attempts?: number; elapsedMs?: number; latest?: string; input?: string; maxAttempts?: number; message?: string }>) => {
      const result = event.data
      if (result.type === 'progress') {
        setAttemptCount(result.attempts ?? 0)
        setElapsedMs(result.elapsedMs ?? 0)
        setRecent((values) => [...values.slice(-9), result.latest ?? ''])
      } else {
        setRunning(false)
        setWorker(null)
        nextWorker.terminate()
        setAttemptCount(result.attempts ?? attemptCount)
        setElapsedMs(result.elapsedMs ?? Date.now() - started)
        setStatus(result.type === 'found' ? `${t('found')}: ${result.input}` : result.type === 'not-found' ? t('exhausted') : result.message ?? t('randomError'))
        if (result.input) setRecent((values) => [...values.slice(-9), result.input ?? ''])
      }
    }
    nextWorker.onerror = () => {
      nextWorker.terminate()
      setWorker(null)
      setRunning(false)
      setStatus(t('randomError'))
    }
    nextWorker.postMessage({ type: 'start', targetPrefix, maxLength: 5, charset: 'abcdefghijklmnopqrstuvwxyz0123456789' })
  }
  const rate = attemptsPerSecond > 0 ? attemptsPerSecond : 1
  const years = (2 ** 255 / rate / (60 * 60 * 24 * 365.25)).toExponential(2)
  const prefixYears = (16 ** prefixLength / 2 / rate / (60 * 60 * 24 * 365.25)).toExponential(2)
  return <Card title={t('preimage')} icon={LockKeyhole}>
    <CardPart label={t('definition')}><p className="text-xs leading-5 text-slate-300">{t('defPreimage')}</p><p className="mt-2 rounded-md border border-sky-300/15 bg-sky-300/[0.05] p-2.5 text-xs font-medium leading-5 text-sky-100"><LockKeyhole className="mr-1 inline" size={13} />{t('oneWay')}. {t('notEncryption')}</p></CardPart>
    <CardPart label={t('tryIt')}><div className="flex flex-wrap items-center gap-2"><label className="inline-flex min-h-9 items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={shortMode} onChange={(event) => setShortMode(event.target.checked)} className="accent-sky-300" />{t(shortMode ? 'prefix' : 'exact')}</label>{shortMode && <label className="inline-flex items-center gap-2 text-xs text-slate-300">{t('prefixLength')}<select value={prefixLength} onChange={(event) => setPrefixLength(Number(event.target.value))} className="min-h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-slate-100">{[2, 3, 4, 5, 6].map((length) => <option value={length} key={length}>{length}</option>)}</select></label>}<button type="button" onClick={running ? stop : start} disabled={!hash} aria-label={t(running ? 'stop' : 'tryReverse')} className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/[0.08] px-3 text-xs font-semibold text-sky-100 hover:border-sky-300/60 disabled:opacity-40">{running ? <Square size={13} /> : <Play size={13} />}{t(running ? 'stop' : 'tryReverse')}</button></div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[[t('attempts'), attemptCount.toLocaleString()], [t('rate'), `${attemptsPerSecond.toFixed(0)} hash/s`], [t('elapsed'), `${(elapsedMs / 1000).toFixed(1)} ${t('seconds')}`], [t('recent'), recent.at(-1) || '—']].map(([label, value]) => <div key={label} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/60 p-2"><span className="block truncate text-xs text-slate-400">{label}</span><strong className="mt-1 block truncate font-mono text-xs text-slate-100">{value}</strong></div>)}</div>
      <p className="mt-2 min-h-5 text-xs text-sky-200" role="status" aria-live="polite">{status || t('waiting')}</p><div className="max-h-16 overflow-auto rounded-md bg-slate-950/50 px-2 py-1 font-mono text-xs text-slate-400" aria-label={t('lastTried')}>{recent.map((candidate, index) => <span key={`${candidate}-${index}`} className="mr-2 inline-block">{candidate || '∅'}</span>)}</div>
      <div className="mt-3 space-y-1 rounded-md border border-slate-800 bg-slate-950/50 p-2.5 text-xs leading-5 text-slate-300"><p>{t('estimateFull')} {t('estimateRate')} <strong className="font-mono">{attemptsPerSecond.toExponential(2)} hash/s</strong>, {t('estimateYears')} <strong className="font-mono text-sky-200">{years} {t('year')}</strong>.</p><p>{t('universe')}</p>{shortMode && <p>{t('estimatePrefix')} <strong className="font-mono">{prefixYears} {t('year')}</strong> ({prefixLength} hex).</p>}</div>
    </CardPart>
    <CardPart label={t('meaning')}><PropertyMeaning text={t('meaningPreimage')} /></CardPart>
  </Card>
}

function FixedLengthCard({ input, t }: { input: string; t: (key: TranslationKey) => string }) {
  const [custom, setCustom] = useState('')
  const [customOverLimit, setCustomOverLimit] = useState(false)
  const [rows, setRows] = useState<{ label: string; value: string; hash: string }[]>([])
  const entries = useMemo(() => [[t('sampleEmpty'), ''], [t('sampleA'), 'a'], [t('sampleCurrent'), input], [t('sampleLong'), LONG_SAMPLE], [t('custom'), custom]] as const, [custom, input, t])
  useEffect(() => {
    let cancelled = false
    void Promise.all(entries.map(async ([label, value]) => ({ label, value, hash: encoder.encode(value).length <= MAX_INPUT_BYTES ? await sha256(value) : '' }))).then((result) => {
      if (!cancelled) setRows(result)
    })
    return () => { cancelled = true }
  }, [entries])
  return <Card title={t('fixed')} icon={Sigma}>
    <CardPart label={t('definition')}><p className="text-xs leading-5 text-slate-300">{t('defFixed')}</p></CardPart>
    <CardPart label={t('tryIt')}><label className="block text-xs font-semibold text-slate-300">{t('custom')}<input value={custom} onChange={(event) => { const value = event.target.value; setCustomOverLimit(encoder.encode(value).length > MAX_INPUT_BYTES); if (encoder.encode(value).length <= MAX_INPUT_BYTES) setCustom(value) }} maxLength={333333} placeholder={t('customPlaceholder')} className="mt-1.5 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-2.5 text-xs font-normal text-slate-100 outline-none focus:border-emerald-300/50" /></label>{customOverLimit && <p className="mt-1 text-xs text-amber-200" role="alert">{t('limit')}</p>}<div className="mt-2 overflow-x-auto rounded-md border border-slate-800"><table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="bg-slate-950/80 text-slate-300"><tr><th className="p-2">{t('input')}</th><th className="p-2">{t('bytes')}</th><th className="p-2">{t('output')}</th><th className="p-2">{t('outputFixed')}</th></tr></thead><tbody>{rows.map((row, index) => <tr className="border-t border-slate-800 align-top" key={`${row.label}-${index}`}><td className="max-w-36 p-2 text-slate-300"><span className="block truncate">{row.label}: {row.value || '∅'}</span><div className="mt-1 h-1 w-full rounded bg-slate-800"><div className="h-full rounded bg-emerald-300" style={{ width: `${Math.max(2, Math.min(100, encoder.encode(row.value).length / 10))}%` }} /></div></td><td className="whitespace-nowrap p-2 font-mono text-slate-300">{encoder.encode(row.value).length}</td><td className="min-w-56 p-2">{row.hash ? <HashGroups value={row.hash} className="grid-cols-4 text-[9px] text-emerald-200" /> : <span className="text-xs text-amber-200">{t('limit')}</span>}</td><td className="whitespace-nowrap p-2 font-mono text-slate-300">256 bit / 64 hex</td></tr>)}</tbody></table></div></CardPart>
    <CardPart label={t('meaning')}><PropertyMeaning text={t('meaningFixed')} /></CardPart>
  </Card>
}

function TestVectors({ t }: { t: (key: TranslationKey) => string }) {
  const [vectors, setVectors] = useState<{ empty: string; abc: string }>({ empty: '', abc: '' })
  useEffect(() => {
    void Promise.all([sha256(''), sha256('abc')]).then(([empty, abc]) => setVectors({ empty, abc }))
  }, [])
  return <details className="sha-panel rounded-xl border border-slate-800 bg-slate-900/70 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-100">{t('vectors')}</summary><div className="mt-3 space-y-3"><Vector label={t('vectorEmpty')} actual={vectors.empty} expected={EMPTY_HASH} t={t} /><Vector label={t('vectorAbc')} actual={vectors.abc} expected={ABC_HASH} t={t} /></div></details>
}

function Vector({ label, actual, expected, t }: { label: string; actual: string; expected: string; t: (key: TranslationKey) => string }) {
  const matches = actual === expected
  return <div className="grid gap-1 rounded-md border border-slate-800 bg-slate-950/50 p-2.5 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="text-xs font-semibold text-slate-300">{label}</span><HashGroups value={actual || expected} className="text-[9px] text-slate-300" /><span className={`text-xs font-semibold ${matches ? 'text-emerald-300' : 'text-amber-200'}`}>{matches ? '✓ ' : ''}{matches ? t('vectorPass') : t('vectorWait')}</span></div>
}

export default function TabSHA256({ onNavigate }: Props) {
  const language = useLanguage()
  const t = useCallback((key: TranslationKey) => translations[language][key], [language])
  const [input, setInput] = useState('Blockchain is built on verifiable data.')
  const [copied, setCopied] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(true)
  const { hash, busy } = useDigest(input)
  const byteCount = encoder.encode(input).length
  const copyHash = async () => {
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }
  return <div className="sha256-demo space-y-4 text-slate-200">
    <header className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-mono text-xs font-semibold uppercase text-emerald-300">01 / HASH FUNCTION</p><h2 className="mt-1 text-xl font-semibold text-slate-100">{t('title')}</h2><p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p></div><span className="rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 font-mono text-xs text-slate-300">NIST FIPS 180-4 · 256-bit</span></header>
    <section className="sha-panel rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] px-3 py-2 text-xs font-medium leading-5 text-emerald-100" role="note"><span className="mr-2 text-emerald-300">●</span>{t('localNote')}</section>
    <details open={noticeOpen} onToggle={(event) => setNoticeOpen(event.currentTarget.open)} className="sha-panel rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-slate-200">{t('howTo')}</summary><ol className="mt-2 grid gap-1.5 text-xs leading-5 text-slate-300 sm:grid-cols-3"><li><span className="mr-1 font-mono text-emerald-300">01</span>{t('step1')}</li><li><span className="mr-1 font-mono text-emerald-300">02</span>{t('step2')}</li><li><span className="mr-1 font-mono text-emerald-300">03</span>{t('step3')}</li></ol></details>
    <HashInput input={input} setInput={setInput} hash={hash} busy={busy} language={language} t={t} onCopy={() => void copyHash()} copied={copied} />
    <div className="grid gap-3 xl:grid-cols-2" aria-label={t('properties')}><DeterministicCard input={input} hash={hash} t={t} /><AvalancheCard input={input} hash={hash} t={t} /><PreimageCard hash={hash} t={t} /><FixedLengthCard input={input} t={t} /></div>
    <aside className="sha-panel rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-xs leading-5 text-slate-300">{t('byteNotice')} <span className="font-mono text-emerald-200">{byteCount.toLocaleString(language === 'VN' ? 'vi-VN' : 'en-US')} bytes UTF-8</span></aside>
    <TestVectors t={t} />
    <section className="sha-panel rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-100">{t('bridgeTitle')}</h3><div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-200">{t('blockBefore')}</span><ArrowRight size={14} className="text-slate-400" /><span className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 text-emerald-100">{t('blockHash')}<br /><code className="font-mono text-xs">{hash.slice(0, 12)}…</code></span><ArrowRight size={14} className="text-slate-400" /><span className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-200">{t('blockHeader')}<br /><strong className="text-xs text-sky-200">{t('previousHash')}</strong></span></div></div><button type="button" onClick={() => onNavigate('mining')} aria-label={t('next')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/[0.08] px-3 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60"><ArrowRight size={15} />{t('next')}</button></div></section>
  </div>
}