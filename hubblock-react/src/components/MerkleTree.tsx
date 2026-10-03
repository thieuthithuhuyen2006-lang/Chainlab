import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, TreePine } from 'lucide-react'
import { buildMerkleTree, type Transaction } from '../lib/merkle'

type Props = {
  transactions: Transaction[]
  labels?: string[]
  baselineHashes?: string[]
  selectedIndex?: number | null
  onSelect?: (index: number, proof: { hash: string; position: 'left' | 'right' }[]) => void
  onLabelChange?: (index: number, value: string) => void
}

export default function MerkleTree({ transactions, labels = [], baselineHashes = [], selectedIndex = null, onSelect, onLabelChange }: Props) {
  const [tree, setTree] = useState<{ levels: string[][]; root: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    buildMerkleTree(transactions)
      .then((result) => {
        if (!cancelled) {
          setTree(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Khong the tinh merkle tree')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [transactions])

  const txHashes = tree?.levels[0] ?? []
  const width = 760
  const height = loading || error || !tree ? 120 + Math.max(txHashes.length - 1, 0) * 92 : 120 + (tree.levels.length - 1) * 92
  const coordinates: { x: number; y: number }[][] = []
  const leafCount = txHashes.length
  if (leafCount > 0) {
    coordinates.push(Array.from({ length: leafCount }, (_, index) => ({ x: leafCount === 1 ? width / 2 : 48 + index * ((width - 96) / (leafCount - 1)), y: height - 38 })))
    const levels = tree?.levels ?? []
    for (let level = 1; level < levels.length; level += 1) {
      const previous = coordinates[level - 1]
      coordinates.push(levels[level].map((_, index) => {
        const left = previous[index * 2]
        const right = previous[index * 2 + 1] ?? left
        return { x: (left.x + right.x) / 2, y: height - 38 - level * 92 }
      }))
    }
  }

  const changed = txHashes.map((hash, index) => Boolean(baselineHashes[index] && baselineHashes[index] !== hash))
  const selectedPath = selectedIndex === null ? new Set<number>() : new Set(Array.from({ length: (tree?.levels.length ?? 0) }, (_, level) => Math.floor(selectedIndex / 2 ** level)))
  const leafWidth = Math.max(92, Math.min(146, width / Math.max(leafCount, 1) - 8))

  return <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/75" aria-label="Merkle Tree Explorer">
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
        <code className="block break-all font-mono text-xs text-emerald-200">{loading ? 'Đang tính...' : error ? 'Lỗi' : tree?.root ?? '...'}</code>
      </div>
    </header>
    {error ? <div className="px-4 py-3 text-xs text-rose-300">Lỗi: {error}</div> : leafCount > 0 || loading ? <div className="overflow-x-auto px-3 py-3">
      <div className="relative mx-auto min-w-[680px] max-w-[900px]" style={{ height }}>
        <svg className="absolute inset-0 size-full" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
          {(tree ? tree.levels : Array.from({ length: 1 }, () => txHashes)).slice(0, -1).flatMap((level, levelIndex) => level.map((_, nodeIndex) => {
            const child = coordinates[levelIndex][nodeIndex]
            const parent = coordinates[levelIndex + 1]?.[Math.floor(nodeIndex / 2)] ?? child
            const highlighted = selectedIndex !== null && Math.floor(selectedIndex / 2 ** levelIndex) === nodeIndex
            const branchChanged = selectedIndex === null && changed.slice(nodeIndex * 2 ** levelIndex, (nodeIndex + 1) * 2 ** levelIndex).some(Boolean)
            return <motion.path key={`${levelIndex}-${nodeIndex}`} d={`M${child.x} ${child.y - 18} L${parent.x} ${parent.y + 18}`} stroke={highlighted ? '#fbbf24' : branchChanged ? '#fb7185' : '#334155'} strokeWidth={highlighted || branchChanged ? 2.5 : 1.5} strokeDasharray={branchChanged ? '6 5' : undefined} initial={false} />
          }))}
        </svg>
        {(tree ? tree.levels : Array.from({ length: 1 }, () => txHashes)).flatMap((level, levelIndex) => level.map((hash, nodeIndex) => {
          const point = coordinates[levelIndex]?.[nodeIndex] ?? { x: width / 2, y: height - 38 }
          const isLeaf = levelIndex === 0
          const affected = isLeaf ? changed[nodeIndex] : changed.slice(nodeIndex * 2 ** levelIndex, (nodeIndex + 1) * 2 ** levelIndex).some(Boolean)
          const active = selectedIndex !== null && selectedPath.has(nodeIndex)
          const label = isLeaf ? labels[nodeIndex] ?? `Transaction ${nodeIndex + 1}` : levelIndex === (tree?.levels.length ?? 1) - 1 ? 'Merkle Root' : `Parent ${nodeIndex + 1}`
          const borderColor = active ? 'border-amber-300/70 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.13)]' : affected ? 'border-rose-400/45 bg-[#24151d]' : levelIndex === (tree?.levels.length ?? 1) - 1 ? 'border-emerald-300/35 bg-[#101f1b]' : 'border-slate-700 bg-slate-950/95'
          const widthStyle = isLeaf ? leafWidth : 138
          return (
            <div key={`${levelIndex}-${nodeIndex}`} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 transition-colors ${isLeaf ? '' : 'text-center'} ${borderColor}`} style={{ left: point.x, top: point.y, width: widthStyle }}>
              {isLeaf ? (
                <button type="button" onClick={() => onSelect?.(nodeIndex, [])} title={label} className="block w-full min-w-0 text-left" aria-label={`Select transaction ${nodeIndex + 1}`}>
                  <span className="block truncate text-xs font-semibold text-slate-200">Tx {nodeIndex + 1} · {label}</span>
                  {loading && <span className="mt-1 block text-[10px] text-slate-500">Đang tính...</span>}
                  {error && <span className="mt-1 block text-[10px] text-rose-300">Lỗi hash</span>}
                  {!loading && !error && <code className="mt-1 block truncate font-mono text-[10px] text-sky-200">{hash.slice(0, 12)}…</code>}
                  {onLabelChange && !loading && !error && <input value={labels[nodeIndex] ?? ''} onClick={(event) => event.stopPropagation()} onChange={(event) => onLabelChange(nodeIndex, event.target.value)} aria-label={`Edit transaction ${nodeIndex + 1}`} className="mt-1 w-full min-w-0 bg-transparent text-xs text-slate-300 outline-none" />}
                </button>
              ) : (
                <>
                  <span className={`block text-xs font-semibold ${levelIndex === (tree?.levels.length ?? 1) - 1 ? 'text-emerald-200' : 'text-slate-300'}`}>{label}</span>
                  {loading ? <span className="mt-1 block text-[10px] text-slate-500">Đang tính...</span> : error ? <span className="mt-1 block text-[10px] text-rose-300">Lỗi</span> : <code className="mt-1 block truncate font-mono text-xs text-sky-200">{hash.slice(0, 12)}…</code>}
                </>
              )}
            </div>
          )
        }))}
      </div>
    </div> : <p className="px-4 py-5 text-xs text-slate-400">Add a transaction to create a Merkle tree.</p>}
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-300" />Transaction leaf</span>
      <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-slate-500" />Parent hash</span>
      <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber-300" />Selected proof path</span>
      <span className="ml-auto inline-flex items-center gap-2"><GitBranch size={13} />{transactions.length} transactions · SHA-256</span>
    </footer>
  </section>
}
