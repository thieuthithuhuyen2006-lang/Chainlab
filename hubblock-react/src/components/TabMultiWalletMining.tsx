import { useEffect, useMemo, useRef, useState } from 'react'
import { Blocks, Cpu, Radio, Send, Trophy, Wifi, WifiOff, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Block, Transaction } from '../lib/chain'
import { hashTransaction, merkleRoot } from '../lib/chain'
import { appendMinedBlock, getChainSnapshot, replaceChain } from '../lib/chainStore'
import { nonceForWorker, selectLongestChain, validatePeerBlock } from '../lib/miningNetwork'
import { configureMiningWallets, createSignedTransaction, ensureMiningWalletKeys, getMiningSnapshot, settleMinedTransactions, useMiningStore, verifyMiningTransaction, type MiningWallet, type SignedMiningTransaction } from '../lib/miningStore'
import { useChain } from '../lib/useChain'
import type { MiningWorkerRequest, MiningWorkerResponse } from './pow.worker'

type Architecture = 'workers' | 'p2p'
type Language = 'VN' | 'EN'
type MinerRow = { walletId: string; status: 'idle' | 'mining' | 'winner' | 'stopped'; nonce: number; attempts: number; hashesPerSecond: number; latestHash: string }
type RaceWinner = Extract<MiningWorkerResponse, { type: 'found' }>
type RacePlan = { templates: Block[]; transactionsByWallet: Map<string, SignedMiningTransaction[]>; base: Block[]; validated: SignedMiningTransaction[] }
type Peer = { id: string; name: string; walletId: string; online: boolean; chain: Block[]; mempool: SignedMiningTransaction[]; malicious: boolean }
type NetworkEvent = { id: string; time: string; node: string; text: string; kind: 'info' | 'reject' | 'accept' | 'fork' }
type Packet = { id: string; from: string; to: string; startedAt: number; duration: number }

const forkNoticeKey = 'chainlab-mining-fork-notice'
const rewardAmount = '0.01'

function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('hubblock-language') === 'EN' ? 'EN' : 'VN')
  useEffect(() => {
    const update = (event: Event) => setLanguage((event as CustomEvent<Language>).detail)
    window.addEventListener('hubblock-language-change', update)
    return () => window.removeEventListener('hubblock-language-change', update)
  }, [])
  return (vietnamese: string, english: string) => language === 'EN' ? english : vietnamese
}

function nowText(language: Language) {
  return new Intl.DateTimeFormat(language === 'EN' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }).format(new Date())
}

function shortHash(value: string) {
  return `${value.slice(0, 12)}…${value.slice(-8)}`
}

function terminateWorkerMap(ref: { current: Map<string, Worker> }) {
  ref.current.forEach((worker) => { worker.postMessage({ type: 'cancel' }); worker.terminate() })
  ref.current.clear()
}

function terminateWorkerArray(ref: { current: Worker[] }) {
  ref.current.forEach((worker) => { worker.postMessage({ type: 'cancel' }); worker.terminate() })
  ref.current = []
}

function clearTimerList(ref: { current: number[] }) {
  ref.current.forEach((timer) => window.clearTimeout(timer))
  ref.current = []
}

function formatHeader(block: Pick<Block, 'index' | 'timestamp' | 'previousHash' | 'merkleRoot' | 'nonce' | 'validator'>) {
  return `${block.index}${block.timestamp}${block.previousHash}${block.merkleRoot}`
}

function signedReward(wallet: MiningWallet, round: string): SignedMiningTransaction {
  return { id: `reward-${round}`, from: `0x${'0'.repeat(40)}`, to: wallet.address, amount: rewardAmount, nonce: 0, signatureStatus: 'signed', signature: 'protocol-reward' }
}

async function validateMempool(transactions: SignedMiningTransaction[], wallets: MiningWallet[]) {
  const valid: SignedMiningTransaction[] = []
  for (const transaction of transactions) {
    const result = await verifyMiningTransaction(transaction, wallets, valid)
    if (!result.valid) return { valid: false, reason: `${shortHash(transaction.id)}: ${result.reason}`, transactions: valid }
    valid.push(transaction)
  }
  return { valid: true, reason: '', transactions: valid }
}

function makeCandidate(base: Block[], transactions: Transaction[], wallet: MiningWallet, difficulty: number, timestamp = new Date().toISOString()): Block {
  const latest = base.at(-1)
  return {
    index: base.length,
    timestamp,
    previousHash: latest?.hash ?? '0'.repeat(64),
    transactions,
    merkleRoot: merkleRoot(transactions.map(hashTransaction)),
    difficulty,
    validator: wallet.address,
    nonce: 1,
    hash: '',
  }
}

function spawnMiningWorker(wallet: MiningWallet, block: Block, workerIndex: number, workerCount: number, difficulty: number, slowMode: boolean, onMessage: (event: MessageEvent<MiningWorkerResponse>) => void) {
  const worker = new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = onMessage
  const request: MiningWorkerRequest = {
    type: 'start',
    workerId: wallet.id,
    walletName: wallet.name,
    validatorAddress: wallet.address,
    index: block.index,
    timestamp: block.timestamp,
    previousHash: block.previousHash,
    merkleRoot: block.merkleRoot,
    nonceStart: nonceForWorker(workerIndex, workerCount, 0),
    nonceStride: workerCount,
    difficulty,
    hashPower: wallet.hashPower,
    slowMode,
  }
  worker.postMessage(request)
  return worker
}

