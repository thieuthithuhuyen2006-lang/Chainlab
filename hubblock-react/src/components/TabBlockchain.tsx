import { useMemo, useState } from 'react'
import { Clock3 } from 'lucide-react'
import MerkleTree from './MerkleTree'
import TransactionTable from './TransactionTable'
import { hashBlock, hashTransaction, merkleRoot, validateChain, type Block } from '../lib/chain'
import { setBlockTimestamp } from '../lib/chainStore'
import { useChain } from '../lib/useChain'

type Version = 'v1' | 'v2'
const fieldColors: Record<string, string> = {
  index: 'text-violet-200', data: 'text-fuchsia-200', timestamp: 'text-sky-200', previousHash: 'text-amber-200', merkleRoot: 'text-emerald-200', nonce: 'text-rose-200', validator: 'text-cyan-200', hash: 'text-orange-200',
}
const fieldRoles: Record<string, string> = {
  index: 'Vị trí của block trong chuỗi (Block position).',
  data: 'Nội dung được lưu trong block cơ bản (Block payload).',
  timestamp: 'Thời điểm block được tạo (Creation time).',
  previousHash: 'Hash block trước, tạo liên kết chuỗi (Chain link).',
  merkleRoot: 'Tóm tắt toàn bộ giao dịch bằng một root (Transaction commitment).',
  nonce: 'Giá trị thử để tìm hash đạt difficulty (Proof-of-work counter).',
  validator: 'Địa chỉ ví/miner gắn với block (Miner identity).',
  hash: 'Dấu vân tay của các trường được nối trong công thức (Block digest).',
}

function FieldRow({ name, title, value, selected, onSelect, children }: { name: string; title: string; value: string; selected: boolean; onSelect: (field: string) => void; children?: React.ReactNode }) {
  return <button type="button" onMouseEnter={() => onSelect(name)} onFocus={() => onSelect(name)} onClick={() => onSelect(name)} aria-pressed={selected} className={`grid w-full grid-cols-[9rem_1fr] gap-3 border-l-2 px-3 py-2 text-left transition ${selected ? 'border-amber-300 bg-amber-300/[0.07]' : 'border-transparent hover:bg-slate-800/50'}`}>
    <span><strong className={`block text-xs font-semibold ${fieldColors[name] ?? 'text-slate-200'}`}>{title}</strong><span className="mt-1 block text-xs leading-4 text-slate-400">{fieldRoles[name] ?? ''}</span></span>
    <span className={`min-w-0 self-center break-all font-mono text-xs ${fieldColors[name] ?? 'text-slate-200'}`}>{children ?? value}</span>
  </button>
}

function HashLine({ hash, label, stored = false }: { hash: string; label: string; stored?: boolean }) {
  return <div className={`rounded-md border p-2 ${stored ? 'border-rose-400/25 bg-rose-400/[0.04]' : 'border-slate-800 bg-slate-950/60'}`}><span className="mb-1 block text-xs font-semibold text-slate-300">{label}</span><code className="grid grid-cols-4 gap-x-1 font-mono text-xs leading-5 sm:grid-cols-8" aria-label={`${label}: ${hash}`}>{Array.from({ length: 8 }, (_, index) => <span key={index} className="whitespace-nowrap">{hash.slice(index * 8, index * 8 + 8)}</span>)}</code></div>
}

