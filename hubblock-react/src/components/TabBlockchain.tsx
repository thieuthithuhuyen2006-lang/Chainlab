import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Clock3, Check, AlertCircle, Copy, Link2, Search } from 'lucide-react'
import MerkleTree from './MerkleTree'
import TransactionTable from './TransactionTable'
import { hashBlock, hashTransaction, merkleRoot, validateChain, blockHashPreimage, verifyMerkleProof, merkleTree, type Block } from '../lib/chain'
import { setBlockTimestamp } from '../lib/chainStore'
import { useChain } from '../lib/useChain'
import { useBi, useLanguage } from '../lib/useLanguage'
import RealityCheck from './RealityCheck'
import LearningGoals from './LearningGoals'

type Version = 'v1' | 'v2'
const fieldColors: Record<string, string> = {
  index: 'text-violet-200', data: 'text-fuchsia-200', timestamp: 'text-sky-200', previousHash: 'text-amber-200', merkleRoot: 'text-emerald-200', nonce: 'text-rose-200', validator: 'text-cyan-200', hash: 'text-orange-200',
}

function FieldRow({ name, title, role, value, selected, onSelect, children }: { name: string; title: string; role: string; value: string; selected: boolean; onSelect: (field: string) => void; children?: React.ReactNode }) {
  return <button type="button" onMouseEnter={() => onSelect(name)} onFocus={() => onSelect(name)} onClick={() => onSelect(name)} aria-pressed={selected} className={`grid w-full grid-cols-[9rem_1fr] gap-3 border-l-2 px-3 py-2 text-left transition ${selected ? 'border-amber-300 bg-amber-300/[0.07]' : 'border-transparent hover:bg-slate-800/50'}`}>
    <span><strong className={`block text-xs font-semibold ${fieldColors[name] ?? 'text-slate-200'}`}>{title}</strong><span className="mt-1 block text-xs leading-4 text-slate-400">{role}</span></span>
    <span className={`min-w-0 self-center break-all font-mono text-xs ${fieldColors[name] ?? 'text-slate-200'}`}>{children ?? value}</span>
  </button>
}

function HashLine({ hash, label, stored = false }: { hash: string; label: string; stored?: boolean }) {
  const reducedMotion = useReducedMotion()
  const [scrambled, setScrambled] = useState<string | null>(null)
  useEffect(() => {
    if (reducedMotion) {
      setScrambled(null)
      return
    }
    setScrambled(hash.replace(/[0-9a-f]/g, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]))
    const timer = window.setTimeout(() => setScrambled(null), 240)
    return () => window.clearTimeout(timer)
  }, [hash, reducedMotion])
  const display = scrambled ?? hash
  return <div className={`rounded-md border p-2 ${stored ? 'border-rose-400/25 bg-rose-400/[0.04]' : 'border-slate-800 bg-slate-950/60'}`}><span className="mb-1 block text-xs font-semibold text-slate-300">{label}</span><code className="grid grid-cols-4 gap-x-1 font-mono text-xs leading-5 sm:grid-cols-8" aria-label={`${label}: ${hash}`}>{Array.from({ length: 8 }, (_, index) => <motion.span key={`${index}-${hash}`} initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: (scrambled ? 0 : 0.2) + index * 0.045, ease: 'easeOut' }} className={`whitespace-nowrap ${scrambled ? 'text-slate-500' : ''}}`}>{display.slice(index * 8, index * 8 + 8)}</motion.span>)}</code></div>
}

function BlockField({ name, title, role, value, selectedField, onSelect }: { name: string; title: string; role: string; value: string; selectedField: string; onSelect: (field: string) => void }) {
  return <FieldRow name={name} title={title} role={role} value={value} selected={selectedField === name} onSelect={onSelect} />
}

function currentTimestampDetails(timestamp: string) {
  const date = new Date(timestamp)
  return {
    iso: date.toISOString(),
    epoch: date.getTime(),
    utc7: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'medium' }).format(date),
  }
}

