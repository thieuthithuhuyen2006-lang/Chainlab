import { Trash2 } from 'lucide-react'
import { hashTransaction, type Block, type Transaction } from '../lib/chain'
import { addTransaction, removeTransaction, updateTransaction } from '../lib/chainStore'

const addressPattern = /^0x[a-f\d]{40}$/i

export default function TransactionTable({ block, selectedIndex = null, onSelect }: { block: Block; selectedIndex?: number | null; onSelect?: (index: number) => void }) {
  return <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70" aria-label={`Giao dịch block ${block.index}`}><div className="flex flex-wrap items-center justify-between gap-2 p-3"><div><h3 className="text-sm font-semibold text-slate-100">Transactions (giao dịch có cấu trúc)</h3><p className="mt-1 text-xs text-slate-400">From, To và Amount được chuẩn hóa trước khi băm; chữ ký chỉ đọc.</p></div><button type="button" onClick={() => addTransaction(block.index)} aria-label="Thêm giao dịch" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-emerald-300/25 px-3 text-xs text-emerald-100"><span aria-hidden="true">+</span>Thêm giao dịch</button></div><table className="w-full min-w-[940px] border-collapse text-left"><thead className="bg-slate-950/70"><tr>{['From', 'To', 'Amount', 'Tx hash', 'Signature', ''].map((item, index) => <th className="p-2 text-xs font-semibold text-slate-300" key={`${item}-${index}`}>{item}</th>)}</tr></thead><tbody>{block.transactions.map((transaction, index) => <TransactionRow key={transaction.id} blockIndex={block.index} transaction={transaction} index={index} selected={selectedIndex === index} onSelect={onSelect} />)}</tbody></table></section>
}

function TransactionRow({ blockIndex, transaction, index, selected, onSelect }: { blockIndex: number; transaction: Transaction; index: number; selected: boolean; onSelect?: (index: number) => void }) {
  const fromValid = addressPattern.test(transaction.from)
  const toValid = addressPattern.test(transaction.to)
  const amountValid = Number.isFinite(Number(transaction.amount)) && Number(transaction.amount) > 0
  const sameAddress = transaction.from.trim().toLowerCase() === transaction.to.trim().toLowerCase()
  const update = (field: 'from' | 'to' | 'amount', value: string) => updateTransaction(blockIndex, transaction.id, { [field]: value })
  return <tr className={`border-t border-slate-800 align-top ${selected ? 'bg-amber-300/[0.07]' : ''}`}>
    <td className="min-w-44 p-2"><label className="block text-xs font-semibold text-slate-300">From<input aria-label={`Giao dịch ${index + 1}, địa chỉ gửi`} value={transaction.from} onChange={(event) => update('from', event.target.value)} className="mt-1 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 font-mono text-xs text-slate-100 outline-none focus:border-sky-300/50" /></label>{!fromValid && <span className="text-xs text-rose-300">Địa chỉ phải là 0x + 40 ký tự hex.</span>}</td>
    <td className="min-w-44 p-2"><label className="block text-xs font-semibold text-slate-300">To<input aria-label={`Giao dịch ${index + 1}, địa chỉ nhận`} value={transaction.to} onChange={(event) => update('to', event.target.value)} className="mt-1 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 font-mono text-xs text-slate-100 outline-none focus:border-sky-300/50" /></label>{(!toValid || sameAddress) && <span className="text-xs text-rose-300">{sameAddress ? 'From và To phải khác nhau.' : 'Địa chỉ phải là 0x + 40 ký tự hex.'}</span>}</td>
    <td className="min-w-28 p-2"><label className="block text-xs font-semibold text-slate-300">Amount<input aria-label={`Giao dịch ${index + 1}, số tiền`} type="number" min="0.00000001" step="any" value={transaction.amount} onChange={(event) => update('amount', event.target.value)} className="mt-1 min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 font-mono text-xs text-slate-100 outline-none focus:border-sky-300/50" /></label>{!amountValid && <span className="text-xs text-rose-300">Amount phải lớn hơn 0.</span>}</td>
    <td className="min-w-64 p-2"><button type="button" onClick={() => onSelect?.(index)} aria-pressed={selected} aria-label={`Chọn đường Merkle của giao dịch ${index + 1}`} className="block w-full break-all text-left font-mono text-xs text-emerald-200">{hashTransaction(transaction)}</button></td>
    <td className="whitespace-nowrap p-2 text-xs text-slate-300">{transaction.signatureStatus === 'signed' ? 'Đã ký ✓' : 'Chưa ký'}</td>
    <td className="p-2"><button type="button" aria-label={`Xóa giao dịch ${index + 1}`} onClick={() => removeTransaction(blockIndex, transaction.id)} className="grid size-9 place-items-center rounded-md border border-slate-700 text-slate-400 hover:border-rose-400/40 hover:text-rose-200"><Trash2 size={14} /></button></td>
  </tr>
}