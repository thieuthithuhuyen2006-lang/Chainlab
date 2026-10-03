import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, TreePine, Copy, Check, Plus, Trash2, ShieldCheck, ShieldX, ChevronRight } from 'lucide-react'
import { buildMerkleTree, verifyProof, type MerkleProofNode } from '../lib/merkle'
import type { Transaction } from '../lib/chain'
import { merkleTree as syncMerkleTree } from '../lib/chain'

type Props = {
  transactions?: Transaction[]
  onTransactionsChange?: (transactions: Transaction[]) => void
  txHashes?: string[]
  labels?: string[]
  baselineHashes?: string[]
  selectedIndex?: number | null
  onSelect?: (index: number, proof: MerkleProofNode[]) => void
}

function copyValue(value: string) {
  navigator.clipboard?.writeText(value).catch(() => {})
}

export default function MerkleTree({
  transactions = [],
  onTransactionsChange,
  txHashes = [],
  labels = [],
  baselineHashes = [],
  selectedIndex = null,
  onSelect,
  
}: Props) {
  const [tree, setTree] = useState<{ levels: string[][]; root: string; proofs: MerkleProofNode[][] } | null>(null)
  const [verifyState, setVerifyState] = useState<{ running: boolean; steps: { hash: string; side: 'left' | 'right' | 'root'; label: string }[]; result: boolean | null }>({ running: false, steps: [], result: null })
  const [hoveredNode, setHoveredNode] = useState<{ level: number; index: number; hash: string } | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ from: '', to: '', amount: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTx, setNewTx] = useState({ from: '', to: '', amount: '' })

  const hasRealTransactions = transactions.length > 0
  const effectiveSelected = selectedIndex

  useEffect(() => {
    let cancelled = false
    if (hasRealTransactions) {
      buildMerkleTree(transactions).then((result) => {
        if (!cancelled) setTree(result)
      }).catch(() => {
        if (!cancelled) setTree(null)
      })
    } else if (txHashes.length) {
      setTree(syncMerkleTree(txHashes))
    } else {
      setTree(null)
    }
    return () => {
      cancelled = true
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = null
      }
    }
  }, [transactions, txHashes, hasRealTransactions])

  

  const treeRoot = tree?.root ?? ''
  const leafCount = hasRealTransactions ? transactions.length : txHashes.length
  const width = 760
  const height = tree ? 120 + (tree.levels.length - 1) * 92 : 120
  const leafWidth = Math.max(92, Math.min(146, width / Math.max(leafCount, 1) - 8))

  const coordinates = useMemo(() => {
    if (!tree) return []
    const levels: { x: number; y: number }[][] = []
    levels.push(Array.from({ length: leafCount }, (_, index) => ({ x: leafCount === 1 ? width / 2 : 48 + index * ((width - 96) / (leafCount - 1)), y: height - 38 })))
    for (let level = 1; level < tree.levels.length; level += 1) {
      const previous = levels[level - 1]
      levels.push(tree.levels[level].map((_, index) => {
        const left = previous[index * 2]
        const right = previous[index * 2 + 1] ?? left
        return { x: (left.x + right.x) / 2, y: height - 38 - level * 92 }
      }))
    }
    return levels
  }, [tree, height, leafCount, width])

  const changed = useMemo(() => {
    if (!hasRealTransactions || !baselineHashes.length) return []
    const currentHashes = tree?.levels[0] ?? []
    return currentHashes.map((hash, index) => Boolean(baselineHashes[index] && baselineHashes[index] !== hash))
  }, [tree, baselineHashes, hasRealTransactions])

  const selectedProof = useMemo(() => {
    if (effectiveSelected === null || !tree) return [] as MerkleProofNode[]
    return tree.proofs[effectiveSelected] ?? []
  }, [effectiveSelected, tree])

  function handleLeafClick(index: number) {
    const proof = tree?.proofs[index] ?? []
    
    setVerifyState({ running: false, steps: [], result: null })
    onSelect?.(index, proof)
  }

  async function handleVerify() {
    if (effectiveSelected === null || !tree) return
    const leafHash = tree.levels[0][effectiveSelected]
    const proof = selectedProof
    setVerifyState({ running: true, steps: [], result: null })
    try {
      const steps: { hash: string; side: 'left' | 'right' | 'root'; label: string }[] = []
      let current = leafHash
      for (const step of proof) {
        const combined = step.side === 'left' ? step.hash + current : current + step.hash
        steps.push({ hash: step.hash, side: step.side, label: step.side === 'left' ? 'Left sibling' : 'Right sibling' })
        current = combined
      }
      const valid = await verifyProof(leafHash, proof, tree.root)
      steps.push({ hash: tree.root, side: 'root', label: 'Merkle root' })
      setVerifyState({ running: false, steps, result: valid })
    } catch {
      setVerifyState({ running: false, steps: [], result: false })
    }
  }

  function handleSaveEdit() {
    if (editingIndex === null || !onTransactionsChange) return
    onTransactionsChange(transactions.map((tx, i) => i === editingIndex ? { ...tx, from: editForm.from, to: editForm.to, amount: editForm.amount } : tx))
    setEditingIndex(null)
  }

  function handleAddTx() {
    if (!onTransactionsChange || !newTx.from.trim() || !newTx.to.trim() || !newTx.amount.trim()) return
    onTransactionsChange([...transactions, { id: `tx-${Date.now()}`, from: newTx.from.trim(), to: newTx.to.trim(), amount: newTx.amount.trim(), signatureStatus: `unsigned` }])
    setNewTx({ from: '', to: '', amount: '' })
    setShowAddForm(false)
  }

  function handleRemoveTx(index: number) {
    if (!onTransactionsChange) return
    onTransactionsChange(transactions.filter((_, i) => i !== index))
  }

  function handleReset() {
    if (!onTransactionsChange || !baselineHashes.length) return
    onTransactionsChange(transactions.map((tx) => ({ ...tx })))
    setVerifyState({ running: false, steps: [], result: null })
  }

  function getNodeChanged(level: number, nodeIndex: number): boolean {
    if (!tree || !changed.length) return false
    const start = nodeIndex * 2 ** level
    const end = start + 2 ** level
    return changed.slice(start, end).some(Boolean)
  }

  const formulaSegments = useMemo(() => {
    if (!tree || tree.levels.length < 2) return []
    const segments: { hash: string; label: string }[] = []
    for (let i = 0; i < tree.levels[0].length; i += 2) {
      segments.push({ hash: tree.levels[1][i / 2], label: `SHA256(H(Tx${i + 1}) + H(Tx${i + 2}))` })
    }
    return segments
  }, [tree])

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/75" aria-label="Merkle Tree Explorer">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"><TreePine size={16} /></span>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Merkle Tree</h3>
            <p className="text-xs text-slate-400">Transaction hashes → parent hashes → root</p>
          </div>
        </div>
        <div className="min-w-0 max-w-full sm:text-right">
          <span className="block text-xs font-semibold text-slate-300">Merkle root</span>
          <code className="block break-all font-mono text-xs text-emerald-200">{treeRoot || '...'}</code>
        </div>
      </header>

      {tree && leafCount > 0 ? (
        <div className="overflow-x-auto px-3 py-3">
          <div className="relative mx-auto min-w-[680px] max-w-[900px]" style={{ height }}>
            <svg className="absolute inset-0 size-full" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
              {tree.levels.slice(0, -1).flatMap((level, levelIndex) => level.map((_, nodeIndex) => {
                const child = coordinates[levelIndex][nodeIndex]
                const parent = coordinates[levelIndex + 1][Math.floor(nodeIndex / 2)]
                const highlighted = effectiveSelected !== null && Math.floor(effectiveSelected / 2 ** levelIndex) === nodeIndex
                const branchChanged = effectiveSelected === null && getNodeChanged(levelIndex, nodeIndex)
                return <motion.path key={`${levelIndex}-${nodeIndex}`} d={`M${child.x} ${child.y - 18} L${parent.x} ${parent.y + 18}`} stroke={highlighted ? '#fbbf24' : branchChanged ? '#fb7185' : '#334155'} strokeWidth={highlighted || branchChanged ? 2.5 : 1.5} strokeDasharray={branchChanged ? '6 5' : undefined} initial={false} />
              }))}
            </svg>
            {tree.levels.flatMap((level, levelIndex) => level.map((hash, nodeIndex) => {
              const point = coordinates[levelIndex][nodeIndex]
              const isLeaf = levelIndex === 0
              const affected = effectiveSelected !== null && Math.floor(effectiveSelected / 2 ** levelIndex) === nodeIndex
              const changedNode = getNodeChanged(levelIndex, nodeIndex)
              const isRoot = levelIndex === tree.levels.length - 1
              let borderColor = 'border-slate-700 bg-slate-950/95'
              if (isRoot) borderColor = 'border-emerald-300/35 bg-[#101f1b]'
              if (affected) borderColor = 'border-amber-300/70 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.13)]'
              if (changedNode) borderColor = 'border-rose-400/45 bg-[#24151d]'
              const label = isLeaf ? (labels[nodeIndex] ?? `Transaction ${nodeIndex + 1}`) : isRoot ? 'Merkle Root' : `Parent ${nodeIndex + 1}`
              return (
                <div key={`${levelIndex}-${nodeIndex}`} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 transition-colors ${isLeaf ? '' : 'w-[138px] text-center'} ${borderColor}`} style={{ left: point.x, top: point.y, width: isLeaf ? leafWidth : undefined }} onMouseEnter={() => setHoveredNode({ level: levelIndex, index: nodeIndex, hash })} onMouseLeave={() => setHoveredNode(null)}>
                  {isLeaf ? (
                    <button type="button" onClick={() => handleLeafClick(nodeIndex)} title={label} className="block w-full min-w-0 text-left" aria-label={`Select transaction ${nodeIndex + 1}`}>
                      <span className="block truncate text-xs font-semibold text-slate-200">Tx {nodeIndex + 1} · {label}</span>
                      {hasRealTransactions && editingIndex === nodeIndex ? (
                        <div className="mt-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                          <input value={editForm.from} onChange={(e) => setEditForm({ ...editForm, from: e.target.value })} placeholder="From" className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 text-[10px] text-slate-200" />
                          <input value={editForm.to} onChange={(e) => setEditForm({ ...editForm, to: e.target.value })} placeholder="To" className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 text-[10px] text-slate-200" />
                          <input value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} placeholder="Amount" className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 text-[10px] text-slate-200" />
                          <div className="flex gap-1">
                            <button type="button" onClick={handleSaveEdit} className="rounded bg-emerald-300/20 px-1.5 text-[10px] text-emerald-200">Save</button>
                            <button type="button" onClick={() => setEditingIndex(null)} className="rounded bg-slate-700 px-1.5 text-[10px] text-slate-300">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <code className="mt-1 block truncate font-mono text-[10px] text-sky-200">{hash.slice(0, 12)}…</code>
                          {hasRealTransactions && (
                            <div className="mt-1 flex gap-1">
                              <button type="button" onClick={() => { setEditingIndex(nodeIndex); setEditForm({ from: transactions[nodeIndex].from, to: transactions[nodeIndex].to, amount: transactions[nodeIndex].amount }) }} className="rounded border border-slate-700 px-1 text-[9px] text-slate-400 hover:text-slate-200">Edit</button>
                              <button type="button" onClick={() => handleRemoveTx(nodeIndex)} className="rounded border border-slate-700 px-1 text-[9px] text-rose-300 hover:text-rose-200"><Trash2 size={10} /></button>
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <span className={`block text-xs font-semibold ${isRoot ? 'text-emerald-200' : 'text-slate-300'}`}>{label}</span>
                      <code className="mt-1 block truncate font-mono text-xs text-sky-200">{hash.slice(0, 12)}…</code>
                    </>
                  )}
                  {hoveredNode?.level === levelIndex && hoveredNode?.index === nodeIndex && (
                    <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 z-20 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl">
                      <code className="block max-w-[320px] break-all font-mono text-[10px] leading-4 text-slate-200">{hash}</code>
                      <button type="button" onClick={() => { copyValue(hash); setCopiedHash(hash); if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current); copyTimeoutRef.current = window.setTimeout(() => setCopiedHash(null), 1200) }} className="mt-1.5 inline-flex items-center gap-1 rounded border border-slate-700 px-1.5 text-[10px] text-slate-300 hover:text-slate-100">
                        {copiedHash === hash ? <Check size={10} /> : <Copy size={10} />}
                        {copiedHash === hash ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              )
            }))}
          </div>
        </div>
      ) : (
        <p className="px-4 py-5 text-xs text-slate-400">Add a transaction to create a Merkle tree.</p>
      )}

      {tree && effectiveSelected !== null && (
        <div className="border-t border-slate-800 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Proof for Tx {effectiveSelected + 1}:</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedProof.map((step, i) => (
                <span key={i} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${step.side === 'left' ? 'border-sky-300/30 bg-sky-300/[0.08] text-sky-200' : 'border-amber-300/30 bg-amber-300/[0.08] text-amber-200'}`}>
                  {step.side === 'left' ? 'L' : 'R'}: {step.hash.slice(0, 8)}…
                </span>
              ))}
            </div>
            <button type="button" onClick={handleVerify} disabled={verifyState.running} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-emerald-300/25 bg-emerald-300/[0.09] px-2.5 text-[11px] font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/[0.14] disabled:cursor-wait disabled:opacity-60">
              {verifyState.running ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><ShieldCheck size={12} /></motion.span> : <ShieldCheck size={12} />}
              {verifyState.running ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          <AnimatePresence>
            {verifyState.result !== null && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${verifyState.result ? 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200' : 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200'}`}>
                {verifyState.result ? <Check size={14} /> : <ShieldX size={14} />}
                {verifyState.result ? 'Proof valid - matches Merkle root' : 'Proof invalid - does not match Merkle root'}
              </motion.div>
            )}
          </AnimatePresence>
          {verifyState.steps.length > 0 && (
            <div className="mt-2 space-y-1">
              {verifyState.steps.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-mono text-slate-500">{i + 1}.</span>
                  <code className="break-all font-mono text-sky-200">{step.hash.slice(0, 16)}…</code>
                  <span className="text-slate-500">({step.label})</span>
                  {i < verifyState.steps.length - 1 && <ChevronRight size={10} className="text-slate-600" />}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-800 px-4 py-2.5">
        {hasRealTransactions && (
          <div className="mb-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-sky-300/25 px-2.5 text-[11px] font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/[0.08]">
              <Plus size={12} /> Add transaction
            </button>
            {changed.some(Boolean) && (
              <button type="button" onClick={handleReset} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-100">
                <Trash2 size={12} /> Reset
              </button>
            )}
          </div>
        )}
        {showAddForm && (
          <div className="mb-2 grid gap-2 sm:grid-cols-4">
            <input value={newTx.from} onChange={(e) => setNewTx({ ...newTx, from: e.target.value })} placeholder="From" className="min-h-9 rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-2.5 text-xs text-slate-200 outline-none focus:border-sky-300/45" />
            <input value={newTx.to} onChange={(e) => setNewTx({ ...newTx, to: e.target.value })} placeholder="To" className="min-h-9 rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-2.5 text-xs text-slate-200 outline-none focus:border-sky-300/45" />
            <input value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} placeholder="Amount" className="min-h-9 rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-2.5 text-xs text-slate-200 outline-none focus:border-sky-300/45" />
            <button type="button" onClick={handleAddTx} className="min-h-9 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.09] px-2.5 text-[11px] font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/[0.14]">Add</button>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-300" />Transaction leaf</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-slate-500" />Parent hash</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber-300" />Selected proof path</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber-200/70" />Sibling hash (proof)</span>
        {changed.some(Boolean) && <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-400" />Node bị thay đổi</span>}
        <span className="ml-auto inline-flex items-center gap-2"><GitBranch size={13} />{leafCount} transactions · SHA-256</span>
      </footer>

      {tree && formulaSegments.length > 0 && (
        <div className="border-t border-slate-800 px-4 py-2.5 text-[10px] text-slate-500">
          <span className="font-mono text-slate-400">Formula:</span>{' '}
          {tree.levels[0].map((_, i) => (
            <span key={i}>
              {i > 0 && ' → '}
              {i % 2 === 0 && i + 1 < tree.levels[0].length ? (
                <span>SHA256(H(Tx{i + 1}) + H(Tx{i + 2}))</span>
              ) : i % 2 === 0 ? (
                <span>SHA256(H(Tx{i + 1}))</span>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}