function BlockField({ name, title, value, selectedField, onSelect }: { name: string; title: string; value: string; selectedField: string; onSelect: (field: string) => void }) {
  return <FieldRow name={name} title={title} value={value} selected={selectedField === name} onSelect={onSelect} />
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
  const [selectedBlock, setSelectedBlock] = useState(0)
  const [version, setVersion] = useState<Version>('v2')
  const [selectedField, setSelectedField] = useState('index')
  const [selectedTx, setSelectedTx] = useState<number | null>(null)
  const block: Block = chain[Math.min(selectedBlock, chain.length - 1)]
  const checks = validateChain(chain, block.difficulty)
  const calculatedMerkle = merkleRoot(block.transactions.map(hashTransaction))
  const calculatedHash = hashBlock({ ...block, merkleRoot: calculatedMerkle })
  const timestamp = currentTimestampDetails(block.timestamp)
  const v1Data = block.transactions.map(({ from, to, amount }) => `${from} → ${to}: ${amount}`).join('\n') || '(empty)'
  const txHashes = useMemo(() => block.transactions.map(hashTransaction), [block.transactions])
  const formulaParts = [
    { key: 'index', value: String(block.index) },
    { key: 'timestamp', value: block.timestamp },
    { key: 'previousHash', value: block.previousHash },
    { key: 'merkleRoot', value: calculatedMerkle },
    { key: 'nonce', value: String(block.nonce) },
    { key: 'validator', value: block.validator },
  ]

  return <div className="space-y-4" aria-label="Cấu trúc Block và Merkle Tree">
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div><h3 className="text-sm font-semibold text-slate-100">Block trung tâm (Active block)</h3><p className="mt-1 text-xs text-slate-400">Chọn block để xem cấu trúc và liên kết trong cùng chain.</p></div><div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn block"><div className="flex gap-1 rounded-lg border border-slate-700 p-1">{chain.map((item, index) => <button key={item.index} type="button" onClick={() => setSelectedBlock(index)} aria-pressed={selectedBlock === index} className={`min-h-9 rounded-md px-2.5 text-xs font-semibold ${selectedBlock === index ? 'bg-sky-300/15 text-sky-100' : 'text-slate-400 hover:text-slate-100'}`}>#{item.index}</button>)}</div><div className="flex gap-1 rounded-lg border border-slate-700 p-1" role="group" aria-label="Phiên bản cấu trúc block"><button type="button" onClick={() => setVersion('v1')} aria-pressed={version === 'v1'} className={`min-h-9 rounded-md px-3 text-xs ${version === 'v1' ? 'bg-violet-300/15 text-violet-100' : 'text-slate-400'}`}>Block V1 (cơ bản)</button><button type="button" onClick={() => setVersion('v2')} aria-pressed={version === 'v2'} className={`min-h-9 rounded-md px-3 text-xs ${version === 'v2' ? 'bg-sky-300/15 text-sky-100' : 'text-slate-400'}`}>Block V2 (có metadata)</button></div></div></section>

    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.9fr)]">
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"><div><h3 className="text-sm font-semibold text-slate-100">Block #{block.index} · {version.toUpperCase()}</h3><p className="mt-1 text-xs text-slate-400">Mỗi trường có vai trò riêng trong cấu trúc.</p></div><span className={`rounded-md px-2 py-1 text-xs font-semibold ${checks[selectedBlock].valid ? 'bg-emerald-300/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200'}`}>{checks[selectedBlock].valid ? 'Hợp lệ' : 'Có lỗi'}</span></header>
        {version === 'v1' ? <div className="divide-y divide-slate-800 py-1"><BlockField name="index" title="Index" value={String(block.index)} selectedField={selectedField} onSelect={setSelectedField} /><FieldRow name="data" title="Data" value={v1Data} selected={selectedField === 'data'} onSelect={setSelectedField} /><BlockField name="previousHash" title="Previous hash" value={block.previousHash} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="nonce" title="Nonce" value={String(block.nonce)} selectedField={selectedField} onSelect={setSelectedField} /><FieldRow name="hash" title="Hash" value={block.hash} selected={selectedField === 'hash'} onSelect={setSelectedField} /></div>
          : <div className="divide-y divide-slate-800 py-1"><BlockField name="index" title="Index" value={String(block.index)} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="timestamp" title="Timestamp" value={timestamp.iso} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="previousHash" title="Previous hash" value={block.previousHash} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="merkleRoot" title="Merkle root" value={block.merkleRoot} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="nonce" title="Nonce" value={String(block.nonce)} selectedField={selectedField} onSelect={setSelectedField} /><BlockField name="validator" title="Validator / Miner" value={block.validator} selectedField={selectedField} onSelect={setSelectedField} /><FieldRow name="hash" title="Block hash" value={block.hash} selected={selectedField === 'hash'} onSelect={setSelectedField} />
            <div className="space-y-2 px-3 py-3"><div className="flex items-center justify-between"><h4 className="text-xs font-semibold text-slate-200">Timestamp (thời gian)</h4><button type="button" onClick={() => setBlockTimestamp(block.index, new Date().toISOString())} aria-label="Đặt timestamp bằng thời gian hiện tại" title="Đặt timestamp = bây giờ để xem hash thay đổi" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-sky-300/25 px-2.5 text-xs text-sky-100 hover:border-sky-300/50"><Clock3 size={14} />Đặt timestamp = bây giờ</button></div><p className="whitespace-nowrap overflow-x-auto rounded bg-slate-950/60 px-2 py-1 font-mono text-xs text-sky-200" title="T ngăn ngày và giờ; Z biểu thị UTC; epoch là số mili giây từ 1970-01-01.">ISO 8601 UTC: {timestamp.iso} <span className="ml-2 cursor-help text-slate-400" aria-label="T ngăn ngày và giờ; Z là UTC; epoch là ms từ 1970-01-01.">ⓘ</span></p><p className="text-xs text-slate-300">Epoch ms: <code className="font-mono text-sky-200">{timestamp.epoch}</code></p><p className="text-xs text-slate-300">Giờ địa phương (UTC+7): <code className="text-sky-200">{timestamp.utc7}</code></p><p className="text-xs text-slate-400">T ngăn ngày và giờ · Z = UTC · epoch = mili giây từ 1970-01-01.</p></div>
            <div className="grid gap-2 px-3 py-3 sm:grid-cols-2"><div className="rounded-md border border-rose-300/15 bg-rose-300/[0.04] p-2"><h4 className="text-xs font-semibold text-rose-100">Nonce (PoW counter)</h4><p className="mt-1 text-xs text-slate-300">Lần thử {block.nonce.toLocaleString()} · difficulty {block.difficulty} số 0 hex đầu.</p></div><div className="rounded-md border border-slate-700 bg-slate-950/40 p-2"><h4 className="text-xs font-semibold text-slate-200">Không nằm trực tiếp trong hash</h4><p className="mt-1 text-xs text-slate-400">Từng transaction được cam kết qua Merkle root; chữ ký/trạng thái UI và difficulty không nối vào preimage. Difficulty chỉ là ngưỡng kiểm tra PoW.</p></div></div>
          </div>}
      </section>

      <section className="min-w-0 space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3"><h3 className="text-sm font-semibold text-slate-100">Công thức hash của block (Block hash formula)</h3><p className="mt-1 text-xs text-slate-400">Đúng theo code hiện tại: validator được nối vào cuối. Giao dịch được tóm tắt bởi Merkle root.</p><code className="mt-2 block break-all rounded-md bg-slate-950/70 p-2 font-mono text-xs text-sky-200">blockHash = SHA256(index ‖ timestamp ‖ previousHash ‖ merkleRoot ‖ nonce ‖ validator)</code><div className="mt-2 flex flex-wrap gap-1.5 text-xs">{formulaParts.map(({ key, value }) => <span key={key} className={`rounded border border-slate-700 px-2 py-1 font-mono ${fieldColors[key]} ${selectedField === key ? 'ring-1 ring-amber-300' : ''}`}>{key}: {value.length > 24 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value}</span>)}</div><p className="mt-2 text-xs font-semibold text-slate-300">Chuỗi nối thực tế đưa vào SHA-256 (các màu tách trường, không có dấu phân cách):</p><div className="flex flex-wrap break-all rounded-md bg-slate-950/70 p-2 font-mono text-xs" aria-label={formulaParts.map(({ value }) => value).join('')}>{formulaParts.map(({ key, value }) => <code key={key} className={`${fieldColors[key]} ${selectedField === key ? 'rounded ring-1 ring-amber-300' : ''}`}>{value}</code>)}</div><HashLine hash={calculatedHash} label="SHA-256 output" /></div>
        <MerkleTree txHashes={txHashes} labels={block.transactions.map((transaction) => transaction.id)} selectedIndex={selectedTx} onSelect={(index) => setSelectedTx(index)} />
      </section>
    </div>

    <div className="space-y-2"><TransactionTable block={block} selectedIndex={selectedTx} onSelect={setSelectedTx} /><HashLine hash={calculatedMerkle} label="Merkle root (recomputed from transaction hashes)" /></div>

    <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70"><h3 className="p-3 text-sm font-semibold text-slate-100">Các loại hash (Hash types)</h3><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-slate-950/70"><tr>{['Loại hash', 'Tính từ gì', 'Công thức', 'Bảo vệ điều gì', 'Nằm ở đâu'].map((item) => <th className="p-2 text-xs font-semibold text-slate-300" key={item}>{item}</th>)}</tr></thead><tbody>{[
      ['Transaction hash', 'From, To, Amount', 'SHA256(canonical JSON)', 'Integrity của từng giao dịch', 'Transaction leaf'],
      ['Merkle root', 'Transaction hashes', 'SHA256(left ‖ right)', 'Tính toàn vẹn toàn bộ giao dịch', 'Block header'],
      ['Block hash', 'Index + timestamp + previousHash + Merkle + nonce + validator', 'SHA256(concatenated fields)', 'Tính toàn vẹn block + PoW', 'Cuối block'],
      ['Previous hash', 'Hash block ngay trước', 'Block N−1 hash', 'Liên kết các block', 'Block N header'],
    ].map((row) => <tr className="border-t border-slate-800" key={row[0]}>{row.map((cell, index) => <td className="p-2 text-xs leading-5 text-slate-300" key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></section>

    <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70"><h3 className="p-3 text-sm font-semibold text-slate-100">So sánh cấu trúc (Block versions)</h3><table className="w-full min-w-[620px] border-collapse text-left"><thead className="bg-slate-950/70"><tr><th className="p-2 text-xs text-slate-300">Thuộc tính</th><th className="p-2 text-xs text-slate-300">V1 · cơ bản</th><th className="p-2 text-xs text-slate-300">V2 · code hiện tại</th></tr></thead><tbody>{[['Index', 'Có', 'Có'], ['Data / transactions', 'Data tự do', 'Danh sách giao dịch'], ['Timestamp', 'Không có', 'ISO 8601 UTC'], ['Previous hash', 'Có', 'Có'], ['Merkle root', 'Không có', 'Có'], ['Nonce + difficulty', 'Nonce', 'Nonce và độ khó PoW'], ['Validator / miner', 'Không có', 'Địa chỉ validator']].map((row) => <tr className="border-t border-slate-800" key={row[0]}>{row.map((cell, index) => <td className="p-2 text-xs text-slate-300" key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody></table><p className="px-3 pb-3 text-xs text-slate-400">Ghi chú: V2 hiện tại nối validator vào công thức hash, dù difficulty không nằm trong hash.</p></section>
  </div>
}