import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Copy, Eye, EyeOff, Fingerprint, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, ShieldX, WalletCards } from 'lucide-react'
import CryptoJS from 'crypto-js'
import MerkleTree from './MerkleTree'
import { hashTransaction } from '../lib/chain'

type WalletKeyPair = {
  publicKey: CryptoKey
  privateKey: CryptoKey
  publicKeyHex: string
  privateKeyHex: string
  address: string
}

const encoder = new TextEncoder()
const initialTransactions = [
  '0x7A3F → 0x2B8E · 12.50 ETH',
  '0x91C2 → 0x4D10 · 3.25 ETH',
  '0x2B8E → 0xA501 · 8.00 ETH',
  '0x4D10 → 0x7A3F · 1.75 ETH',
]

function sha256(value: string) {
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex)
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBuffer(value: string) {
  const hex = value.trim().replace(/^0x/i, '')
  if (!hex || hex.length % 2 !== 0 || !/^[\dA-F]+$/i.test(hex)) throw new Error('Invalid hexadecimal input')
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  return bytes.buffer
}

async function createWallet(): Promise<WalletKeyPair> {
  const pair = await window.crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const [publicKeyBuffer, privateKeyBuffer] = await Promise.all([
    window.crypto.subtle.exportKey('raw', pair.publicKey),
    window.crypto.subtle.exportKey('pkcs8', pair.privateKey),
  ])
  const publicKeyHex = bufferToHex(publicKeyBuffer)
  return {
    publicKey: pair.publicKey,
    privateKey: pair.privateKey,
    publicKeyHex,
    privateKeyHex: bufferToHex(privateKeyBuffer),
    address: `0x${sha256(publicKeyHex).slice(-40)}`,
  }
}

function MerkleGraph({ transactions, onTransactionChange }: { transactions: string[]; onTransactionChange: (index: number, value: string) => void }) {
  const parsed = useMemo(() => transactions.map((tx) => {
    const [from = '', remainder = ''] = tx.split(' → ')
    const [to = '', amount = ''] = remainder.split(' · ')
    return { from, to, amount }
  }), [transactions])
  const baselineHashes = useMemo(() => initialTransactions.map((tx) => {
    const [from = '', remainder = ''] = tx.split(' → ')
    const [to = '', amount = ''] = remainder.split(' · ')
    return hashTransaction({ from, to, amount })
  }), [])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  return <MerkleTree transactions={parsed} labels={transactions} baselineHashes={baselineHashes} selectedIndex={selectedIndex} onSelect={(index) => setSelectedIndex(index)} onLabelChange={onTransactionChange} />
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copyValue() {
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }
  return <button type="button" onClick={copyValue} aria-label={`Sao chép ${label}`} title={`Sao chép ${label}`} className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 transition hover:border-emerald-300/40 hover:text-emerald-200">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
}

