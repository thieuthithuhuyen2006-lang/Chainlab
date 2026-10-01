import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, RotateCcw, ShieldCheck, Undo2 } from 'lucide-react'
import type { Block } from '../lib/chain'
import { hashBlock, hashTransaction, merkleRoot, validateChain } from '../lib/chain'
import { getChainSnapshot, replaceChain, resetChain, setChainDifficulty, undoChainChange, canUndoChainChange } from '../lib/chainStore'
import { useChain } from '../lib/useChain'
import TransactionTable from './TransactionTable'

type WorkerResult =
  | { type: 'block'; index: number; attempts: number; elapsedMs: number }
  | { type: 'done'; chain: Block[] }
  | { type: 'error'; message: string }

export default function TabTamperTest() {
  const chain = useChain()
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [isMining, setIsMining] = useState(false)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState<{ index: number; attempts: number; elapsedMs: number }[]>([])
  const workerRef = useRef<Worker | null>(null)
  const selectedBlock = chain[Math.min(selectedIndex, chain.length - 1)]
  const checks = useMemo(() => validateChain(chain, chain[0]?.difficulty ?? 3), [chain])

  useEffect(() => () => workerRef.current?.terminate(), [])

  function validateNow() {
    const invalidCount = checks.filter((check) => !check.valid).length
    setStatus(invalidCount === 0 ? 'Kiểm tra xong: toàn bộ chain hợp lệ.' : `Kiểm tra xong: ${invalidCount} block chưa hợp lệ; xem checklist từng block.`)
  }

  function undo() {
    if (undoChainChange()) setStatus('Đã hoàn tác thay đổi gần nhất.')
  }

  function reset() {
    workerRef.current?.terminate()
    workerRef.current = null
    setIsMining(false)
    setProgress([])
    resetChain()
    setSelectedIndex(1)
    setStatus('Chain đã được đặt lại.')
  }

  function remine(fromIndex = selectedIndex) {
    if (isMining) return
    const worker = new Worker(new URL('./chain.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current?.terminate()
    workerRef.current = worker
    setProgress([])
    setIsMining(true)
    setStatus(`Đang re-mine từ block ${fromIndex} đến cuối chain…`)
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
        setStatus(`Đã re-mine ${result.chain.length - fromIndex} block; các liên kết phía sau đã được cập nhật.`)
      } else setStatus(`Mining error: ${result.message}`)
    }
    worker.onerror = () => {
      worker.terminate()
      workerRef.current = null
      setIsMining(false)
      setStatus('Worker gặp lỗi khi re-mine chain.')
    }
    worker.postMessage({ type: 'remine', chain: getChainSnapshot(), startIndex: fromIndex, difficulty: chain[0]?.difficulty ?? 3 })
  }

  return <div className="space-y-4" aria-label="Sửa dữ liệu và kiểm tra chuỗi block">
    <section className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/75 p-3"><div><h3 className="text-sm font-semibold text-slate-100">Difficulty (độ khó Proof of Work)</h3><p className="mt-1 text-xs text-slate-400">Block mới phải có nonce khác 0 và hash mở đầu bằng số 0 hex đã chọn.</p></div><label className="flex min-w-56 flex-1 items-center gap-3 text-xs text-slate-300">{chain[0]?.difficulty ?? 3} zero<input aria-label="Mining difficulty 1 đến 5" type="range" min="1" max="5" value={chain[0]?.difficulty ?? 3} disabled={isMining} onChange={(event) => setChainDifficulty(Number(event.target.value))} className="w-full accent-emerald-300" /></label></section>

    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Checklist từng block">{chain.map((block, index) => {
      const result = checks[index]
      const calculatedMerkle = merkleRoot(block.transactions.map(hashTransaction))
      const recalculatedHash = hashBlock({ ...block, merkleRoot: calculatedMerkle })
      return <article key={block.index} className={`flex min-h-full flex-col rounded-xl border p-3 ${selectedIndex === index ? 'border-sky-300/40 bg-sky-300/[0.05]' : result.valid ? 'border-slate-800 bg-slate-900/70' : 'border-rose-400/30 bg-rose-400/[0.035]'}`}><button type="button" onClick={() => setSelectedIndex(index)} aria-pressed={selectedIndex === index} className="flex items-center justify-between gap-2 text-left"><strong className="text-sm text-slate-100">Block #{index}</strong><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${result.valid ? 'text-emerald-200' : 'text-rose-200'}`}>{result.valid ? <Check size={14} /> : <AlertTriangle size={14} />}{result.valid ? 'Hợp lệ' : 'Lỗi'}</span></button>
        <div className="mt-2 flex-1 space-y-1.5">{[[result.hash, 'Hash tính lại = hash lưu'], [result.merkle, 'Merkle root khớp transactions'], [result.previous, 'PreviousHash khớp block trước'], [result.proofOfWork, 'PoW đạt difficulty']].map(([valid, label], checkIndex) => <p key={checkIndex} className={`flex items-start gap-1.5 text-xs leading-4 ${valid ? 'text-emerald-200' : 'text-rose-200'}`}>{valid ? <Check size={13} className="mt-0.5 shrink-0" /> : <XMark />}<span>{label}{!valid && result.reasons[checkIndex] ? ` · ${result.reasons[checkIndex]}` : ''}</span></p>)}</div>
        <div className="mt-3 space-y-2"><HashDiff title="Stored hash (trước khi sửa)" stored={block.hash} calculated={recalculatedHash} /><HashDiff title="Hash tính lại" stored={recalculatedHash} calculated={block.hash} /></div>
        <button type="button" onClick={() => { setSelectedIndex(index); remine(index) }} disabled={isMining} title="Đào lại block này và cập nhật previousHash cho tất cả block sau nó." className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-emerald-300/25 px-2 text-xs font-semibold text-emerald-100 hover:border-emerald-300/50 disabled:cursor-wait disabled:opacity-45">Re-mine from block #{index}</button>
      </article>
    })}</section>

    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 p-3"><div><h3 className="text-sm font-semibold text-slate-100">Sửa dữ liệu (Tamper test) · Block #{selectedBlock.index}</h3><p className="mt-1 text-xs text-slate-400">(1) sửa một giao dịch · (2) xem hash/trạng thái đổi · (3) block sau lỗi previousHash · (4) re-mine.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={validateNow} title="Tính lại hash, Merkle root, previous hash và kiểm tra PoW mà không thay đổi chain." className="inline-flex min-h-9 items-center gap-2 rounded-md border border-sky-300/25 px-3 text-xs text-sky-100"><ShieldCheck size={14} />Kiểm tra lại (Validate)</button><button type="button" onClick={undo} disabled={isMining || !canUndoChainChange()} aria-label="Hoàn tác thay đổi gần nhất" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs text-slate-200 disabled:opacity-40"><Undo2 size={14} />Hoàn tác</button><button type="button" onClick={reset} disabled={isMining} aria-label="Reset chain về trạng thái ban đầu" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-rose-400/25 px-3 text-xs text-rose-200 disabled:opacity-40"><RotateCcw size={14} />Reset chain</button></div></header>
      <div className="p-3"><TransactionTable block={selectedBlock} /><p className="mt-2 text-xs text-slate-400">Block #{selectedBlock.index} · Previous hash: <code className="break-all font-mono text-amber-100">{selectedBlock.previousHash}</code></p></div>
    </section>

    {isMining && <section className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.04] p-3" role="status" aria-live="polite"><h3 className="text-sm font-semibold text-emerald-100">Đang khai thác trên Web Worker…</h3><div className="mt-2 space-y-1">{progress.map((item) => <p key={item.index} className="text-xs text-slate-200">Block #{item.index}: {item.attempts.toLocaleString()} lần thử · {item.elapsedMs.toFixed(2)} ms</p>)}</div><div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full w-full origin-left animate-pulse bg-emerald-300" /></div></section>}
    {status && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">{status}</p>}
    {!isMining && progress.length > 0 && <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><h3 className="text-sm font-semibold text-slate-100">Kết quả re-mine</h3>{progress.map((item) => <p key={item.index} className="mt-1 text-xs text-slate-300">Block #{item.index}: {item.attempts.toLocaleString()} lần thử · {item.elapsedMs.toFixed(2)} ms</p>)}</section>}
    <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs font-semibold leading-5 text-amber-100">Sửa block k buộc đào lại n−k block; thời gian tăng theo difficulty.</p>
  </div>
}

function XMark() {
  return <span aria-hidden="true" className="mt-0.5 shrink-0 font-bold">✗</span>
}

function HashDiff({ title, stored, calculated }: { title: string; stored: string; calculated: string }) {
  return <div className="min-w-0 rounded-md border border-slate-800 bg-slate-950/60 p-2"><span className="mb-1 block text-xs font-semibold text-slate-300">{title}</span><code className="grid grid-cols-4 gap-x-2 font-mono text-xs leading-5 sm:grid-cols-8" aria-label={`${title}: ${stored}`}>{Array.from({ length: 8 }, (_, group) => <span className="whitespace-nowrap" key={group}>{[...stored.slice(group * 8, group * 8 + 8)].map((character, offset) => { const index = group * 8 + offset; return <span key={index} className={character === calculated[index] ? 'text-slate-300' : 'rounded bg-rose-400/20 text-rose-200'}>{character}</span> })}</span>)}</code></div>
}