function MiningRace({ t, store, chain }: { t: (vi: string, en: string) => string; store: ReturnType<typeof useMiningStore>; chain: Block[] }) {
  const [walletCount, setWalletCount] = useState(store.wallets.length)
  const [difficulty, setDifficulty] = useState(3)
  const [slowMode, setSlowMode] = useState(true)
  const [fromId, setFromId] = useState(store.wallets[0]?.id ?? '')
  const [toId, setToId] = useState(store.wallets[1]?.id ?? '')
  const [amount, setAmount] = useState('1')
  const [txError, setTxError] = useState('')
  const [mining, setMining] = useState(false)
  const [miners, setMiners] = useState<MinerRow[]>([])
  const [winner, setWinner] = useState<RaceWinner | null>(null)
  const [forkNotice, setForkNotice] = useState(sessionStorage.getItem(forkNoticeKey) ?? '')
  const [wins, setWins] = useState<Record<string, number>>({})
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchDone, setBatchDone] = useState(0)
  const [status, setStatus] = useState('')
  const [currentTemplate, setCurrentTemplate] = useState<Block | null>(null)
  const workersRef = useRef(new Map<string, Worker>())
  const minerStatsRef = useRef(new Map<string, MinerRow>())
  const raceWinnerRef = useRef<RaceWinner | null>(null)
  const raceWinnerTimeRef = useRef(0)
  const forkRef = useRef(false)
  const finishTimerRef = useRef<number | null>(null)
  const batchRemainingRef = useRef(0)
  const beginRoundRef = useRef<() => void>(() => undefined)
  const { wallets, mempool } = store
  const language = localStorage.getItem('hubblock-language') === 'EN' ? 'EN' : 'VN'
  const expectedTrials = 16 ** difficulty

  useEffect(() => {
    void ensureMiningWalletKeys()
    return () => {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current)
      terminateWorkerMap(workersRef)
    }
  }, [])

  function updateWallet(index: number, update: Partial<Pick<MiningWallet, 'name' | 'hashPower'>>) {
    const configuration = wallets.map((wallet, walletIndex) => ({ ...wallet, ...(walletIndex === index ? update : {}) }))
    configureMiningWallets(walletCount, configuration)
  }

  function changeWalletCount(nextCount: number) {
    const count = Math.max(2, Math.min(8, nextCount))
    setWalletCount(count)
    configureMiningWallets(count, wallets)
    if (count !== walletCount) {
      setFromId(wallets[0]?.id ?? '')
      setToId(wallets[1]?.id ?? '')
    }
  }

  async function createTransaction() {
    setTxError('')
    const result = await createSignedTransaction(fromId, wallets.find((wallet) => wallet.id === toId)?.address ?? '', amount)
    if (result.error || !result.transaction) {
      setTxError(result.error ?? t('Không thể tạo giao dịch.', 'Unable to create transaction.'))
      return
    }
    setStatus(t('Đã ký ECDSA và thêm giao dịch vào mempool.', 'ECDSA-signed transaction added to the mempool.'))
  }

  function stopRace() {
    batchRemainingRef.current = 0
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current)
    workersRef.current.forEach((worker) => worker.postMessage({ type: 'cancel' }))
    finishTimerRef.current = window.setTimeout(() => {
      workersRef.current.forEach((worker) => worker.terminate())
      workersRef.current.clear()
      setMining(false)
      setMiners((current) => current.map((miner) => ({ ...miner, status: miner.status === 'mining' ? 'stopped' : miner.status })))
      setStatus(t('Đã dừng; số hash là số lần thực tế từng worker đã thử.', 'Stopped; each worker shows its actual hashes attempted.'))
    }, 120)
  }

  async function buildTemplate(participants: MiningWallet[]): Promise<RacePlan | null> {
    const validated = await validateMempool(mempool, wallets)
    if (!validated.valid) {
      setStatus(`${t('Mempool bị từ chối:', 'Mempool rejected:')} ${validated.reason}`)
      return null
    }
    const base = getChainSnapshot()
    const timestamp = new Date().toISOString()
    const rewardTxByWallet = new Map<string, SignedMiningTransaction[]>()
    const templates = participants.map((wallet) => {
      const transactions = [...validated.transactions, signedReward(wallet, `${Date.now()}-${wallet.id}`)]
      rewardTxByWallet.set(wallet.id, transactions)
      return makeCandidate(base, transactions, wallet, difficulty, timestamp)
    })
    return { templates, transactionsByWallet: rewardTxByWallet, base, validated: validated.transactions }
  }

  function finalizeWinner(result: RaceWinner, race: RacePlan) {
    const template = race.templates.find((block) => block.validator === result.validatorAddress)!
    const block: Block = { ...template, nonce: result.nonce, hash: result.hash }
    appendMinedBlock(block)
    settleMinedTransactions(race.validated, result.workerId, Number(rewardAmount))
    setWinner(result)
    setWins((current) => ({ ...current, [result.workerId]: (current[result.workerId] ?? 0) + 1 }))
    setStatus(`${result.walletName} ${t('thắng vòng với nonce', 'won with nonce')} ${result.nonce}; ${result.attempts.toLocaleString()} ${t('hash đã thử', 'hashes attempted')}.`)
    setCurrentTemplate(block)
    if (forkRef.current) {
      const notice = t('Hai ví tìm thấy nonce gần như đồng thời; có thể xảy ra fork. Mở bước 4 để mô phỏng.', 'Two wallets found a nonce nearly simultaneously; a fork may occur. Open step 4 to simulate it.')
      setForkNotice(notice)
      sessionStorage.setItem(forkNoticeKey, notice)
    }
    setBatchDone((done) => done + 1)
    batchRemainingRef.current -= 1
    if (batchRemainingRef.current > 0) finishTimerRef.current = window.setTimeout(() => beginRoundRef.current(), 180)
  }

  async function beginRound() {
    if (mining || batchRemainingRef.current <= 0) return
    const participants = wallets.slice(0, walletCount)
    if (!participants.length) return
    const race = await buildTemplate(participants)
    if (!race) { batchRemainingRef.current = 0; setMining(false); return }
    raceWinnerRef.current = null
    raceWinnerTimeRef.current = 0
    forkRef.current = false
    minerStatsRef.current = new Map(participants.map((wallet) => [wallet.id, { walletId: wallet.id, status: 'mining', nonce: 0, attempts: 0, hashesPerSecond: 0, latestHash: '' }]))
    setMiners([...minerStatsRef.current.values()])
    setWinner(null)
    setMining(true)
    setCurrentTemplate(race.templates[0])
    setStatus(t('Bốn luồng bắt đầu thử nonce xen kẽ…', 'Workers are searching interleaved nonces…'))

    const complete = (winner: RaceWinner) => {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current)
      workersRef.current.forEach((worker) => worker.postMessage({ type: 'cancel' }))
      finishTimerRef.current = window.setTimeout(() => {
        workersRef.current.forEach((worker) => worker.terminate())
        workersRef.current.clear()
        const finalRows = [...minerStatsRef.current.values()].map((miner) => ({ ...miner, status: miner.walletId === winner.workerId ? 'winner' as const : 'stopped' as const }))
        const winnerRow = finalRows.find((miner) => miner.walletId === winner.workerId)
        if (winnerRow) { winnerRow.attempts = winner.attempts; winnerRow.nonce = winner.nonce; winnerRow.latestHash = winner.hash; winnerRow.hashesPerSecond = winner.hashesPerSecond }
        setMiners(finalRows)
        setMining(false)
        finalizeWinner(winner, race)
      }, 120)
    }

    participants.forEach((wallet, index) => {
      const worker = spawnMiningWorker(wallet, race.templates[index], index, participants.length, difficulty, slowMode, (event) => {
        const result = event.data
        if (result.type === 'progress' || result.type === 'cancelled') {
          const current = minerStatsRef.current.get(result.workerId)
          if (current) {
            const next = { ...current, nonce: result.nonce, attempts: result.attempts, hashesPerSecond: result.hashesPerSecond, latestHash: result.latestHash, status: result.type === 'cancelled' ? 'stopped' as const : 'mining' as const }
            minerStatsRef.current.set(result.workerId, next)
            setMiners([...minerStatsRef.current.values()])
          }
          return
        }
        if (result.type === 'error') { setStatus(result.message); stopRace(); return }
        if (result.type !== 'found') return
        const foundAt = Date.now()
        if (raceWinnerRef.current) {
          if (foundAt - raceWinnerTimeRef.current <= 100) forkRef.current = true
          const competing = minerStatsRef.current.get(result.workerId)
          if (competing) {
            minerStatsRef.current.set(result.workerId, { ...competing, status: 'stopped', nonce: result.nonce, attempts: result.attempts, hashesPerSecond: result.hashesPerSecond, latestHash: result.hash })
            setMiners([...minerStatsRef.current.values()])
          }
          return
        }
        raceWinnerRef.current = result
        raceWinnerTimeRef.current = foundAt
        const current = minerStatsRef.current.get(result.workerId)
        if (current) minerStatsRef.current.set(result.workerId, { ...current, status: 'winner', nonce: result.nonce, attempts: result.attempts, latestHash: result.hash, hashesPerSecond: result.hashesPerSecond })
        complete(result)
      })
      workersRef.current.set(wallet.id, worker)
    })
  }

  useEffect(() => {
    beginRoundRef.current = () => { void beginRound() }
  })

  function startSingle() {
    batchRemainingRef.current = 1
    setBatchTotal(1)
    setBatchDone(0)
    beginRound()
  }

  function startTen() {
    batchRemainingRef.current = 10
    setBatchTotal(10)
    setBatchDone(0)
    setWins({})
    beginRound()
  }

  const localizedLanguage = language
  const formulaText = currentTemplate ? `SHA256(${formatHeader(currentTemplate)} ‖ nonce=${currentTemplate.nonce} ‖ validator=${currentTemplate.validator})` : 'SHA256(header fields ‖ nonce ‖ validator)'
  const expectedTrialsText = `16^${difficulty} ≈ ${expectedTrials.toLocaleString(localizedLanguage === 'EN' ? 'en-US' : 'vi-VN')}`
  const activeMempoolTotal = mempool.reduce((sum, item) => sum + Number(item.amount), 0)

  return <div className="space-y-4">
    <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-4"><header className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-100">{t('Block template đang đào (Mining template)', 'Block template (read-only)')}</h3><p className="mt-1 text-xs text-slate-400">{t('Block mới dùng mempool đã ký, Previous hash từ tip và timestamp UTC.', 'New block uses signed mempool, current tip and UTC timestamp.')}</p></div><div className="flex flex-wrap items-center gap-3"><label className="text-xs text-slate-300">{t('Số ví', 'Wallet count')}<select aria-label={t('Số ví tham gia cuộc đua', 'Number of racing wallets')} value={walletCount} disabled={mining} onChange={(event) => changeWalletCount(Number(event.target.value))} className="ml-2 min-h-9 rounded-md border border-slate-700 bg-slate-950 px-2">{Array.from({ length: 7 }, (_, index) => index + 2).map((count) => <option key={count}>{count}</option>)}</select></label><label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={slowMode} onChange={(event) => setSlowMode(event.target.checked)} disabled={mining} />{t('Chậm (Slow)', 'Slow mode')}</label></div></header>
      <label className="mt-3 block text-xs font-semibold text-slate-300">{t('Difficulty', 'Difficulty')} · <span className="text-emerald-200">{difficulty}</span> zeroes · {t('trung bình', 'average')} {expectedTrialsText} {t('lượt thử', 'attempts')}<input type="range" min="1" max="6" value={difficulty} disabled={mining} aria-label={t('Mining difficulty từ 1 đến 6', 'Mining difficulty from 1 to 6')} onChange={(event) => setDifficulty(Number(event.target.value))} className="mt-2 block w-full accent-emerald-300" /></label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[
        ['index', String(currentTemplate?.index ?? chain.length)],
        ['previousHash', currentTemplate?.previousHash ?? chain.at(-1)?.hash ?? '0'.repeat(64)],
        ['merkleRoot', currentTemplate?.merkleRoot ?? merkleRoot(mempool.map(hashTransaction))],
        ['timestamp', currentTemplate?.timestamp ?? new Date().toISOString()],
        ['difficulty', String(difficulty)],
        ['header + nonce', formulaText],
      ].map(([label, value]) => <div key={label} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/55 p-2"><span className="block text-xs font-semibold text-slate-300">{label}</span><code className="mt-1 block break-all font-mono text-xs text-sky-200">{value}</code></div>)}</div>
      <p className="mt-2 text-xs text-slate-300">{t('Điều kiện thắng:', 'Winning condition:')} <code className="break-all font-mono text-emerald-200">SHA256(index ‖ timestamp ‖ previousHash ‖ merkleRoot ‖ nonce ‖ validator)</code> {t('bắt đầu bằng', 'starts with')} <strong className="font-mono">{'0'.repeat(difficulty)}</strong>.</p>
    </section>

    <WalletRaceConfig wallets={wallets.slice(0, walletCount)} disabled={mining} onChange={updateWallet} t={t} />

    <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-4"><header className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-100">{t('Mempool · giao dịch đã ký', 'Mempool · signed transactions')}</h3><p className="mt-1 text-xs text-slate-400">{t('Ví gửi/nhận lấy từ danh sách ví; giao dịch chỉ vào mempool sau khi kiểm tra ECDSA và số dư.', 'Wallets are selected below; mempool admission verifies ECDSA and balance.')}</p></div><span className="text-xs text-slate-300">{mempool.length} TX · {activeMempoolTotal.toFixed(4)} ETH</span></header>
      <div className="mt-3 grid gap-2 sm:grid-cols-4"><label className="text-xs text-slate-300">From<select value={fromId} onChange={(event) => setFromId(event.target.value)} className="mt-1 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2">{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {wallet.balance.toFixed(2)} ETH</option>)}</select></label><label className="text-xs text-slate-300">To<select value={toId} onChange={(event) => setToId(event.target.value)} className="mt-1 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2">{wallets.filter((wallet) => wallet.id !== fromId).map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label><label className="text-xs text-slate-300">Amount (ETH)<input type="number" min="0.00000001" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-slate-100" /></label><button type="button" onClick={() => void createTransaction()} aria-label={t('Tạo và ký giao dịch', 'Create and sign transaction')} className="mt-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-sky-300/25 px-3 text-xs font-semibold text-sky-100"><Send size={14} />{t('Ký + thêm giao dịch', 'Sign + add transaction')}</button></div>
      {txError && <p role="alert" className="mt-2 text-xs text-rose-200">{txError}</p>}
      <div className="mt-3 max-h-36 space-y-1 overflow-y-auto">{mempool.map((tx) => <div key={tx.id} className="grid grid-cols-[1fr_auto] gap-2 rounded border border-slate-800 bg-slate-950/50 p-2 text-xs"><span className="truncate text-slate-200">{wallets.find((wallet) => wallet.address === tx.from)?.name} → {wallets.find((wallet) => wallet.address === tx.to)?.name} · {tx.amount} ETH</span><span className="text-emerald-200">ECDSA ✓ · nonce {tx.nonce}</span></div>)}{!mempool.length && <p className="text-xs text-slate-500">{t('Mempool đang trống.', 'Mempool is empty.')}</p>}</div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('Ví đang tham gia cuộc đua', 'Wallet hash race')}>
      {wallets.slice(0, walletCount).map((wallet) => {
        const miner = miners.find((item) => item.walletId === wallet.id)
        const progress = Math.min(100, (miner?.attempts ?? 0) / expectedTrials * 100)
        return <article key={wallet.id} className={`min-w-0 rounded-xl border bg-slate-900/80 p-3 ${miner?.status === 'winner' ? 'border-emerald-300/50 shadow-[0_0_20px_rgba(52,211,153,0.12)]' : miner?.status === 'mining' ? 'border-sky-300/35' : 'border-slate-800'}`}><header className="flex items-center justify-between gap-2"><strong className="truncate text-xs text-slate-100">{wallet.name}</strong>{miner?.status === 'winner' ? <Trophy size={15} className="text-amber-200" /> : <span className={`size-2 rounded-full ${miner?.status === 'mining' ? 'animate-pulse bg-sky-300' : 'bg-slate-600'}`} />}</header><code className="mt-1 block truncate font-mono text-xs text-slate-400">{wallet.address}</code><div className="mt-2 grid grid-cols-2 gap-1 text-xs"><span className="text-slate-400">Nonce</span><strong className="text-right font-mono text-slate-100">{miner?.nonce.toLocaleString() ?? '—'}</strong><span className="text-slate-400">Hashes</span><strong className="text-right font-mono text-slate-100">{miner?.attempts.toLocaleString() ?? '0'}</strong><span className="text-slate-400">Hash/s</span><strong className="text-right font-mono text-slate-100">{Math.round(miner?.hashesPerSecond ?? 0).toLocaleString()}</strong><span className="text-slate-400">Số dư</span><strong className="text-right font-mono text-slate-100">{wallet.balance.toFixed(2)} ETH</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-800"><div className={`h-full transition-[width] ${miner?.status === 'winner' ? 'bg-emerald-300' : 'bg-sky-300'}`} style={{ width: `${progress}%` }} /></div><code className="mt-2 block truncate font-mono text-xs text-slate-400">{miner?.latestHash || t('Chưa bắt đầu', 'Idle')}</code></article>
      })}
    </section>

    <div className="flex flex-wrap gap-2"><button type="button" onClick={startSingle} disabled={mining} aria-label={t('Bắt đầu một vòng khai thác', 'Start one mining round')} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/[0.07] px-4 text-xs font-semibold text-emerald-100 disabled:opacity-40"><Zap size={14} />{t('Bắt đầu cuộc đua', 'Start race')}</button><button type="button" onClick={startTen} disabled={mining} aria-label={t('Chạy 10 vòng liên tiếp', 'Run 10 consecutive rounds')} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-300/25 px-4 text-xs text-amber-100 disabled:opacity-40">{t('Chạy 10 vòng liên tiếp', 'Run 10 rounds')}</button>{mining && <button type="button" onClick={stopRace} className="inline-flex min-h-10 items-center rounded-md border border-rose-400/25 px-4 text-xs text-rose-200">{t('Dừng', 'Stop')}</button>}</div>
    {status && <p role="status" className="rounded-md border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">{status}</p>}
    {winner && <section className="rounded-xl border border-emerald-300/25 bg-emerald-300/[0.05] p-3" role="status"><h3 className="text-sm font-semibold text-emerald-100">{winner.walletName} · {t('phần thưởng', 'reward')} {rewardAmount} ETH</h3><p className="mt-1 text-xs text-slate-300">Nonce {winner.nonce.toLocaleString()} · {winner.attempts.toLocaleString()} hashes · {Math.round(winner.hashesPerSecond).toLocaleString()} hash/s · {winner.elapsedMs.toFixed(0)} ms</p><code className="mt-2 block break-all font-mono text-xs text-emerald-200">{winner.hash}</code></section>}
    {forkNotice && <aside role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/30 bg-amber-300/[0.06] p-3 text-xs text-amber-100"><span>{forkNotice}</span><a href="#" onClick={(event) => { event.preventDefault(); window.dispatchEvent(new CustomEvent('chainlab-mining-step', { detail: 3 })) }} className="font-semibold underline">{t('Mở bước 4 (P2P)', 'Open step 4 (P2P)')} →</a></aside>}
    {batchTotal > 1 && <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-3"><h3 className="text-sm font-semibold text-slate-100">{t('Thống kê cuộc đua', 'Race results')} · {batchDone}/{batchTotal}</h3><div className="mt-2 grid gap-1 sm:grid-cols-2">{wallets.slice(0, walletCount).map((wallet) => <p key={wallet.id} className="flex justify-between text-xs text-slate-300"><span>{wallet.name}</span><strong className="text-emerald-200">{wins[wallet.id] ?? 0} {t('lần thắng', 'wins')}</strong></p>)}</div></section>}
    <div className="grid gap-3 md:grid-cols-2"><section className="rounded-xl border border-slate-800 bg-slate-900/65 p-3"><h3 className="text-xs font-semibold text-slate-200">{t('Nonce được chia xen kẽ', 'Interleaved nonce ranges')}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{t('Mỗi worker nhận một lớp nonce riêng, cách nhau N; không worker nào thử trùng nonce. Block không phải genesis không dùng nonce 0 nên Ví A bắt đầu ở N. Ví B trong cuộc đua 4 ví: 213 = 1 + 4×53, tức lượt thử thứ 54.', 'Each worker gets a disjoint nonce lane separated by N. Non-genesis blocks skip nonce 0, so Wallet A starts at N. Wallet B in a four-worker race: 213 = 1 + 4×53, its 54th attempt.')}</p></section><section className="rounded-xl border border-slate-800 bg-slate-900/65 p-3"><h3 className="text-xs font-semibold text-slate-200">{t('Ví và chữ ký (Wallet fallback)', 'Wallet and signature fallback')}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{t('Workspace chưa có wallet store/API verify dùng chung; ví tạm có địa chỉ SHA-256 từ tên và khóa ECDSA cục bộ. Không có private key rời khỏi trình duyệt.', 'No shared wallet store/verify API exists yet; fallback addresses use SHA-256(name) and local ECDSA keys.')}</p></section></div>
  </div>
}

function WalletRaceConfig({ wallets, disabled, onChange, t }: { wallets: MiningWallet[]; disabled: boolean; onChange: (index: number, update: Partial<Pick<MiningWallet, 'name' | 'hashPower'>>) => void; t: (vi: string, en: string) => string }) {
  return <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><h3 className="text-sm font-semibold text-slate-100">{t('Ví tham gia · sức mạnh hash', 'Racing wallets · relative hash power')}</h3><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{wallets.map((wallet, index) => <article key={wallet.id} className="rounded-lg border border-slate-800 bg-slate-950/45 p-2"><label className="block text-xs text-slate-300">{t('Tên ví', 'Wallet name')}<input value={wallet.name} disabled={disabled} onChange={(event) => onChange(index, { name: event.target.value })} className="mt-1 min-h-9 w-full rounded border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100" /></label><div className="mt-2 flex items-center justify-between text-xs"><span className="text-slate-400">{t('Sức mạnh', 'Hash power')}</span><div className="flex gap-1">{([25, 50, 100] as const).map((power) => <button key={power} type="button" disabled={disabled} aria-pressed={wallet.hashPower === power} onClick={() => onChange(index, { hashPower: power })} className={`min-h-8 rounded border px-2 text-xs ${wallet.hashPower === power ? 'border-sky-300/40 bg-sky-300/10 text-sky-100' : 'border-slate-700 text-slate-400'}`}>{power}%</button>)}</div></div><p className="mt-1 text-xs text-slate-500">{t('Số dư', 'Balance')}: {wallet.balance.toFixed(2)} ETH · nonce {wallet.nonce}</p></article>)}</div></section>
}

function P2PNetwork({ t, store, chain }: { t: (vi: string, en: string) => string; store: ReturnType<typeof useMiningStore>; chain: Block[] }) {
  const [peers, setPeers] = useState<Peer[]>(() => store.wallets.map((wallet) => ({ id: `peer-${wallet.id}`, name: wallet.name, walletId: wallet.id, online: true, chain: getChainSnapshot(), mempool: [], malicious: false })))
  const [selectedPeerId, setSelectedPeerId] = useState(peers[0]?.id ?? '')
  const [originId, setOriginId] = useState(peers[0]?.id ?? '')
  const [delay, setDelay] = useState(180)
  const [jitter, setJitter] = useState(true)
  const [fromId, setFromId] = useState(store.wallets[0]?.id ?? '')
  const [toId, setToId] = useState(store.wallets[1]?.id ?? '')
  const [amount, setAmount] = useState('1')
  const [events, setEvents] = useState<NetworkEvent[]>([])
  const [packets, setPackets] = useState<Packet[]>([])
  const [clockNow, setClockNow] = useState(0)
  const [pendingBlock, setPendingBlock] = useState<Block | null>(null)
  const [txError, setTxError] = useState('')
  const [running, setRunning] = useState(false)
  const [orphans, setOrphans] = useState<Block[]>([])
  const [forkNotice, setForkNotice] = useState(sessionStorage.getItem(forkNoticeKey) ?? '')
  const workerRef = useRef<Worker[]>([])
  const timersRef = useRef<number[]>([])
  const selectedPeer = peers.find((peer) => peer.id === selectedPeerId) ?? peers[0]
  const origin = peers.find((peer) => peer.id === originId) ?? peers[0]
  const selectedWallet = store.wallets.find((wallet) => wallet.id === selectedPeer?.walletId)

  useEffect(() => () => {
    terminateWorkerArray(workerRef)
    clearTimerList(timersRef)
  }, [])

  useEffect(() => {
    void ensureMiningWalletKeys()
  }, [])

  useEffect(() => {
    if (!packets.length) return
    const interval = window.setInterval(() => setClockNow(performance.now()), 50)
    return () => window.clearInterval(interval)
  }, [packets.length])

  function log(node: string, text: string, kind: NetworkEvent['kind'] = 'info') {
    setEvents((current) => [{ id: crypto.randomUUID(), time: nowText(localStorage.getItem('hubblock-language') === 'EN' ? 'EN' : 'VN'), node, text, kind }, ...current].slice(0, 40))
  }

  function delayForHop() {
    return Math.max(20, delay + (jitter ? Math.round((Math.random() * 2 - 1) * delay * 0.35) : 0))
  }

  function animatePacket(from: string, to: string, hopDelay: number) {
    const id = crypto.randomUUID()
    setPackets((current) => [...current, { id, from, to, startedAt: performance.now(), duration: hopDelay }])
    const timer = window.setTimeout(() => setPackets((current) => current.filter((packet) => packet.id !== id)), hopDelay)
    timersRef.current.push(timer)
  }

  async function makeAndBroadcastTransaction() {
    if (!origin || !selectedWallet) return
    setTxError('')
    const created = await createSignedTransaction(fromId, toId === fromId ? store.wallets.find((wallet) => wallet.id !== fromId)?.address ?? '' : store.wallets.find((wallet) => wallet.id === toId)?.address ?? '', amount)
    if (!created.transaction) { setTxError(created.error ?? t('Không thể ký giao dịch.', 'Unable to sign transaction.')); return }
    const verification = await verifyMiningTransaction(created.transaction, store.wallets, store.mempool)
    if (!verification.valid) { setTxError(verification.reason); return }
    setPeers((current) => current.map((peer) => peer.id === origin.id ? { ...peer, mempool: [...peer.mempool, created.transaction!] } : peer))
    log(origin.name, t(`Tạo giao dịch đã ký ${shortHash(created.transaction.id)}.`, `Created signed transaction ${shortHash(created.transaction.id)}.`))
    await broadcastTransaction(created.transaction, origin.id)
  }

  async function broadcastTransaction(transaction: SignedMiningTransaction, sourcePeerId: string) {
    const source = peers.find((peer) => peer.id === sourcePeerId)
    if (!source) return
    for (const peer of peers) {
      if (peer.id === source.id || !peer.online) continue
      const latency = delayForHop()
      animatePacket(source.id, peer.id, latency)
      await new Promise((resolve) => window.setTimeout(resolve, latency))
      const current = getMiningSnapshot()
      const localPeer = peers.find((item) => item.id === peer.id)
      const verification = await verifyMiningTransaction(transaction, current.wallets, localPeer?.mempool ?? [])
      if (!verification.valid) {
        log(peer.name, `${t('TX bị từ chối:', 'TX rejected:')} ${verification.reason}`, 'reject')
        continue
      }
      setPeers((items) => items.map((item) => item.id === peer.id ? { ...item, mempool: item.mempool.some((tx) => tx.id === transaction.id) ? item.mempool : [...item.mempool, transaction] } : item))
      log(peer.name, `${t('TX đã xác minh và vào mempool:', 'Verified TX accepted into mempool:')} ${shortHash(transaction.id)}`, 'accept')
    }
  }

  async function startNodeMining() {
    if (!selectedPeer || !selectedWallet || running) return
    setRunning(true)
    const validated = await validateMempool(selectedPeer.mempool, store.wallets)
    if (!validated.valid) { setRunning(false); log(selectedPeer.name, validated.reason, 'reject'); return }
    const base = selectedPeer.chain
    const timestamp = new Date().toISOString()
    const round = Date.now().toString()
    const templates = store.wallets.map((wallet) => makeCandidate(base, [...validated.transactions, signedReward(wallet, `${round}-${wallet.id}`)], wallet, difficultyFor(chain), timestamp))
    const workerPromises = store.wallets.map((wallet, index) => new Promise<RaceWinner>((resolve, reject) => {
      const worker = spawnMiningWorker(wallet, templates[index], index, store.wallets.length, difficultyFor(chain), false, (event) => {
        if (event.data.type === 'found') resolve(event.data)
        else if (event.data.type === 'error') reject(new Error(event.data.message))
      })
      workerRef.current.push(worker)
    }))
    try {
      const result = await Promise.any(workerPromises)
      workerRef.current.forEach((worker) => { worker.postMessage({ type: 'cancel' }); worker.terminate() })
      workerRef.current = []
      const template = templates.find((item) => item.validator === result.validatorAddress)!
      const winner = store.wallets.find((wallet) => wallet.id === result.workerId)!
      const block: Block = { ...template, nonce: result.nonce, hash: result.hash }
      setPendingBlock(block)
      log(selectedPeer.name, `${winner.name} ${t('đào xong block', 'mined block')} #${block.index} · ${result.attempts.toLocaleString()} ${t('hash', 'hashes')}.`, 'accept')
    } catch (error) {
      log(selectedPeer.name, error instanceof Error ? error.message : t('Mining thất bại.', 'Mining failed.'), 'reject')
    } finally {
      workerRef.current.forEach((worker) => worker.terminate())
      workerRef.current = []
      setRunning(false)
    }
  }

  async function broadcastMinedBlock(block = pendingBlock) {
    if (!block || !origin) return
    setRunning(true)
    const acceptedPeerIds: string[] = []
    const txs = block.transactions.filter((transaction) => !transaction.id.startsWith('reward-')) as SignedMiningTransaction[]
    for (const peer of peers) {
      if (!peer.online) { log(peer.name, t('Node offline, bỏ lỡ block.', 'Node is offline and missed the block.')); continue }
      const latency = delayForHop()
      animatePacket(origin.id, peer.id, latency)
      await new Promise((resolve) => window.setTimeout(resolve, latency))
      const verification = await verifyPeerTransactions(txs, store.wallets, [])
      const blockCheck = validatePeerBlock(block, peer.chain, block.difficulty, verification.valid)
      if (!blockCheck.valid) { log(peer.name, `${t('Từ chối block:', 'Block rejected:')} ${blockCheck.reason}`, 'reject'); continue }
      acceptedPeerIds.push(peer.id)
      setPeers((current) => current.map((node) => node.id === peer.id ? { ...node, chain: [...node.chain, block], mempool: node.mempool.filter((tx) => !txs.some((included) => included.id === tx.id)) } : node))
      log(peer.name, `${t('Chấp nhận block', 'Accepted block')} #${block.index} · ${shortHash(block.hash)}.`, 'accept')
    }
    if (!acceptedPeerIds.length) {
      log(origin.name, t('Không node nào chấp nhận block; chain và số dư không đổi.', 'No peer accepted the block; chain and balances unchanged.'), 'reject')
      setRunning(false)
      return
    }
    const acceptedChains = peers.filter((peer) => acceptedPeerIds.includes(peer.id)).map((peer) => [...peer.chain, block])
    const longest = selectLongestChain([...acceptedChains, chain])
    replaceChain(longest)
    if (longest.some((candidate) => candidate.hash === block.hash)) {
      const miner = store.wallets.find((wallet) => wallet.address === block.validator)
      settleMinedTransactions(txs, miner?.id ?? '', Number(rewardAmount))
    } else {
      setOrphans((current) => [...current, block])
      log(origin.name, `${t('Block không nằm trong chuỗi dài nhất:', 'Block was not selected as the longest-chain tip:')} ${shortHash(block.hash)}`, 'fork')
    }
    setPendingBlock(null)
    setRunning(false)
  }

  async function simulateMaliciousBlock() {
    const base = getChainSnapshot()
    const latest = base.at(-1)!
    const wallet = store.wallets[0]
    const transaction: SignedMiningTransaction = { id: 'forged-tx', from: wallet.address, to: store.wallets[1].address, amount: '999999', nonce: wallet.nonce, signatureStatus: 'signed', signature: '' }
    const fake: Block = { ...makeCandidate(base, [transaction], wallet, difficultyFor(chain)), merkleRoot: latest.merkleRoot, hash: latest.hash, nonce: latest.nonce }
    for (const peer of peers.filter((item) => item.online)) {
      const txResult = await verifyPeerTransactions([transaction], store.wallets, [])
      const result = validatePeerBlock(fake, peer.chain, fake.difficulty, txResult.valid)
      log(peer.name, `${t('Block độc hại bị từ chối:', 'Malicious block rejected:')} ${txResult.reason || result.reason}`, 'reject')
    }
  }

  async function mineForkCandidate(base: Block[], wallet: MiningWallet, tag: string): Promise<Block> {
    const template = makeCandidate(base, [signedReward(wallet, `fork-reward-${tag}`)], wallet, difficultyFor(chain), `${new Date().toISOString()}-${tag}`)
    return new Promise((resolve, reject) => {
      const worker = spawnMiningWorker(wallet, template, 0, 1, template.difficulty, false, (event) => {
        if (event.data.type === 'found') { worker.terminate(); workerRef.current = workerRef.current.filter((item) => item !== worker); resolve({ ...template, nonce: event.data.nonce, hash: event.data.hash }) }
        else if (event.data.type === 'error') { worker.terminate(); reject(new Error(event.data.message)) }
      })
      workerRef.current.push(worker)
    })
  }

  async function simulateFork() {
    if (running || store.wallets.length < 3) return
    setRunning(true)
    setForkNotice('')
    const base = getChainSnapshot()
    const [first, competing] = await Promise.all([mineForkCandidate(base, store.wallets[0], 'A'), mineForkCandidate(base, store.wallets[1], 'B')])
    log(peers[0].name, `${t('Hai miner đào xong cùng chiều cao:', 'Two miners found blocks at the same height:')} ${shortHash(first.hash)} / ${shortHash(competing.hash)}.`, 'fork')
    const extension = await mineForkCandidate([...base, first], store.wallets[2], 'A-child')
    const shortBranch = [...base, competing]
    const longBranch = [...base, first, extension]
    const chosen = selectLongestChain([shortBranch, longBranch])
    const orphan = chosen === longBranch ? competing : first
    setOrphans((current) => [...current, orphan])
    replaceChain(chosen)
    setPeers((current) => current.map((peer, index) => ({ ...peer, chain: index < 2 ? longBranch : shortBranch })))
    setForkNotice(`${t('Fork mô phỏng: mạng chọn nhánh dài hơn; block mồ côi', 'Simulated fork: longest chain wins; orphan block')} ${shortHash(orphan.hash)}.`)
    log('Network', t('Đã chọn chuỗi dài nhất; block cạnh tranh được đánh dấu orphan.', 'Longest chain selected; competing block marked orphan.'), 'fork')
    setTimeout(() => setPeers((current) => current.map((peer) => ({ ...peer, chain: chosen }))), delayForHop())
    setRunning(false)
  }

  function toggleOffline(peer: Peer) {
    if (peer.online) {
      setPeers((current) => current.map((node) => node.id === peer.id ? { ...node, online: false } : node))
      log(peer.name, t('Node chuyển offline.', 'Node went offline.'))
    } else {
      const longest = selectLongestChain(peers.filter((node) => node.online).map((node) => node.chain))
      setPeers((current) => current.map((node) => node.id === peer.id ? { ...node, online: true, chain: longest } : node))
      log(peer.name, `${t('Node online, đồng bộ', 'Node online and synced to')} height ${longest.length - 1}.`, 'accept')
    }
  }

  const nodePositions = useMemo(() => peers.map((peer, index) => {
    const angle = -Math.PI / 2 + 2 * Math.PI * index / peers.length
    return { id: peer.id, name: peer.name, x: 260 + Math.cos(angle) * 190, y: 155 + Math.sin(angle) * 105 }
  }), [peers])
  const latest = selectedPeer?.chain.at(-1)

  return <div className="space-y-4">
    <section className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/75 p-3"><div><h3 className="text-sm font-semibold text-slate-100">{t('Mạng P2P trong trình duyệt', 'Browser P2P simulation')}</h3><p className="mt-1 text-xs text-slate-400">{t('Không có kết nối mạng thật. Hash và Proof of Work là thật.', 'No real network connection. Hashing and proof of work are real.')}</p></div><label className="min-w-48 text-xs text-slate-300">{t('Độ trễ tổng', 'Base latency')} · {delay} ms<input type="range" min="50" max="600" step="25" value={delay} onChange={(event) => setDelay(Number(event.target.value))} className="mt-1 block w-full accent-sky-300" /></label><label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={jitter} onChange={(event) => setJitter(event.target.checked)} />{t('Dao động ngẫu nhiên', 'Random jitter')}</label></section>

    <div className="grid gap-3 xl:grid-cols-[1fr_.8fr]"><section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/75 p-3"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-100">{t('Sơ đồ mesh P2P', 'P2P mesh topology')} · {peers.length} {t('node', 'nodes')}</h3><span className="text-xs text-slate-400">{packets.length} {t('gói đang truyền', 'packets in flight')}</span></div><svg viewBox="0 0 520 310" className="w-full" role="img" aria-label={t('Sơ đồ mesh P2P và các gói tin đang lan truyền', 'P2P mesh topology and in-flight packets')}>
      {nodePositions.flatMap((source, index) => nodePositions.slice(index + 1).map((target) => <line key={`${source.id}-${target.id}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#334155" strokeWidth="2" strokeDasharray="5 5" />))}
      {packets.map((packet) => { const from = nodePositions.find((node) => node.id === packet.from); const to = nodePositions.find((node) => node.id === packet.to); if (!from || !to) return null; const progress = Math.min(1, Math.max(0, (clockNow - packet.startedAt) / packet.duration)); const x = from.x + (to.x - from.x) * progress; const y = from.y + (to.y - from.y) * progress; return <g key={packet.id}><motion.circle r="6" fill="#38bdf8" initial={{ cx: from.x, cy: from.y }} animate={{ cx: to.x, cy: to.y }} transition={{ duration: packet.duration / 1000, ease: 'linear' }} /><text x={x} y={y - 10} textAnchor="middle" fill="#bae6fd" fontSize="10">{Math.round(clockNow - packet.startedAt)} ms</text></g> })}
      {nodePositions.map((point) => { const peer = peers.find((item) => item.id === point.id)!; const chosen = selectedPeerId === peer.id; return <g key={peer.id} role="button" tabIndex={0} aria-label={`${peer.name}, ${t('height', 'height')} ${peer.chain.length - 1}, ${peer.online ? 'online' : 'offline'}`} onClick={() => setSelectedPeerId(peer.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedPeerId(peer.id) }} className="cursor-pointer"><circle cx={point.x} cy={point.y} r={chosen ? 31 : 27} fill={peer.online ? chosen ? '#0c4a6e' : '#0f172a' : '#3f1d2e'} stroke={peer.malicious ? '#fb7185' : chosen ? '#38bdf8' : peer.online ? '#34d399' : '#fb7185'} strokeWidth="3" /><text x={point.x} y={point.y - 3} fill="#e2e8f0" textAnchor="middle" fontSize="11">{peer.name.split(' ').at(-1)}</text><text x={point.x} y={point.y + 12} fill="#94a3b8" textAnchor="middle" fontSize="9">H{peer.chain.length - 1}</text></g> })}
    </svg><div className="flex flex-wrap gap-2 text-xs text-slate-300"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-emerald-300" />{t('Node online', 'Online node')}</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-300" />{t('Offline / orphan', 'Offline / orphan')}</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-300" />{t('Gói tin', 'Packet')}</span></div></section>

    <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-3"><h3 className="text-sm font-semibold text-slate-100">{t('Tạo giao dịch tại node', 'Create transaction at node')}</h3><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-xs text-slate-300">{t('Node nguồn', 'Source node')}<select value={originId} onChange={(event) => setOriginId(event.target.value)} className="mt-1 min-h-9 w-full rounded border border-slate-700 bg-slate-950 px-2">{peers.map((peer) => <option key={peer.id} value={peer.id}>{peer.name}</option>)}</select></label><label className="text-xs text-slate-300">{t('Ví gửi', 'From wallet')}<select value={fromId} onChange={(event) => setFromId(event.target.value)} className="mt-1 min-h-9 w-full rounded border border-slate-700 bg-slate-950 px-2">{store.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {wallet.balance.toFixed(2)} ETH</option>)}</select></label><label className="text-xs text-slate-300">{t('Ví nhận', 'To wallet')}<select value={toId} onChange={(event) => setToId(event.target.value)} className="mt-1 min-h-9 w-full rounded border border-slate-700 bg-slate-950 px-2">{store.wallets.filter((wallet) => wallet.id !== fromId).map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label><label className="text-xs text-slate-300">{t('Số tiền', 'Amount')} (ETH)<input type="number" min="0.00000001" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 min-h-9 w-full rounded border border-slate-700 bg-slate-950 px-2" /></label></div><button type="button" onClick={() => void makeAndBroadcastTransaction()} disabled={running || !origin?.online} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded border border-sky-300/25 px-3 text-xs text-sky-100 disabled:opacity-40"><Send size={13} />{t('Ký, xác minh, broadcast', 'Sign, verify, broadcast')}</button>{txError && <p role="alert" className="mt-2 text-xs text-rose-200">{txError}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void startNodeMining()} disabled={running || !selectedPeer?.online || !selectedPeer?.mempool.length} className="inline-flex min-h-9 items-center gap-2 rounded border border-emerald-300/25 px-3 text-xs text-emerald-100 disabled:opacity-40"><Cpu size={13} />{t('Miner đào mempool', 'Mine node mempool')}</button><button type="button" onClick={() => void broadcastMinedBlock()} disabled={running || !pendingBlock} className="inline-flex min-h-9 items-center gap-2 rounded border border-emerald-300/25 px-3 text-xs text-emerald-100 disabled:opacity-40"><Blocks size={13} />{t('Broadcast block', 'Broadcast block')}</button></div>
      {selectedPeer && <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-xs"><h4 className="font-semibold text-slate-200">{selectedPeer.name} · {selectedPeer.online ? t('online', 'online') : t('offline', 'offline')}</h4><p className="mt-1 text-slate-400">{t('Chiều cao', 'Height')} {selectedPeer.chain.length - 1} · tip {shortHash(latest?.hash ?? '')} · mempool {selectedPeer.mempool.length} TX</p><p className="mt-1 text-slate-400">{t('Các block trong chain riêng', 'Local chain blocks')}: {selectedPeer.chain.map((block) => `#${block.index} ${shortHash(block.hash)}`).join(' · ')}</p></div>}
    </section></div>

    <section className="grid gap-3 xl:grid-cols-[1fr_1fr]"><div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70"><h3 className="p-3 text-sm font-semibold text-slate-100">{t('Trạng thái các node', 'Node status summary')}</h3><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-950/60"><tr>{[t('Node', 'Node'), t('Trạng thái', 'Status'), t('Chiều cao', 'Height'), t('Hash tip', 'Tip hash'), 'Mempool', ''].map((label, index) => <th className="p-2 text-xs text-slate-300" key={`${label}-${index}`}>{label}</th>)}</tr></thead><tbody>{peers.map((peer) => <tr className="border-t border-slate-800" key={peer.id}><td className="p-2 text-xs text-slate-200">{peer.name}</td><td className="p-2 text-xs text-slate-300">{peer.online ? t('Online', 'Online') : t('Offline', 'Offline')}</td><td className="p-2 font-mono text-xs text-slate-300">{peer.chain.length - 1}</td><td className="p-2 font-mono text-xs text-slate-300">{shortHash(peer.chain.at(-1)?.hash ?? '')}</td><td className="p-2 text-xs text-slate-300">{peer.mempool.length} TX</td><td className="p-2"><button type="button" onClick={() => toggleOffline(peer)} aria-label={`${peer.online ? t('Đưa offline', 'Take offline') : t('Bật và đồng bộ', 'Bring online and sync')} ${peer.name}`} className="min-h-8 rounded border border-slate-700 px-2 text-xs text-slate-200">{peer.online ? <WifiOff size={13} /> : <Wifi size={13} />}</button></td></tr>)}</tbody></table></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><h3 className="text-sm font-semibold text-slate-100">{t('Kịch bản mạng (Network scenarios)', 'Network scenarios')}</h3><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => void makeAndBroadcastTransaction()} disabled={running || !origin?.online} className="min-h-9 rounded border border-slate-700 px-2 text-xs text-slate-200 disabled:opacity-40">(a) {t('Bình thường · TX → broadcast', 'Normal · TX → broadcast')}</button><button type="button" onClick={() => void simulateFork()} disabled={running} className="min-h-9 rounded border border-amber-300/25 px-2 text-xs text-amber-100 disabled:opacity-40">(b) {t('Fork · chuỗi dài nhất', 'Fork · longest chain')}</button><button type="button" onClick={() => void simulateMaliciousBlock()} disabled={running} className="min-h-9 rounded border border-rose-300/25 px-2 text-xs text-rose-100 disabled:opacity-40">(c) {t('Block độc hại', 'Malicious block')}</button><button type="button" onClick={() => selectedPeer && toggleOffline(selectedPeer)} disabled={running} className="min-h-9 rounded border border-sky-300/25 px-2 text-xs text-sky-100 disabled:opacity-40">(d) {t('Offline / đồng bộ', 'Offline / resync')}</button></div>{forkNotice && <p className="mt-2 rounded border border-amber-300/25 bg-amber-300/[0.05] p-2 text-xs text-amber-100">{forkNotice}</p>}{orphans.map((orphan) => <p key={orphan.hash} className="mt-2 rounded border border-rose-400/25 bg-rose-400/[0.05] p-2 text-xs text-rose-100">Orphan block #{orphan.index} · {shortHash(orphan.hash)}</p>)}<div className="mt-2 max-h-48 space-y-1 overflow-y-auto" aria-label={t('Event log có thời gian và node', 'Timestamped node event log')}>{events.map((event) => <p key={event.id} className={`text-xs leading-5 ${event.kind === 'reject' ? 'text-rose-200' : event.kind === 'fork' ? 'text-amber-100' : event.kind === 'accept' ? 'text-emerald-200' : 'text-slate-400'}`}><time className="font-mono text-slate-500">{event.time}</time> · [{event.node}] {event.text}</p>)}</div></div></section>
    <p className="flex items-center gap-2 text-xs text-slate-400"><Radio size={13} className="text-sky-300" />{t('Mạng là mô phỏng trong trình duyệt, không kết nối thật; SHA-256 và PoW được tính thật.', 'Browser-only simulation; no real network. SHA-256 and proof of work are real.')}</p>
  </div>
}

async function verifyPeerTransactions(transactions: SignedMiningTransaction[], wallets: MiningWallet[], pending: SignedMiningTransaction[]) {
  const verified: SignedMiningTransaction[] = []
  for (const transaction of transactions) {
    const result = await verifyMiningTransaction(transaction, wallets, [...pending, ...verified])
    if (!result.valid) return { valid: false, reason: result.reason }
    verified.push(transaction)
  }
  return { valid: true, reason: '' }
}

function difficultyFor(chain: Block[]) {
  return Math.max(1, chain.at(-1)?.difficulty ?? 4)
}

export default function TabMultiWalletMining({ architecture }: { architecture: Architecture }) {
  const t = useLanguage()
  const store = useMiningStore()
  const chain = useChain()
  return <div className="space-y-4">{architecture === 'workers' ? <MiningRace t={t} store={store} chain={chain} /> : <P2PNetwork t={t} store={store} chain={chain} />}</div>
}