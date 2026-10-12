import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { GitBranch, TreePine } from 'lucide-react'
import { merkleTree, type MerkleProofNode } from '../lib/chain'
import { useBi } from '../lib/useLanguage'

type Props = {
  txHashes: string[]
  labels?: string[]
  baselineHashes?: string[]
  selectedIndex?: number | null
  onSelect?: (index: number, proof: MerkleProofNode[]) => void
  onLabelChange?: (index: number, value: string) => void
}

export default function MerkleTree({ txHashes, labels = [], baselineHashes = [], selectedIndex = null, onSelect, onLabelChange }: Props) {
  const b = useBi()
  const reducedMotion = useReducedMotion()
  const tree = useMemo(() => merkleTree(txHashes), [txHashes])
  const width = 760
  const height = 120 + (tree.levels.length - 1) * 92
  const coordinates = useMemo(() => {
    const levels: { x: number; y: number }[][] = []
    const leafCount = txHashes.length
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
  }, [height, tree.levels, txHashes.length])
  const changed = txHashes.map((hash, index) => Boolean(baselineHashes[index] && baselineHashes[index] !== hash))
  const selectedPath = selectedIndex === null ? new Set<number>() : new Set(Array.from({ length: tree.levels.length }, (_, level) => Math.floor(selectedIndex / 2 ** level)))
  const leafWidth = Math.max(92, Math.min(146, width / Math.max(txHashes.length, 1) - 8))
  const [hoverLeaf, setHoverLeaf] = useState<number | null>(null)
  const [runnerLeaf, setRunnerLeaf] = useState<number | null>(null)
  const [runnerSeed, setRunnerSeed] = useState(0)
  const pathOf = (leaf: number) => tree.levels.map((_, level) => Math.floor(leaf / 2 ** level))
  const hoverPath = useMemo(() => new Set(hoverLeaf === null ? [] : pathOf(hoverLeaf).map((nodeIndex, level) => `${level}-${nodeIndex}`)), [hoverLeaf, tree.levels])
  const runnerPoints = useMemo(() => (runnerLeaf === null ? [] : pathOf(runnerLeaf).map((nodeIndex, level) => coordinates[level]?.[nodeIndex]).filter((point): point is { x: number; y: number } => Boolean(point))), [coordinates, runnerLeaf, tree.levels])
  useEffect(() => {
    if (runnerLeaf === null) return
    const timer = window.setTimeout(() => setRunnerLeaf(null), 1500)
    return () => window.clearTimeout(timer)
  }, [runnerLeaf, runnerSeed])
  function handleSelect(index: number) {
    onSelect?.(index, tree.proofs[index])
    if (reducedMotion) return
    setRunnerLeaf(index)
    setRunnerSeed((value) => value + 1)
  }

  return <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/75" aria-label={b('Trực quan hóa cây Merkle', 'Merkle Tree Explorer')}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"><TreePine size={16} /></span><div><h3 className="text-sm font-semibold text-slate-100">Merkle Tree</h3><p className="text-xs text-slate-400">{b('Hash giao dịch → hash cha → root', 'Transaction hashes → parent hashes → root')}</p></div></div><div className="min-w-0 max-w-full sm:text-right"><span className="block text-xs font-semibold text-slate-300">Merkle root</span><motion.code key={tree.root} initial={reducedMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="block break-all font-mono text-xs text-emerald-200">{tree.root}</motion.code></div></header>
    {txHashes.length ? <div className="overflow-x-auto px-3 py-3"><div className="relative mx-auto min-w-[680px] max-w-[900px]" style={{ height }}>
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">{tree.levels.slice(0, -1).flatMap((level, levelIndex) => level.map((_, nodeIndex) => {
        const child = coordinates[levelIndex][nodeIndex]
        const parent = coordinates[levelIndex + 1][Math.floor(nodeIndex / 2)]
        const parentHash = tree.levels[levelIndex + 1][Math.floor(nodeIndex / 2)]
        const highlighted = selectedIndex !== null && Math.floor(selectedIndex / 2 ** levelIndex) === nodeIndex
        const branchChanged = selectedIndex === null && changed.slice(nodeIndex * 2 ** levelIndex, (nodeIndex + 1) * 2 ** levelIndex).some(Boolean)
        const drawDelay = Math.min(0.06 * levelIndex + 0.05 * nodeIndex, 0.7)
        const hovered = !highlighted && hoverPath.has(`${levelIndex}-${nodeIndex}`)
        const flowing = branchChanged || highlighted || hovered
        return <motion.path key={`${levelIndex}-${nodeIndex}-${parentHash}`} d={`M${child.x} ${child.y - 18} L${parent.x} ${parent.y + 18}`} stroke={highlighted ? '#fbbf24' : branchChanged ? '#fb7185' : hovered ? '#7dd3fc' : '#334155'} strokeWidth={highlighted || branchChanged || hovered ? 2.5 : 1.5} strokeDasharray={flowing ? '6 5' : undefined} initial={reducedMotion ? false : flowing ? { strokeDashoffset: 0 } : { pathLength: 0 }} animate={reducedMotion ? undefined : flowing ? { strokeDashoffset: -22 } : { pathLength: 1 }} transition={reducedMotion ? undefined : flowing ? { duration: hovered ? 0.8 : 1.1, ease: 'linear', repeat: Infinity } : { duration: 0.4, delay: drawDelay, ease: 'easeOut' }} />
      }))}{!reducedMotion && runnerPoints.length > 1 && <motion.circle key={runnerSeed} r="6" fill="#7dd3fc" initial={{ cx: runnerPoints[0].x, cy: runnerPoints[0].y - 18, opacity: 0 }} animate={{ cx: runnerPoints.map((point) => point.x), cy: runnerPoints.map((point) => point.y - 18), opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.15, ease: 'easeInOut', opacity: { duration: 0.18 } }} />}</svg>
      {tree.levels.flatMap((level, levelIndex) => level.map((hash, nodeIndex) => {
        const point = coordinates[levelIndex][nodeIndex]
        const isLeaf = levelIndex === 0
        const affected = isLeaf ? changed[nodeIndex] : changed.slice(nodeIndex * 2 ** levelIndex, (nodeIndex + 1) * 2 ** levelIndex).some(Boolean)
        const active = selectedIndex !== null && selectedPath.has(nodeIndex)
        const hovered = !active && hoverPath.has(`${levelIndex}-${nodeIndex}`)
        const label = isLeaf ? labels[nodeIndex] ?? b(`Giao dịch ${nodeIndex + 1}`, `Transaction ${nodeIndex + 1}`) : levelIndex === tree.levels.length - 1 ? 'Merkle Root' : b(`Cha ${nodeIndex + 1}`, `Parent ${nodeIndex + 1}`)
        return <div key={`${levelIndex}-${nodeIndex}${isLeaf ? '' : `-${hash}`}`} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: point.x, top: point.y, width: isLeaf ? leafWidth : undefined }}>
          <motion.div initial={reducedMotion ? false : { opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.32, delay: Math.min(0.06 * levelIndex + 0.05 * nodeIndex, 0.7), ease: 'easeOut' }}>
          <div className={`rounded-lg border p-2 transition-colors ${isLeaf ? '' : 'w-[138px] text-center'} ${levelIndex === tree.levels.length - 1 ? 'hub-merkle-root ' : ''}${affected && !reducedMotion ? 'hub-merkle-alert ' : ''}${active ? 'border-amber-300/70 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.13)]' : hovered ? 'border-sky-300/60 bg-sky-300/[0.08] shadow-[0_0_16px_rgba(125,211,252,0.14)]' : affected ? 'border-rose-400/45 bg-[#24151d]' : levelIndex === tree.levels.length - 1 ? 'border-emerald-300/35 bg-[#101f1b]' : 'border-slate-700 bg-slate-950/95'}`}>
          {isLeaf ? <button type="button" onClick={() => handleSelect(nodeIndex)} onMouseEnter={() => setHoverLeaf(nodeIndex)} onMouseLeave={() => setHoverLeaf(null)} onFocus={() => setHoverLeaf(nodeIndex)} onBlur={() => setHoverLeaf(null)} title={label} className="block w-full min-w-0 text-left" aria-label={b(`Chọn giao dịch ${nodeIndex + 1}; proof Merkle gồm ${tree.proofs[nodeIndex].length} bước`, `Select transaction ${nodeIndex + 1}; ${tree.proofs[nodeIndex].length} Merkle proof steps`)}><span className="block truncate text-xs font-semibold text-slate-200">Tx {nodeIndex + 1} · {label}</span>{onLabelChange && <input value={labels[nodeIndex] ?? ''} onClick={(event) => event.stopPropagation()} onChange={(event) => onLabelChange(nodeIndex, event.target.value)} aria-label={b(`Sửa giao dịch ${nodeIndex + 1}`, `Edit transaction ${nodeIndex + 1}`)} className="mt-1 w-full min-w-0 bg-transparent text-xs text-slate-300 outline-none" />}</button> : <><span className={`block text-xs font-semibold ${levelIndex === tree.levels.length - 1 ? 'text-emerald-200' : 'text-slate-300'}`}>{label}</span><code className="mt-1 block truncate font-mono text-xs text-sky-200">{hash.slice(0, 16)}…</code></>}
        </div>
          </motion.div>
        </div>
      }))}
    </div></div> : <p className="px-4 py-5 text-xs text-slate-400">{b('Thêm giao dịch để tạo cây Merkle.', 'Add a transaction to create a Merkle tree.')}</p>}
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-300" />{b('Lá giao dịch', 'Transaction leaf')}</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-slate-500" />{b('Hash cha', 'Parent hash')}</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber-300" />{b('Đường proof đã chọn', 'Selected proof path')}</span><span className="ml-auto inline-flex items-center gap-1.5"><GitBranch size={13} />{b(`${txHashes.length} giao dịch · SHA-256`, `${txHashes.length} transactions · SHA-256`)}</span></footer>
  </section>
}