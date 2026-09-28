import { useMemo, useState } from 'react'
import { Check, Copy, Fingerprint, GitBranch, LockKeyhole, RotateCcw, Sigma, Sparkles, Zap } from 'lucide-react'
import CryptoJS from 'crypto-js'

const initialA = 'Blockchain is built on verifiable data.'
const initialB = 'alockchain is built on verifiable data.'

function hashText(value: string) {
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex)
}

function changedBitCount(first: string, second: string) {
  return [...first].reduce((total, character, index) => {
    const differentBits = Number.parseInt(character, 16) ^ Number.parseInt(second[index] ?? '0', 16)
    return total + differentBits.toString(2).replaceAll('0', '').length
  }, 0)
}

function DiffHash({ value, compareTo }: { value: string; compareTo: string }) {
  return <code className="break-all font-mono text-[10px] leading-[1.8]">{[...value].map((character, index) => <span key={index} className={character === compareTo[index] ? 'text-emerald-200' : 'rounded-sm bg-rose-400/15 text-rose-300'}>{character}</span>)}</code>
}

export default function TabSHA256() {
  const [inputA, setInputA] = useState(initialA)
  const [inputB, setInputB] = useState(initialB)
  const [showPreimageNotice, setShowPreimageNotice] = useState(false)
  const [copied, setCopied] = useState(false)
  const hashA = useMemo(() => hashText(inputA), [inputA])
  const hashB = useMemo(() => hashText(inputB), [inputB])
  const changedBits = changedBitCount(hashA, hashB)
  const changedPercent = (changedBits / 256 * 100).toFixed(1)
  const byteLength = new TextEncoder().encode(inputA).length

  async function copyHash() {
    try {
      await navigator.clipboard?.writeText(hashA)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><label htmlFor="sha-primary-input" className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">Input A · real-time</label><span className="font-mono text-[9px] text-slate-500">{byteLength} BYTES <span className="px-1 text-slate-700">·</span> UTF-8</span></div>
        <textarea id="sha-primary-input" value={inputA} onChange={(event) => setInputA(event.target.value)} rows={3} placeholder="Nhập nội dung cần băm..." className="w-full resize-y rounded-xl border border-slate-800 bg-[#0b0f19] px-4 py-3 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10" />
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-slate-800 pt-4"><div className="min-w-0"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">SHA-256 digest · 64 HEX CHARACTERS</span><code className="break-all font-mono text-xs leading-6 text-emerald-200">{hashA}</code></div><button type="button" onClick={copyHash} aria-label="Sao chép SHA-256 hash" title="Sao chép hash" className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-200">{copied ? <Check size={15} /> : <Copy size={15} />}</button></div>
      </section>

      <section className="grid gap-3 md:grid-cols-2" aria-label="Bốn tính chất SHA-256">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <header className="mb-3 flex items-center gap-2"><Fingerprint size={15} className="text-emerald-300" /><h3 className="text-xs font-semibold text-slate-100">01 · Deterministic</h3><span className="ml-auto font-mono text-[8px] uppercase text-slate-600">Tính xác định</span></header>
          <p className="mb-3 text-[10px] leading-5 text-slate-400">Cùng một input luôn tạo ra cùng một hash cố định.</p>
          <div className="rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-3"><span className="mb-2 block font-mono text-[8px] uppercase text-slate-600">Cùng input · băm hai lần</span><div className="grid gap-2 sm:grid-cols-2"><div className="min-w-0"><span className="block font-mono text-[8px] text-slate-600">RUN 1</span><code className="mt-1 block break-all font-mono text-[9px] leading-4 text-emerald-200">{hashA}</code></div><div className="min-w-0"><span className="block font-mono text-[8px] text-slate-600">RUN 2</span><code className="mt-1 block break-all font-mono text-[9px] leading-4 text-emerald-200">{hashA}</code></div></div><span className="mt-2 inline-flex items-center gap-1.5 text-[9px] text-emerald-300"><Check size={11} />Digest giống hệt khi dữ liệu trùng nhau</span></div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <header className="mb-3 flex items-center gap-2"><Zap size={15} className="text-amber-300" /><h3 className="text-xs font-semibold text-slate-100">02 · Avalanche effect</h3><span className="ml-auto font-mono text-[8px] uppercase text-slate-600">Hiệu ứng tuyết rơi</span></header>
          <div className="grid gap-2 sm:grid-cols-2"><label className="block min-w-0"><span className="mb-1 block font-mono text-[8px] uppercase text-slate-600">Input A</span><textarea value={inputA} onChange={(event) => setInputA(event.target.value)} rows={2} className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/70 px-2.5 py-2 text-[10px] leading-4 text-slate-300 outline-none focus:border-amber-300/40" /></label><label className="block min-w-0"><span className="mb-1 block font-mono text-[8px] uppercase text-slate-600">Input B</span><textarea value={inputB} onChange={(event) => setInputB(event.target.value)} rows={2} className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/70 px-2.5 py-2 text-[10px] leading-4 text-slate-300 outline-none focus:border-amber-300/40" /></label></div>
          <div className="mt-3 grid gap-2"><div className="min-w-0 rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-2.5"><span className="mb-1 block font-mono text-[8px] text-slate-600">HASH A</span><DiffHash value={hashA} compareTo={hashB} /></div><div className="min-w-0 rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-2.5"><span className="mb-1 block font-mono text-[8px] text-slate-600">HASH B</span><DiffHash value={hashB} compareTo={hashA} /></div></div>
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[9px] text-slate-500">Số bit khác biệt <strong className="font-mono text-slate-300">{changedBits}/256</strong></span><strong className={`font-mono text-xs ${Number(changedPercent) >= 50 ? 'text-emerald-300' : 'text-amber-200'}`}>{changedPercent}%</strong></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-[width] duration-300" style={{ width: `${changedPercent}%` }} /></div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <header className="mb-3 flex items-center gap-2"><LockKeyhole size={15} className="text-sky-300" /><h3 className="text-xs font-semibold text-slate-100">03 · Pre-image resistance</h3><span className="ml-auto font-mono text-[8px] uppercase text-slate-600">Kháng tiền ảnh</span></header>
          <p className="text-[10px] leading-5 text-slate-400">SHA-256 không mã hóa input. Từ digest không có phép toán ngược thực tế để khôi phục nội dung gốc.</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-3"><div><span className="block font-mono text-[8px] uppercase text-slate-600">Không gian digest</span><strong className="mt-1 block font-mono text-sm text-sky-200">2<sup>256</sup> khả năng</strong></div><button type="button" onClick={() => setShowPreimageNotice((visible) => !visible)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-300/20 bg-sky-300/[0.06] px-3 text-[9px] font-semibold text-sky-100 transition hover:border-sky-300/40">{showPreimageNotice ? <RotateCcw size={12} /> : <Sparkles size={12} />}{showPreimageNotice ? 'Ẩn thông báo' : 'Thử giải ngược hash'}</button></div>
          {showPreimageNotice && <p role="status" className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-[10px] leading-5 text-amber-100/80">Không thể giải mã ngược SHA-256. Thử vét cạn có không gian tìm kiếm tới 2<sup>256</sup> digest; không khả thi với năng lực tính toán hiện nay.</p>}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <header className="mb-3 flex items-center gap-2"><Sigma size={15} className="text-emerald-300" /><h3 className="text-xs font-semibold text-slate-100">04 · Fixed-length output</h3><span className="ml-auto font-mono text-[8px] uppercase text-slate-600">Độ dài cố định</span></header>
          <p className="mb-4 text-[10px] leading-5 text-slate-400">Input dài bất kỳ, đầu ra luôn có kích thước như nhau.</p>
          <div className="flex items-center gap-4 rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-3"><div><strong className="font-mono text-2xl text-emerald-200">256</strong><span className="ml-1 font-mono text-[8px] text-slate-500">BITS</span></div><span className="h-8 w-px bg-slate-800" /><div><strong className="font-mono text-2xl text-sky-200">64</strong><span className="ml-1 font-mono text-[8px] text-slate-500">HEX CHARS</span></div><GitBranch size={17} className="ml-auto text-slate-600" /></div>
          <div className="mt-3 flex items-center justify-between font-mono text-[8px] text-slate-600"><span>INPUT SIZE</span><span>{byteLength} BYTES <span className="px-1">→</span> 64 HEX CHARACTERS</span></div>
        </article>
      </section>
      <p className="px-1 text-[9px] leading-5 text-slate-600">SHA-256 là hàm băm mật mã một chiều, không phải thuật toán mã hóa; mọi thao tác ở đây chạy cục bộ trong trình duyệt.</p>
    </div>
  )
}