function KeyValue({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [visible, setVisible] = useState(!secret)
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${secret ? 'border-amber-300/20 bg-amber-300/[0.035]' : 'border-slate-800 bg-[#0b0f19]/65'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-mono text-[9px] uppercase tracking-[0.1em] ${secret ? 'text-amber-200/80' : 'text-slate-500'}`}>{label}</span>
        <div className="flex items-center gap-1">
          {secret && <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Ẩn private key' : 'Hiện private key'} title={visible ? 'Ẩn private key' : 'Hiện private key'} className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:text-slate-200">{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
          <CopyButton value={value} label={label} />
        </div>
      </div>
      <code className={`block break-all font-mono text-[9px] leading-[1.65] ${secret ? 'text-amber-100/80' : label === 'WALLET ADDRESS' ? 'text-emerald-200' : 'text-slate-300'}`}>{secret && !visible ? '•'.repeat(48) : value || '—'}</code>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  const id = `signature-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/10" />
    </label>
  )
}

export default function TabSignatureMerkle() {
  const [wallet, setWallet] = useState<WalletKeyPair | null>(null)
  const [keyLoading, setKeyLoading] = useState(false)
  const [signing, setSigning] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sender, setSender] = useState('')
  const [receiver, setReceiver] = useState('0x2B8E...0D44')
  const [amount, setAmount] = useState('12.50 ETH')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [verifyPublicKey, setVerifyPublicKey] = useState('')
  const [verifySignature, setVerifySignature] = useState('')
  const [verification, setVerification] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [transactions, setTransactions] = useState(initialTransactions)
  const payload = hashTransaction({ from: sender, to: receiver, amount })

  async function handleCreateWallet() {
    setKeyLoading(true)
    setError('')
    try {
      const nextWallet = await createWallet()
      setWallet(nextWallet)
      setSender(nextWallet.address)
      setVerifyPublicKey(nextWallet.publicKeyHex)
      setVerifySignature('')
      setVerifyMessage('')
      setVerification(null)
    } catch {
      setError('Không thể tạo khóa. Hãy mở ứng dụng trên localhost hoặc trình duyệt hỗ trợ Web Crypto.')
    } finally {
      setKeyLoading(false)
    }
  }

  async function handleSignTransaction() {
    setError('')
    setVerification(null)
    if (!wallet) return setError('Hãy tạo ví trước khi ký giao dịch.')
    if (!sender.trim() || !receiver.trim() || !amount.trim()) return setError('Vui lòng nhập ví gửi, ví nhận và số tiền.')
    if (sender.trim().toLowerCase() !== wallet.address.toLowerCase()) return setError('Ví gửi phải khớp với địa chỉ của key pair đang dùng để ký.')

    setSigning(true)
    try {
      const signature = await window.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, wallet.privateKey, encoder.encode(payload))
      setVerifyMessage(payload)
      setVerifyPublicKey(wallet.publicKeyHex)
      setVerifySignature(bufferToHex(signature))
    } catch {
      setError('Ký giao dịch thất bại. Hãy tạo key pair mới và thử lại.')
    } finally {
      setSigning(false)
    }
  }

  async function handleVerifySignature() {
    setError('')
    setVerification(null)
    if (!verifyMessage.trim() || !verifyPublicKey.trim() || !verifySignature.trim()) {
      setVerification(false)
      setError('Cần nhập đủ Message, Public Key và Digital Signature để xác thực.')
      return
    }

    setVerifying(true)
    try {
      const publicKey = await window.crypto.subtle.importKey('raw', hexToBuffer(verifyPublicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
      const valid = await window.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, hexToBuffer(verifySignature), encoder.encode(verifyMessage))
      setVerification(valid)
    } catch {
      setVerification(false)
    } finally {
      setVerifying(false)
    }
  }

  function updateVerification(setter: (value: string) => void, value: string) {
    setter(value)
    setVerification(null)
    setError('')
  }

  function updateTransaction(index: number, value: string) {
    setTransactions((current) => current.map((transaction, transactionIndex) => transactionIndex === index ? value : transaction))
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <header className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-300"><WalletCards size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">Wallet keypair</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">ECDSA · P-256</p></div></div>
            <button type="button" onClick={handleCreateWallet} disabled={keyLoading} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 text-[10px] font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/[0.13] disabled:cursor-wait disabled:opacity-70">{keyLoading ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={13} />}{keyLoading ? 'Generating...' : wallet ? 'Regenerate keys' : 'Generate wallet'}</button>
          </header>
          {wallet ? <div className="space-y-2.5"><KeyValue label="PRIVATE KEY · PKCS#8 HEX" value={wallet.privateKeyHex} secret /><KeyValue label="PUBLIC KEY · P-256 RAW" value={wallet.publicKeyHex} /><KeyValue label="WALLET ADDRESS" value={wallet.address} /></div> : <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0b0f19]/45 px-5 text-center"><span className="grid size-12 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-500"><KeyRound size={21} /></span><strong className="mt-4 text-xs font-semibold text-slate-300">Chưa có ví trong phiên này</strong><p className="mt-1.5 max-w-xs text-[10px] leading-5 text-slate-500">Sinh key pair để tạo địa chỉ và ký payload giao dịch ngay trong trình duyệt.</p></div>}
          <p className="mt-4 flex items-start gap-2 text-[9px] leading-4 text-amber-200/70"><LockKeyhole size={12} className="mt-0.5 shrink-0" />Private key demo chỉ lưu trong state trình duyệt. Không dùng khóa này cho tài sản thật.</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <header className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[0.07] text-sky-300"><Fingerprint size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">Sign transaction</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">SENDER + RECEIVER + AMOUNT → ECDSA SIGNATURE</p></div></header>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Ví gửi · Sender" value={sender} onChange={(value) => { setSender(value); setVerification(null) }} placeholder="Generate wallet trước" />
            <InputField label="Ví nhận · Receiver" value={receiver} onChange={(value) => { setReceiver(value); setVerification(null) }} placeholder="0x..." />
            <InputField label="Số tiền · Amount" value={amount} onChange={(value) => { setAmount(value); setVerification(null) }} placeholder="12.50 ETH" />
            <div className="flex items-end"><span className="mb-2 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500"><ShieldCheck size={12} className="text-emerald-300" />Payload ký bằng SHA-256</span></div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-[#0b0f19]/70 p-3"><span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">Canonical transaction SHA-256 · signed payload</span><code className="block break-all font-mono text-[10px] leading-5 text-slate-300">{payload}</code></div>
          <button type="button" onClick={handleSignTransaction} disabled={!wallet || signing} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-300/25 bg-sky-300/[0.1] px-4 py-2.5 text-xs font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/[0.15] disabled:cursor-not-allowed disabled:opacity-45">{signing ? <RefreshCw size={14} className="animate-spin" /> : <Fingerprint size={14} />}{signing ? 'Đang ký giao dịch...' : 'Ký giao dịch'}</button>
          {verifySignature && <div className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.035] p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-sky-200/80">Digital Signature · Hex</span><CopyButton value={verifySignature} label="digital signature" /></div><code className="block max-h-20 overflow-auto break-all font-mono text-[9px] leading-4 text-slate-300">{verifySignature}</code></div>}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <header className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.07] text-amber-200"><ShieldCheck size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">Signature verification</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">VERIFY SIGNER IDENTITY & MESSAGE INTEGRITY</p></div></header>
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-slate-800 bg-[#0b0f19]/55 p-3 text-[10px] leading-5 text-slate-400"><ArrowRight size={13} className="mt-0.5 shrink-0 text-sky-300" />Người ký gửi <strong className="text-slate-300">Message + Signature + Public Key</strong> cho người nhận. Người nhận dùng public key để kiểm tra chữ ký và tính toàn vẹn; public key có thể chia sẻ công khai. Chữ ký số không mã hóa nội dung.</p>
        <div className="grid gap-3 xl:grid-cols-3">
          <label htmlFor="verify-message" className="block min-w-0"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Message</span><textarea id="verify-message" value={verifyMessage} onChange={(event) => updateVerification(setVerifyMessage, event.target.value)} rows={4} placeholder="Nội dung đã ký..." className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-3 py-2.5 font-mono text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/10" /></label>
          <label htmlFor="verify-public-key" className="block min-w-0"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Public Key · raw hex</span><textarea id="verify-public-key" value={verifyPublicKey} onChange={(event) => updateVerification(setVerifyPublicKey, event.target.value)} rows={4} placeholder="04..." className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-3 py-2.5 font-mono text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/10" /></label>
          <label htmlFor="verify-signature" className="block min-w-0"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Digital Signature · hex</span><textarea id="verify-signature" value={verifySignature} onChange={(event) => updateVerification(setVerifySignature, event.target.value)} rows={4} placeholder="r || s signature hex..." className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-3 py-2.5 font-mono text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/10" /></label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={handleVerifySignature} disabled={verifying} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.09] px-5 py-2.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/[0.14] disabled:cursor-wait disabled:opacity-65">{verifying ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}{verifying ? 'Đang xác thực...' : 'Verify signature'}</button>
          {verification !== null && <div role="status" className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${verification ? 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200' : 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200'}`}>{verification ? <Check size={14} /> : <ShieldX size={14} />}{verification ? 'Giao dịch chính chủ & Nguyên vẹn' : 'Cảnh báo: Dữ liệu bị can thiệp hoặc Sai Key'}</div>}
        </div>
        {error && <p role="alert" className="mt-3 flex items-center gap-2 text-[10px] text-rose-300"><AlertTriangle size={13} />{error}</p>}
      </section>

      <MerkleGraph transactions={transactions} onTransactionChange={updateTransaction} />
      <p className="flex items-start gap-2 px-1 text-[9px] leading-5 text-slate-600"><ArrowRight size={12} className="mt-0.5 shrink-0 text-rose-300" />Sửa Tx₁–Tx₄ để tính lại leaf hash, parent hash và Merkle Root theo thời gian thực. Nhánh bị ảnh hưởng sẽ chuyển đỏ.</p>
    </div>
  )
}