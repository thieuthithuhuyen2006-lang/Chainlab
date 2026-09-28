import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Check, Database, RefreshCw, ShieldCheck } from 'lucide-react'
import CryptoJS from 'crypto-js'

type Block = {
  index: number
  timestamp: string
  previousHash: string
  transactions: string[]
  merkleRoot: string
  nonce: number
  validatorAddress: string
  hash: string
}

const ZERO_HASH = '0'.repeat(64)
const initialEntries = [
  { transactions: ['Genesis block · ChainLab testnet'], validator: '0x0000000000000000000000000000000000000000' },
  { transactions: ['Alice → Bob · 12.50 ETH', 'Bob → Alice · 0.80 ETH'], validator: '0x0000000000000000000000000000000000000001' },
  { transactions: ['Carol → Dave · 4.20 ETH', 'Dave → Eve · 0.35 ETH'], validator: '0x0000000000000000000000000000000000000002' },
  { transactions: ['Eve → Finn · 1.75 ETH', 'Finn → Alice · 0.20 ETH'], validator: '0x0000000000000000000000000000000000000003' },
]

function sha256(value: string) {
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex)
}

function calculateMerkleRoot(transactions: string[]) {
  if (!transactions.length) return sha256('')
  let level = transactions.map(sha256)
  while (level.length > 1) {
    const nextLevel: string[] = []
    for (let index = 0; index < level.length; index += 2) {
      nextLevel.push(sha256(level[index] + (level[index + 1] ?? level[index])))
    }
    level = nextLevel
  }
  return level[0]
}

function calculateBlockHash(block: Pick<Block, 'index' | 'timestamp' | 'previousHash' | 'merkleRoot' | 'nonce' | 'validatorAddress'>) {
  return sha256(`${block.index}${block.timestamp}${block.previousHash}${block.merkleRoot}${block.nonce}${block.validatorAddress}`)
}

function createInitialChain(): Block[] {
  let previousHash = ZERO_HASH
  const timestampBase = Date.now()
  return initialEntries.map((entry, index) => {
    const timestamp = new Date(timestampBase + index * 12_000).toISOString()
    const merkleRoot = calculateMerkleRoot(entry.transactions)
    const block: Block = {
      index,
      timestamp,
      previousHash,
      transactions: entry.transactions,
      merkleRoot,
      nonce: 0,
      validatorAddress: entry.validator,
      hash: '',
    }
    block.hash = calculateBlockHash(block)
    previousHash = block.hash
    return block
  })
}

function revalidateChain(chain: Block[]): Block[] {
  let previousHash = ZERO_HASH
  return chain.map((block) => {
    const updated: Block = {
      ...block,
      previousHash,
      merkleRoot: calculateMerkleRoot(block.transactions),
      nonce: block.nonce + 1,
    }
    updated.hash = calculateBlockHash(updated)
    previousHash = updated.hash
    return updated
  })
}

function shortenHash(hash: string) {
  return `${hash.slice(0, 16)}…${hash.slice(-12)}`
}