export default function TabBlockchain() {
  const chain = useChain()
  const b = useBi()
  const language = useLanguage()
  const [selectedBlock, setSelectedBlock] = useState(0)
  const [version, setVersion] = useState<Version>('v2')
  const [selectedField, setSelectedField] = useState('index')
  const [selectedTx, setSelectedTx] = useState<number | null>(null)
  const block: Block = chain[Math.min(selectedBlock, chain.length - 1)]
  const checks = validateChain(chain, block.difficulty, language === 'VN' ? 'vn' : 'en')
  const calculatedMerkle = merkleRoot(block.transactions.map(hashTransaction))
  const calculatedHash = hashBlock({ ...block, merkleRoot: calculatedMerkle })
  const timestamp = currentTimestampDetails(block.timestamp)
  const v1Data = block.transactions.map(({ from, to, amount }) => `${from} → ${to}: ${amount}`).join('\n') || (b('(trống)', '(empty)'))
  const txHashes = useMemo(() => block.transactions.map(hashTransaction), [block.transactions])
  const tree = useMemo(() => merkleTree(txHashes), [txHashes])
  const makeHashes = (count: number) => Array.from({ length: count }, (_, index) => hashTransaction({ from: `A${index}`, to: `B${index}`, amount: String(index + 1) }))
  const reducedMotion = useReducedMotion()
  const cveHashes = makeHashes(3)
  const cveRootThree = merkleRoot(cveHashes)
  const cveRootFour = merkleRoot([...cveHashes, cveHashes[2]])
  const fieldRoles: Record<string, string> = {
    index: b('Vị trí của block trong chuỗi.', 'Position of the block in the chain.'),
    data: b('Nội dung được lưu trong block cơ bản.', 'Payload stored in the basic block.'),
    timestamp: b('Thời điểm block được tạo.', 'Time the block was created.'),
    previousHash: b('Hash block trước, tạo liên kết chuỗi.', 'Hash of the previous block, forming the chain link.'),
    merkleRoot: b('Tóm tắt toàn bộ giao dịch bằng một root.', 'Summarizes all transactions into a single root.'),
    nonce: b('Giá trị thử để tìm hash đạt difficulty.', 'Value tried until the hash meets difficulty.'),
    validator: b('Địa chỉ ví/miner gắn với block.', 'Wallet/miner address attached to the block.'),
    hash: b('Dấu vân tay của các trường được nối trong công thức.', 'Digest of the fields concatenated in the formula.'),
  }
  const formulaParts = [
    { key: 'index', value: String(block.index) },
    { key: 'timestamp', value: block.timestamp },
    { key: 'previousHash', value: block.previousHash },
    { key: 'merkleRoot', value: calculatedMerkle },
    { key: 'nonce', value: String(block.nonce) },
    { key: 'validator', value: block.validator },
  ]

  return <div className="space-y-4" aria-label={b('Cấu trúc Block và Merkle Tree', 'Block structure and Merkle Tree')}>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div><h3 className="text-sm font-semibold text-slate-100">{b('Block trung tâm', 'Active block')}</h3><p className="mt-1 text-xs text-slate-400">{b('Chọn block để xem cấu trúc và liên kết trong cùng chain.', 'Select a block to inspect its structure and links within the chain.')}</p></div><div className="flex flex-wrap gap-1.5" role="group" aria-label={b('Chọn block', 'Select block')}><div className="flex gap-1 rounded-lg border border-slate-700 p-1">{chain.map((item, index) => <span key={item.index} className="flex items-center">{index > 0 && <Link2 size={11} className={reducedMotion ? 'mx-0.5 shrink-0 text-slate-600' : 'hub-chain-link mx-0.5 shrink-0 text-slate-500'} aria-hidden="true" />}<button type="button" onClick={() => setSelectedBlock(index)} aria-pressed={selectedBlock === index} className={`min-h-9 rounded-md border px-2.5 text-xs font-semibold ${checks[index] && !checks[index].valid && !reducedMotion ? 'hub-merkle-alert border-rose-400/50 text-rose-200' : checks[index] && !checks[index].valid ? 'border-rose-400/50 text-rose-200' : 'border-transparent'} ${selectedBlock === index ? 'bg-sky-300/15 text-sky-100' : 'text-slate-400 hover:text-slate-100'}`}>#{item.index}</button></span>)}</div><div className="flex gap-1 rounded-lg border border-slate-700 p-1" role="group" aria-label={b('Phiên bản cấu trúc block', 'Block structure version')}><button type="button" onClick={() => setVersion('v1')} aria-pressed={version === 'v1'} className={`min-h-9 rounded-md px-3 text-xs ${version === 'v1' ? 'bg-violet-300/15 text-violet-100' : 'text-slate-400'}`}>{b('Block V1 (cơ bản)', 'Block V1 (basic)')}</button><button type="button" onClick={() => setVersion('v2')} aria-pressed={version === 'v2'} className={`min-h-9 rounded-md px-3 text-xs ${version === 'v2' ? 'bg-sky-300/15 text-sky-100' : 'text-slate-400'}`}>{b('Block V2 (có metadata)', 'Block V2 (with metadata)')}</button></div></div></section>

    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.9fr)]">
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"><div><h3 className="text-sm font-semibold text-slate-100">Block #{block.index} · {version.toUpperCase()}</h3><p className="mt-1 text-xs text-slate-400">{b('Mỗi trường có vai trò riêng trong cấu trúc.', 'Each field plays a distinct role in the structure.')}</p></div><span className={`rounded-md px-2 py-1 text-xs font-semibold ${checks[selectedBlock].valid ? 'bg-emerald-300/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200'}`}>{checks[selectedBlock].valid ? b('Hợp lệ', 'Valid') : b('Có lỗi', 'Errors found')}</span></header>
        {version === 'v1' ? <div className="divide-y divide-slate-800 py-1"><BlockField name="index" title="Index" role={fieldRoles.index} value={String(block.index)} selectedField={selectedField} onSelect={setSelectedField} /><FieldRow name="data" title="Data" role={fieldRoles.data} value={v1Data} selected={selectedField === 'data'} onSelect={setSelectedField} /><BlockField name="previousHash" title={b('Hash kế trước', 'Previous hash')} role={fieldRoles.previousHash} value={block.previousHash} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="nonce" title="Nonce" role={fieldRoles.nonce} value={String(block.nonce)} selectedField={selectedField} onSelect={setSelectedField} /><FieldRow name="hash" title="Hash" role={fieldRoles.hash} value={block.hash} selected={selectedField === 'hash'} onSelect={setSelectedField} /></div>
          : <div className="divide-y divide-slate-800 py-1"><BlockField name="index" title="Index" role={fieldRoles.index} value={String(block.index)} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="timestamp" title="Timestamp" role={fieldRoles.timestamp} value={timestamp.iso} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="previousHash" title={b('Hash kế trước', 'Previous hash')} role={fieldRoles.previousHash} value={block.previousHash} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="merkleRoot" title="Merkle root" role={fieldRoles.merkleRoot} value={block.merkleRoot} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="nonce" title="Nonce" role={fieldRoles.nonce} value={String(block.nonce)} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="validator" title={b('Validator / Miner', 'Validator / Miner')} role={fieldRoles.validator} value={block.validator} selectedField={selectedField} onSelect={setSelectedField} /><FieldRow name="hash" title={b('Hash block', 'Block hash')} role={fieldRoles.hash} value={block.hash} selected={selectedField === 'hash'} onSelect={setSelectedField} />
            <div className="space-y-2 px-3 py-3"><div className="flex items-center justify-between"><h4 className="text-xs font-semibold text-slate-200">{b('Timestamp (thời gian)', 'Timestamp')}</h4><button type="button" onClick={() => setBlockTimestamp(block.index, new Date().toISOString())} aria-label={b('Đặt timestamp bằng thời gian hiện tại', 'Set timestamp to the current time')} title={b('Đặt timestamp = bây giờ để xem hash thay đổi', 'Set timestamp = now to see the hash change')} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-sky-300/25 px-2.5 text-xs text-sky-100 hover:border-sky-300/50"><Clock3 size={14} />{b('Đặt timestamp = bây giờ', 'Set timestamp = now')}</button></div><p className="whitespace-nowrap overflow-x-auto rounded bg-slate-950/60 px-2 py-1 font-mono text-xs text-sky-200" title={b('T ngăn ngày và giờ; Z biểu thị UTC; epoch là số mili giây từ 1970-01-01.', 'T separates date and time; Z means UTC; epoch is milliseconds since 1970-01-01.')}>{b('ISO 8601 UTC', 'ISO 8601 UTC')}: {timestamp.iso} <span className="ml-2 cursor-help text-slate-400" aria-label={b('T ngăn ngày và giờ; Z là UTC; epoch là ms từ 1970-01-01.', 'T separates date and time; Z is UTC; epoch is ms since 1970-01-01.')}>ⓘ</span></p><p className="text-xs text-slate-300">Epoch ms: <code className="font-mono text-sky-200">{timestamp.epoch}</code></p><p className="text-xs text-slate-300">{b('Giờ địa phương (UTC+7)', 'Local time (UTC+7)')}: <code className="text-sky-200">{timestamp.utc7}</code></p><p className="text-xs text-slate-400">{b('T ngăn ngày và giờ · Z = UTC · epoch = mili giây từ 1970-01-01.', 'T separates date and time · Z = UTC · epoch = milliseconds since 1970-01-01.')}</p></div>
            <div className="grid gap-2 px-3 py-3 sm:grid-cols-2"><div className="rounded-md border border-rose-300/15 bg-rose-300/[0.04] p-2"><h4 className="text-xs font-semibold text-rose-100">{b('Nonce (bộ đếm PoW)', 'Nonce (PoW counter)')}</h4><p className="mt-1 text-xs text-slate-300">{b(`Lần thử ${block.nonce.toLocaleString()} · difficulty ${block.difficulty} số 0 hex đầu.`, `Attempt ${block.nonce.toLocaleString()} · difficulty ${block.difficulty} leading hex zeros.`)}</p></div><div className="rounded-md border border-slate-700 bg-slate-950/40 p-2"><h4 className="text-xs font-semibold text-slate-200">{b('Không nằm trực tiếp trong hash', 'Not directly in the hash')}</h4><p className="mt-1 text-xs text-slate-400">{b('Từng giao dịch được cam kết qua Merkle root; chữ ký/trạng thái UI và difficulty không nối vào preimage. Difficulty chỉ là ngưỡng kiểm tra PoW.', 'Each transaction is committed via the Merkle root; signature/UI state and difficulty are not concatenated into the preimage. Difficulty is only the PoW threshold.')}</p></div></div>
          </div>}
      </section>

      <section className="min-w-0 space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3"><h3 className="text-sm font-semibold text-slate-100">{b('Công thức hash của block', 'Block hash formula')}</h3><p className="mt-1 text-xs text-slate-400">{b('Đúng theo code hiện tại: validator được nối vào cuối. Giao dịch được tóm tắt bởi Merkle root. Các trường phân cách bằng dấu "|".', 'Matches the current code: the validator is appended last. Transactions are summarized by the Merkle root. Fields are separated by "|".')}</p><code className="mt-2 block break-all rounded-md bg-slate-950/70 p-2 font-mono text-xs text-sky-200">blockHash = SHA256(index | timestamp | previousHash | merkleRoot | nonce | validator)</code><div className="mt-2 flex flex-wrap gap-1.5 text-xs">{formulaParts.map(({ key, value }) => <span key={key} className={`rounded border border-slate-700 px-2 py-1 font-mono ${fieldColors[key]} ${selectedField === key ? 'ring-1 ring-amber-300' : ''}`}>{key}: {value.length > 24 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value}</span>)}</div><p className="mt-2 text-xs font-semibold text-slate-300">{b('Chuỗi nối thực tế đưa vào SHA-256 (có dấu phân cách "|"):', 'Actual concatenated string fed into SHA-256 (with "|" separators):')}</p><div className="relative flex flex-wrap break-all overflow-hidden rounded-md bg-slate-950/70 p-2 font-mono text-xs" aria-label={blockHashPreimage({ index: block.index, timestamp: block.timestamp, previousHash: block.previousHash, merkleRoot: calculatedMerkle, nonce: block.nonce, validator: block.validator })}>{!reducedMotion && <motion.i key={calculatedHash} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/4" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.22), transparent)' }} initial={{ x: '-120%' }} animate={{ x: '460%' }} transition={{ duration: 1.1, delay: 0.15, ease: 'easeInOut' }} />}<code className={fieldColors.index}>{block.index}</code><code className="text-slate-400">|</code><code className={fieldColors.timestamp}>{block.timestamp}</code><code className="text-slate-400">|</code><code className={fieldColors.previousHash}>{block.previousHash}</code><code className="text-slate-400">|</code><code className={fieldColors.merkleRoot}>{calculatedMerkle}</code><code className="text-slate-400">|</code><code className={fieldColors.nonce}>{block.nonce}</code><code className="text-slate-400">|</code><code className={fieldColors.validator}>{block.validator}</code></div><HashLine hash={calculatedHash} label={b('Kết quả SHA-256', 'SHA-256 output')} /></div>
        <MerkleTree txHashes={txHashes} labels={block.transactions.map((transaction) => transaction.id)} selectedIndex={selectedTx} onSelect={(index) => setSelectedTx(index)} />
      </section>
    </div>

    <div className="space-y-2"><TransactionTable block={block} selectedIndex={selectedTx} onSelect={setSelectedTx} /><HashLine hash={calculatedMerkle} label={b('Merkle root (tính lại từ hash giao dịch)', 'Merkle root (recomputed from transaction hashes)')} /></div>

    <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70"><h3 className="p-3 text-sm font-semibold text-slate-100">{b('Các loại hash', 'Hash types')}</h3><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-slate-950/70"><tr>{[b('Loại hash', 'Hash type'), b('Tính từ gì', 'Computed from'), b('Công thức', 'Formula'), b('Bảo vệ điều gì', 'What it protects'), b('Nằm ở đâu', 'Where it lives')].map((item) => <th className="p-2 text-xs font-semibold text-slate-300" key={item}>{item}</th>)}</tr></thead><tbody>{[
      [b('Hash giao dịch', 'Transaction hash'), b('From, To, Amount', 'From, To, Amount'), 'SHA256(canonical JSON)', b('Tính toàn vẹn của từng giao dịch', 'Integrity of each transaction'), b('Lá Merkle', 'Merkle leaf')],
      [b('Merkle root', 'Merkle root'), b('Danh sách hash giao dịch', 'Transaction hashes'), 'SHA256(left ‖ right)', b('Tính toàn vẹn toàn bộ giao dịch', 'Integrity of all transactions'), b('Header block', 'Block header')],
      [b('Hash block', 'Block hash'), b('Index + timestamp + previousHash + Merkle + nonce + validator', 'Index + timestamp + previousHash + Merkle + nonce + validator'), 'SHA256(concatenated fields)', b('Tính toàn vẹn block + PoW', 'Block integrity + PoW'), b('Cuối block', 'End of the block')],
      [b('Hash kế trước', 'Previous hash'), b('Hash block ngay trước', 'Hash of the block right before'), b('Hash block N−1', 'Block N−1 hash'), b('Liên kết các block', 'Links blocks together'), b('Header block N', 'Block N header')],
    ].map((row) => <tr className="border-t border-slate-800" key={row[0]}>{row.map((cell, index) => <td className="p-2 text-xs leading-5 text-slate-300" key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></section>

    <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70"><h3 className="p-3 text-sm font-semibold text-slate-100">{b('So sánh cấu trúc', 'Structure comparison')}</h3><table className="w-full min-w-[620px] border-collapse text-left"><thead className="bg-slate-950/70"><tr><th className="p-2 text-xs text-slate-300">{b('Thuộc tính', 'Attribute')}</th><th className="p-2 text-xs text-slate-300">{b('V1 · cơ bản', 'V1 · basic')}</th><th className="p-2 text-xs text-slate-300">{b('V2 · metadata', 'V2 · metadata')}</th></tr></thead><tbody>{[[b('Index', 'Index'), b('Có', 'Yes'), b('Có', 'Yes')], [b('Data / giao dịch', 'Data / transactions'), b('Data tự do', 'Free-form data'), b('Danh sách giao dịch', 'Transaction list')], [b('Timestamp', 'Timestamp'), b('Không có', 'No'), 'ISO 8601 UTC'], [b('Hash kế trước', 'Previous hash'), b('Có', 'Yes'), b('Có', 'Yes')], [b('Merkle root', 'Merkle root'), b('Không có', 'No'), b('Có', 'Yes')], [b('Nonce + difficulty', 'Nonce + difficulty'), b('Nonce', 'Nonce'), b('Nonce và độ khó PoW', 'Nonce and PoW difficulty')], [b('Validator / miner', 'Validator / miner'), b('Không có', 'No'), b('Địa chỉ validator', 'Validator address')]].map((row) => <tr className="border-t border-slate-800" key={row[0]}>{row.map((cell, index) => <td className="p-2 text-xs text-slate-300" key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody></table><p className="px-3 pb-3 text-xs text-slate-400">{b('Ghi chú: V2 hiện tại nối validator vào công thức hash, dù difficulty không nằm trong hash.', 'Note: current V2 concatenates the validator into the hash formula, although difficulty is not part of the hash.')}</p></section>

    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2"><Search size={16} />{b('Xác minh Merkle proof', 'Merkle proof verification')}</h3>
      <p className="mt-1 text-xs text-slate-400">{b('Chọn một giao dịch từ Merkle Tree ở trên để xem chứng minh (proof) và xác minh nó dẫn đến đúng root.', 'Select a transaction from the Merkle tree above to view its proof and verify it leads to the correct root.')}</p>
      {selectedTx !== null && txHashes[selectedTx] !== undefined && (
        <div className="mt-3 space-y-3">
          <div className="rounded-md border border-slate-700 bg-slate-950/60 p-3">
            <h4 className="text-xs font-semibold text-slate-200">{b(`Chứng minh cho Tx ${selectedTx + 1}`, `Proof for Tx ${selectedTx + 1}`)}</h4>
            <p className="mt-1 text-xs text-slate-300">Leaf hash: <code className="font-mono text-sky-200">{txHashes[selectedTx]}</code></p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tree.proofs[selectedTx].map((node, stepIndex) => (
                <span key={stepIndex} className={`rounded border border-slate-700 px-2 py-1 font-mono text-xs ${node.side === 'left' ? 'text-fuchsia-200' : 'text-cyan-200'}`}>
                  {node.side === 'left' ? '←' : '→'} {node.hash.slice(0, 12)}…
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-300">{b('Tính dần ra:', 'Recomputes to:')} <code className="font-mono text-sky-200">{tree.root}</code></p>
          </div>
          <div className="rounded-md p-3" style={{ backgroundColor: verifyMerkleProof(txHashes[selectedTx], tree.proofs[selectedTx], tree.root) ? '#0f241a' : '#24151d' }}>
            <div className="flex items-center gap-2">
              {verifyMerkleProof(txHashes[selectedTx], tree.proofs[selectedTx], tree.root) ? <Check className="text-emerald-300" size={16} /> : <AlertCircle className="text-rose-300" size={16} />}
              <span className="text-xs font-semibold" style={{ color: verifyMerkleProof(txHashes[selectedTx], tree.proofs[selectedTx], tree.root) ? '#6ee7b7' : '#fb7185' }}>
                {verifyMerkleProof(txHashes[selectedTx], tree.proofs[selectedTx], tree.root) ? b('Chứng minh HỢP LỆ — leaf khớp root', 'Proof VALID — leaf matches the root') : b('Chứng minh KHÔNG HỢP LỆ — leaf/root không khớp', 'Proof INVALID — leaf/root mismatch')}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>

    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2"><AlertCircle size={16} className="text-amber-300" />{b('Nút lẻ bị nhân đôi — CVE-2012-2459', 'Duplicated odd node — CVE-2012-2459')}</h3>
      <p className="mt-1 text-xs text-slate-400">{b('Khi số lá lẻ, Bitcoin nhân đôi nút cuối cùng để tạo cặp. Điều này khiến [A,B,C] và [A,B,C,C] có cùng root. Demo dưới đây minh họa.', 'When the leaf count is odd, Bitcoin duplicates the last node to form a pair. This makes [A,B,C] and [A,B,C,C] share one root. The demo below illustrates it.')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-700 bg-slate-950/60 p-3">
          <h4 className="text-xs font-semibold text-slate-200">{b('3 giao dịch: [A, B, C]', '3 transactions: [A, B, C]')}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">{['A', 'B', 'C'].map((letter, position) => <motion.span key={letter} initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, delay: position * 0.12, ease: 'easeOut' }} className="grid size-7 place-items-center rounded border border-slate-600 bg-slate-900 font-mono text-xs font-semibold text-slate-200">{letter}</motion.span>)}</div>
          <p className="mt-1 text-xs text-slate-300">Root: <code className={`font-mono text-sky-200 ${reducedMotion ? '' : 'hub-merkle-root inline-block rounded px-1'}`}>{cveRootThree}</code></p>
          <p className="mt-1 text-xs text-slate-400">{b('Cây: (A+B) + (C+C) → root', 'Tree: (A+B) + (C+C) → root')}</p>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-950/60 p-3">
          <h4 className="text-xs font-semibold text-slate-200">{b('4 giao dịch: [A, B, C, C] (C bị nhân đôi)', '4 transactions: [A, B, C, C] (C duplicated)')}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">{['A', 'B', 'C'].map((letter, position) => <motion.span key={letter} initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, delay: position * 0.12, ease: 'easeOut' }} className="grid size-7 place-items-center rounded border border-slate-600 bg-slate-900 font-mono text-xs font-semibold text-slate-200">{letter}</motion.span>)}<motion.span initial={reducedMotion ? false : { opacity: 0, scale: 0.5, x: -12 }} animate={reducedMotion ? undefined : { opacity: [0, 1, 1], scale: [0.5, 1.18, 1], x: [-12, 4, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }} className="inline-flex items-center gap-1 rounded border border-amber-300/60 bg-amber-300/10 px-1.5 py-1 font-mono text-xs font-semibold text-amber-100"><Copy size={11} />C</motion.span></div>
          <p className="mt-1 text-xs text-slate-300">Root: <code className={`font-mono text-sky-200 ${reducedMotion ? '' : 'hub-merkle-root inline-block rounded px-1'}`}>{cveRootFour}</code></p>
          <p className="mt-1 text-xs text-slate-400">{b('Cây: (A+B) + (C+C) → root', 'Tree: (A+B) + (C+C) → root')}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <code className="max-w-[42%] truncate font-mono text-xs text-sky-200">{cveRootThree.slice(0, 14)}…</code>
        <span className="relative block h-px w-16 sm:w-24"><motion.i className="absolute left-0 top-[-4px] block size-2 rounded-full bg-emerald-300" initial={false} animate={reducedMotion ? undefined : { x: [0, 56] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.1, ease: 'easeInOut' }} /></span>
        <motion.span className="font-mono text-sm font-semibold text-emerald-200" initial={false} animate={reducedMotion ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.14, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>≡</motion.span>
        <span className="relative block h-px w-16 sm:w-24"><motion.i className="absolute left-0 top-[-4px] block size-2 rounded-full bg-emerald-300" initial={false} animate={reducedMotion ? undefined : { x: [56, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.1, ease: 'easeInOut' }} /></span>
        <code className="max-w-[42%] truncate font-mono text-xs text-sky-200">{cveRootFour.slice(0, 14)}…</code>
      </div>
      <div className="mt-3 rounded-md p-3" style={{ backgroundColor: cveRootThree === cveRootFour ? '#0f241a' : '#24151d' }}>
        <div className="flex items-center gap-2">
          {cveRootThree === cveRootFour ? <motion.span initial={false} animate={reducedMotion ? undefined : { scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="inline-flex"><Check className="text-emerald-300" size={16} /></motion.span> : <AlertCircle className="text-rose-300" size={16} />}
          <span className="text-xs font-semibold" style={{ color: cveRootThree === cveRootFour ? '#6ee7b7' : '#fb7185' }}>
            {cveRootThree === cveRootFour ? b('CẢNH BÁO: Cùng root — tấn công CVE-2012-2459 có thể xảy ra', 'WARNING: Same root — the CVE-2012-2459 attack is possible') : b('Root khác nhau (không mong đợi)', 'Different roots (unexpected)')}
          </span>
        </div>
      </div>
    </section>

    <RealityCheck />
    <LearningGoals />
  </div>
}
