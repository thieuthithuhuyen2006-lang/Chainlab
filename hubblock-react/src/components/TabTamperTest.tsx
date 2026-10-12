import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, RotateCcw, ShieldCheck, Undo2 } from 'lucide-react'
import type { Block } from '../lib/chain'
import { hashBlock, hashTransaction, merkleRoot, validateChain } from '../lib/chain'
import { getChainSnapshot, replaceChain, resetChain, setChainDifficulty, undoChainChange, canUndoChainChange } from '../lib/chainStore'
import { useChain } from '../lib/useChain'
import { useBi, useLanguage } from '../lib/useLanguage'
import { playSound } from '../lib/sound'
import TransactionTable from './TransactionTable'
import RealityCheck from './RealityCheck'
import LearningGoals from './LearningGoals'

type WorkerResult =
  | { type: 'block'; index: number; attempts: number; elapsedMs: number }
  | { type: 'done'; chain: Block[] }
  | { type: 'error'; message: string }

type Status = { vi: string; en: string }

export default function TabTamperTest() {
  const chain = useChain()
  const language = useLanguage()
  const b = useBi()
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [isMining, setIsMining] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [progress, setProgress] = useState<{ index: number; attempts: number; elapsedMs: number }[]>([])
  const workerRef = useRef<Worker | null>(null)
  const selectedBlock = chain[Math.min(selectedIndex, chain.length - 1)]
  const checks = useMemo(() => validateChain(chain, chain[0]?.difficulty ?? 3, language === 'VN' ? 'vn' : 'en'), [chain, language])

  useEffect(() => () => workerRef.current?.terminate(), [])

  function validateNow() {
    const invalidCount = checks.filter((check) => !check.valid).length
    playSound(invalidCount === 0 ? 'verified' : 'error')
    setStatus(invalidCount === 0
      ? { vi: 'Kiểm tra xong: toàn bộ chain hợp lệ.', en: 'Check complete: the whole chain is valid.' }
      : { vi: `Kiểm tra xong: ${invalidCount} block chưa hợp lệ; xem checklist từng block.`, en: `Check complete: ${invalidCount} invalid blocks; see the checklist of each block.` })
  }

  function undo() {
    if (undoChainChange()) { playSound('undo'); setStatus({ vi: 'Đã hoàn tác thay đổi gần nhất.', en: 'Undid the latest change.' }) }
  }

  function reset() {
    workerRef.current?.terminate()
    workerRef.current = null
    setIsMining(false)
    setProgress([])
    resetChain()
    setSelectedIndex(1)
    playSound('undo')
    setStatus({ vi: 'Chain đã được đặt lại.', en: 'Chain has been reset.' })
  }

  function remine(fromIndex = selectedIndex) {
    if (isMining) return
    const worker = new Worker(new URL('./chain.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current?.terminate()
    workerRef.current = worker
    setProgress([])
    setIsMining(true)
    setStatus({ vi: `Đang re-mine từ block ${fromIndex} đến cuối chain…`, en: `Re-mining from block ${fromIndex} to the end of the chain…` })
    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      const result = event.data
      if (result.type === 'block') {
        setProgress((current) => [...current.filter((item) => item.index !== result.index), { index: result.index, attempts: result.attempts, elapsedMs: result.elapsedMs }])
        return
      }
      setIsMining(false)
      worker.terminate()
      workerRef.current = null
      if (result.type === 'done') {
        replaceChain(result.chain)
        playSound('mined')
        setStatus({ vi: `Đã re-mine ${result.chain.length - fromIndex} block; các liên kết phía sau đã được cập nhật.`, en: `Re-mined ${result.chain.length - fromIndex} blocks; the following links were updated.` })
      } else { playSound('error'); setStatus({ vi: `Lỗi mining: ${result.message}`, en: `Mining error: ${result.message}` }) }
    }
    worker.onerror = () => {
      worker.terminate()
      workerRef.current = null
      setIsMining(false)
      playSound('error')
      setStatus({ vi: 'Worker gặp lỗi khi re-mine chain.', en: 'Worker error while re-mining the chain.' })
    }
    worker.postMessage({ type: 'remine', chain: getChainSnapshot(), startIndex: fromIndex, difficulty: chain[0]?.difficulty ?? 3 })
  }

  return <div className="space-y-4" aria-label={b('Sửa dữ liệu và kiểm tra chuỗi block', 'Edit data and validate the block chain')}>
    <section className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/75 p-3"><div><h3 className="text-sm font-semibold text-slate-100">{b('Difficulty (độ khó Proof of Work)', 'Difficulty (Proof of Work)')}</h3><p className="mt-1 text-xs text-slate-400">{b('Block mới phải có nonce khác 0 và hash mở đầu bằng số 0 hex đã chọn.', 'A new block must have a nonzero nonce and a hash starting with the chosen number of hex zeros.')}</p></div><label className="flex min-w-56 flex-1 items-center gap-3 text-xs text-slate-300">{chain[0]?.difficulty ?? 3} zero<input aria-label={b('Mining difficulty 1 đến 5', 'Mining difficulty 1 to 5')} type="range" min="1" max="5" value={chain[0]?.difficulty ?? 3} disabled={isMining} onChange={(event) => setChainDifficulty(Number(event.target.value))} className="w-full accent-emerald-300" /></label></section>

    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label={b('Checklist từng block', 'Per-block checklist')}>{chain.map((block, index) => {
      const result = checks[index]
      const calculatedMerkle = merkleRoot(block.transactions.map(hashTransaction))
      const recalculatedHash = hashBlock({ ...block, merkleRoot: calculatedMerkle })
      return <article key={block.index} className={`flex min-h-full flex-col rounded-xl border p-3 ${selectedIndex === index ? 'border-sky-300/40 bg-sky-300/[0.05]' : result.valid ? 'border-slate-800 bg-slate-900/70' : 'border-rose-400/30 bg-rose-400/[0.035]'}`}><button type="button" onClick={() => setSelectedIndex(index)} aria-pressed={selectedIndex === index} className="flex items-center justify-between gap-2 text-left"><strong className="text-sm text-slate-100">Block #{index}</strong><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${result.valid ? 'text-emerald-200' : 'text-rose-200'}`}>{result.valid ? <Check size={14} /> : <AlertTriangle size={14} />}{result.valid ? b('Hợp lệ', 'Valid') : b('Lỗi', 'Invalid')}</span></button>
        <div className="mt-2 flex-1 space-y-1.5">{[[result.hash, b('Hash tính lại = hash lưu', 'Recomputed hash = stored hash')], [result.merkle, b('Merkle root khớp transactions', 'Merkle root matches transactions')], [result.previous, b('PreviousHash khớp block trước', 'Previous hash matches previous block')], [result.proofOfWork, b('PoW đạt difficulty', 'PoW meets difficulty')]].map(([valid, label], checkIndex) => <p key={checkIndex} className={`flex items-start gap-1.5 text-xs leading-4 ${valid ? 'text-emerald-200' : 'text-rose-200'}`}>{valid ? <Check size={13} className="mt-0.5 shrink-0" /> : <XMark />}<span>{label}{!valid && result.reasons[checkIndex] ? ` · ${result.reasons[checkIndex]}` : ''}</span></p>)}</div>
        <div className="mt-3 space-y-2"><HashDiff title={b('Stored hash (trước khi sửa)', 'Stored hash (before edit)')} stored={block.hash} calculated={recalculatedHash} /><HashDiff title={b('Hash tính lại', 'Recomputed hash')} stored={recalculatedHash} calculated={block.hash} /></div>
        <button type="button" onClick={() => { setSelectedIndex(index); remine(index) }} disabled={isMining} title={b('Đào lại block này và cập nhật previousHash cho tất cả block sau nó.', 'Re-mine this block and update previousHash for every block after it.')} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-emerald-300/25 px-2 text-xs font-semibold text-emerald-100 hover:border-emerald-300/50 disabled:cursor-wait disabled:opacity-45">Re-mine from block #{index}</button>
      </article>
    })}</section>

    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 p-3"><div><h3 className="text-sm font-semibold text-slate-100">{b('Sửa dữ liệu (Tamper test)', 'Tamper test')} · Block #{selectedBlock.index}</h3><p className="mt-1 text-xs text-slate-400">{b('(1) sửa một giao dịch · (2) xem hash/trạng thái đổi · (3) block sau lỗi previousHash · (4) re-mine.', '(1) edit a transaction · (2) watch the hash/state change · (3) the next block breaks its previousHash · (4) re-mine.')}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={validateNow} title={b('Tính lại hash, Merkle root, previous hash và kiểm tra PoW mà không thay đổi chain.', 'Recompute hash, Merkle root, previous hash and check PoW without changing the chain.')} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-sky-300/25 px-3 text-xs text-sky-100"><ShieldCheck size={14} />{b('Kiểm tra lại (Validate)', 'Validate')}</button><button type="button" onClick={undo} disabled={isMining || !canUndoChainChange()} aria-label={b('Hoàn tác thay đổi gần nhất', 'Undo the latest change')} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs text-slate-200 disabled:opacity-40"><Undo2 size={14} />{b('Hoàn tác', 'Undo')}</button><button type="button" onClick={reset} disabled={isMining} aria-label={b('Reset chain về trạng thái ban đầu', 'Reset the chain to its initial state')} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-rose-400/25 px-3 text-xs text-rose-200 disabled:opacity-40"><RotateCcw size={14} />{b('Reset chain', 'Reset chain')}</button></div></header>
      <div className="p-3"><TransactionTable block={selectedBlock} /><p className="mt-2 text-xs text-slate-400">Block #{selectedBlock.index} · {b('Previous hash', 'Previous hash')}: <code className="break-all font-mono text-amber-100">{selectedBlock.previousHash}</code></p></div>
    </section>

    {isMining && <section className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.04] p-3" role="status" aria-live="polite"><h3 className="text-sm font-semibold text-emerald-100">{b('Đang khai thác trên Web Worker…', 'Mining in the Web Worker…')}</h3><div className="mt-2 space-y-1">{progress.map((item) => <p key={item.index} className="text-xs text-slate-200">{b(`Block #${item.index}: ${item.attempts.toLocaleString()} lần thử · ${item.elapsedMs.toFixed(2)} ms`, `Block #${item.index}: ${item.attempts.toLocaleString()} attempts · ${item.elapsedMs.toFixed(2)} ms`)}</p>)}</div><div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full w-full origin-left animate-pulse bg-emerald-300" /></div></section>}
    {status && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">{language === 'VN' ? status.vi : status.en}</p>}
    {!isMining && progress.length > 0 && <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><h3 className="text-sm font-semibold text-slate-100">{b('Kết quả re-mine', 'Re-mine results')}</h3>{progress.map((item) => <p key={item.index} className="mt-1 text-xs text-slate-300">{b(`Block #${item.index}: ${item.attempts.toLocaleString()} lần thử · ${item.elapsedMs.toFixed(2)} ms`, `Block #${item.index}: ${item.attempts.toLocaleString()} attempts · ${item.elapsedMs.toFixed(2)} ms`)}</p>)}</section>}
    <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs font-semibold leading-5 text-amber-100">{b('Sửa block k buộc đào lại n−k block; thời gian tăng theo difficulty.', 'Editing block k forces re-mining of n−k blocks; the time grows with difficulty.')}</p>
    <RealityCheck />
    <LearningGoals />
  </div>
}

function XMark() {
  return <span aria-hidden="true" className="mt-0.5 shrink-0 font-bold">✗</span>
}

function HashDiff({ title, stored, calculated }: { title: string; stored: string; calculated: string }) {
  return <div className="min-w-0 overflow-hidden rounded-md border border-slate-800 bg-slate-950/60 p-2"><span className="mb-1 block text-xs font-semibold text-slate-300">{title}</span><code className="block w-full break-all font-mono text-[11px] leading-5 tracking-tight" aria-label={`${title}: ${stored}`}>{Array.from({ length: 8 }, (_, group) => <span className="inline" key={group}>{[...stored.slice(group * 8, group * 8 + 8)].map((character, offset) => { const index = group * 8 + offset; return <span key={index} className={`rounded-sm px-px ${character === calculated[index] ? 'text-slate-300' : 'bg-rose-400/20 text-rose-200'}`}>{character}</span> })}</span>)}</code></div>
}