export default function TabBlockchain() {
  const [chain, setChain] = useState(createInitialChain)
  const [isMining, setIsMining] = useState(false)
  const [notice, setNotice] = useState('')

  const analysis = useMemo(() => {
    const merkleRoots = chain.map((block) => calculateMerkleRoot(block.transactions))
    const calculatedHashes = chain.map((block, index) => calculateBlockHash({ ...block, merkleRoot: merkleRoots[index] }))
    const validity: boolean[] = []

    chain.forEach((block, index) => {
      const expectedPreviousHash = index === 0 ? ZERO_HASH : calculatedHashes[index - 1]
      const valid = block.previousHash === expectedPreviousHash
        && block.merkleRoot === merkleRoots[index]
        && block.hash === calculatedHashes[index]
        && (index === 0 || validity[index - 1])
      validity.push(valid)
    })

    return { merkleRoots, calculatedHashes, validity }
  }, [chain])

  const validCount = analysis.validity.filter(Boolean).length

  function updateTransactions(index: number, value: string) {
    const transactions = value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
    setChain((current) => current.map((block) => block.index === index ? { ...block, transactions } : block))
    setNotice(`Block #${String(index).padStart(4, '0')} thay đổi · các block phía sau cần được re-mine.`)
  }

  async function remineChain() {
    setIsMining(true)
    setNotice('Đang tính lại Merkle Root, Previous Hash và Block Hash...')
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    setChain((current) => revalidateChain(current))
    setNotice('Đã re-mine toàn bộ chuỗi. Tất cả block hiện hợp lệ.')
    setIsMining(false)
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 xl:grid-cols-2" aria-label="So sánh cấu trúc Block V1 và V2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <header className="mb-3 flex items-center justify-between gap-3"><h3 className="text-xs font-semibold text-slate-200">Block Version 1</h3><span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">Basic structure</span></header>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-800 pt-3 text-[9px]"><div><dt className="font-mono text-slate-600">INDEX</dt><dd className="mt-0.5 text-slate-300">Vị trí block</dd></div><div><dt className="font-mono text-slate-600">NONCE</dt><dd className="mt-0.5 text-slate-300">Bộ đếm xác thực</dd></div><div><dt className="font-mono text-slate-600">DATA</dt><dd className="mt-0.5 text-slate-300">Dữ liệu giao dịch</dd></div><div><dt className="font-mono text-slate-600">PREVIOUS HASH</dt><dd className="mt-0.5 text-slate-300">Liên kết block trước</dd></div><div><dt className="font-mono text-slate-600">HASH</dt><dd className="mt-0.5 text-slate-300">Digest của block</dd></div></dl>
        </article>
        <article className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.035] p-4 sm:p-5">
          <header className="mb-3 flex items-center justify-between gap-3"><h3 className="text-xs font-semibold text-sky-100">Block Version 2</h3><span className="font-mono text-[8px] uppercase tracking-[0.1em] text-sky-200/60">Active chain below</span></header>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-sky-300/10 pt-3 text-[9px]"><div><dt className="font-mono text-slate-600">INDEX · TIMESTAMP</dt><dd className="mt-0.5 text-slate-300">ISO 8601 + Epoch ms</dd></div><div><dt className="font-mono text-slate-600">NONCE · VALIDATOR</dt><dd className="mt-0.5 text-slate-300">Nonce + địa chỉ ví</dd></div><div><dt className="font-mono text-slate-600">PREVIOUS HASH</dt><dd className="mt-0.5 text-slate-300">Liên kết block trước</dd></div><div><dt className="font-mono text-slate-600">MERKLE ROOT</dt><dd className="mt-0.5 text-slate-300">Root của transactions</dd></div><div><dt className="font-mono text-slate-600">BLOCK HASH</dt><dd className="mt-0.5 text-slate-300">Digest V2</dd></div></dl>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0b0f19]/65 px-4 py-3 sm:px-5">
        <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">Block V2 hash formula</span>
        <code className="mt-1.5 block break-all font-mono text-[9px] leading-5 text-sky-200">SHA256(Index + Timestamp + PrevHash + MerkleRoot + Nonce + Validator)</code>
        <p className="mt-1 text-[9px] leading-4 text-slate-600">Sửa Transaction ở bất kỳ card nào để làm hỏng liên kết; nhấn Re-mine / Re-validate trên một block bất kỳ để tính lại toàn chuỗi.</p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-slate-700 bg-slate-950/70 text-sky-300"><Database size={18} /></span>
            <div><strong className="block text-sm text-slate-100">{chain.length} Blocks</strong><span className="mt-1 block font-mono text-[9px] uppercase text-slate-500">Chain length</span></div>
          </div>
          <div className={`flex items-center gap-2 border-l border-slate-800 pl-5 text-[10px] font-semibold ${validCount === chain.length ? 'text-emerald-300' : 'text-rose-300'}`}>
            {validCount === chain.length ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
            {validCount === chain.length ? 'CHAIN INTEGRITY VERIFIED' : `${chain.length - validCount} BLOCK${chain.length - validCount > 1 ? 'S' : ''} INVALID`}
          </div>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">SHA-256 <span className="px-1 text-slate-700">·</span> Merkle Tree <span className="px-1 text-slate-700">·</span> Local simulation</span>
      </section>

      {notice && <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-[11px] leading-5 ${validCount === chain.length ? 'border-slate-800 bg-slate-900/60 text-slate-300' : 'border-rose-400/20 bg-rose-400/[0.05] text-rose-200'}`}><span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-current" />{notice}</div>}

      <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-stretch xl:gap-0">
        {chain.map((block, index) => {
          const isValid = analysis.validity[index]
          const hashChanged = block.hash !== analysis.calculatedHashes[index]
          return (
            <div key={block.index} className="contents">
              <motion.article layout className={`min-w-0 flex-1 overflow-hidden rounded-2xl border bg-slate-900/80 transition-colors ${isValid ? 'border-slate-800' : 'border-rose-400/35 shadow-[0_0_24px_rgba(251,113,133,0.06)]'}`}>
                <header className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${isValid ? 'border-slate-800 bg-slate-950/35' : 'border-rose-400/15 bg-rose-400/[0.045]'}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${isValid ? 'bg-slate-800 text-slate-300' : 'bg-rose-400/10 text-rose-300'}`}><Database size={16} /></span>
                    <div><span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Block index</span><strong className="mt-0.5 block font-mono text-xs text-slate-100">#{String(block.index).padStart(4, '0')}</strong></div>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[9px] ${isValid ? 'border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-300' : 'border-rose-400/25 bg-rose-400/[0.07] text-rose-300'}`}>
                    {isValid ? <Check size={11} /> : <AlertTriangle size={11} />}{isValid ? 'VALID' : 'INVALID'}
                  </span>
                </header>

                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0 rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-2.5">
                      <span className="block font-mono text-[8px] uppercase tracking-wide text-slate-600">Timestamp · ISO 8601</span>
                      <code className="mt-1.5 block break-all font-mono text-[9px] leading-4 text-slate-300">{block.timestamp}</code>
                    </div>
                    <div className="min-w-0 rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-2.5">
                      <span className="block font-mono text-[8px] uppercase tracking-wide text-slate-600">Epoch · Nonce</span>
                      <code className="mt-1.5 block break-all font-mono text-[9px] leading-4 text-slate-300">{Date.parse(block.timestamp)} · {block.nonce}</code>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-2.5">
                    <label htmlFor={`transactions-${block.index}`} className="mb-2 block font-mono text-[8px] uppercase tracking-wide text-slate-500">Transactions · mỗi dòng là một giao dịch</label>
                    <textarea id={`transactions-${block.index}`} value={block.transactions.join('\n')} onChange={(event) => updateTransactions(block.index, event.target.value)} rows={Math.min(Math.max(block.transactions.length, 2), 4)} className="w-full resize-y rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-2 font-mono text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10" placeholder="Nhập mỗi giao dịch trên một dòng" />
                  </div>

                  <div className="space-y-2.5">
                    <HashField label="Previous Hash" value={block.previousHash} valid={index === 0 || block.previousHash === analysis.calculatedHashes[index - 1]} />
                    <HashField label="Merkle Root" value={analysis.merkleRoots[index]} valid={block.merkleRoot === analysis.merkleRoots[index]} />
                    <HashField label="Block Hash" value={analysis.calculatedHashes[index]} valid={isValid} />
                    {hashChanged && <HashField label="Stored Hash · trước khi sửa" value={block.hash} valid={false} />}
                  </div>

                  <div className="space-y-1.5 border-t border-slate-800 pt-3">
                    <span className="block font-mono text-[8px] uppercase tracking-wide text-slate-600">Validator Address</span>
                    <code className="block break-all font-mono text-[9px] leading-4 text-slate-400">{block.validatorAddress}</code>
                  </div>

                  <button type="button" onClick={remineChain} disabled={isMining} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-sky-300/20 bg-sky-300/[0.07] px-3 py-2 text-[10px] font-semibold text-sky-200 transition hover:border-sky-300/40 hover:bg-sky-300/[0.12] disabled:cursor-wait disabled:opacity-70">
                    <RefreshCw size={13} className={isMining ? 'animate-spin' : ''} />{isMining ? 'Re-mining entire chain...' : 'Re-mine / Re-validate'}
                  </button>
                </div>
              </motion.article>
              {index < chain.length - 1 && <div aria-hidden="true" className="grid shrink-0 place-items-center px-2 text-slate-600"><ArrowRight size={17} className="hidden xl:block" /><ArrowRight size={17} className="rotate-90 xl:hidden" /></div>}
            </div>
          )
        })}
      </div>

      <p className="flex items-start gap-2 px-1 text-[10px] leading-5 text-slate-500"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-300/80" />Sửa giao dịch làm Merkle Root và Block Hash thay đổi. Các block phía sau giữ Previous Hash cũ nên chuyển sang INVALID cho đến khi re-mine toàn chuỗi.</p>
    </div>
  )
}

function HashField({ label, value, valid }: { label: string; value: string; valid: boolean }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2"><span className="font-mono text-[8px] uppercase tracking-wide text-slate-600">{label}</span><span className={`font-mono text-[8px] ${valid ? 'text-emerald-400/70' : 'text-rose-300'}`}>{shortenHash(value)}</span></div>
      <code className={`block overflow-hidden text-ellipsis whitespace-nowrap rounded-md border bg-[#0b0f19]/70 px-2 py-1.5 font-mono text-[8px] ${valid ? 'border-slate-800 text-slate-400' : 'border-rose-400/20 text-rose-300'}`} title={value}>{value}</code>
    </div>
  )
}