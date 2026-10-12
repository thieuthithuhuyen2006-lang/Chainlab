import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Copy, Eye, EyeOff, Fingerprint, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, ShieldX, WalletCards } from 'lucide-react'
import CryptoJS from 'crypto-js'
import MerkleTree from './MerkleTree'
import { hashTransaction, merkleTree, verifyMerkleProof, type MerkleProofNode } from '../lib/chain'
import { useBi, useLanguage } from '../lib/useLanguage'
import RealityCheck from './RealityCheck'
import LearningGoals from './LearningGoals'

type WalletKeyPair = {
  publicKey: CryptoKey
  privateKey: CryptoKey
  publicKeyHex: string
  privateKeyHex: string
  address: string
}

const encoder = new TextEncoder()
type Status = { vi: string; en: string }
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

function transactionDigest(value: string) {
  const [from = '', remainder = ''] = value.split(' → ')
  const [to = '', amount = ''] = remainder.split(' · ')
  return hashTransaction({ from, to, amount })
}

function MerkleGraph({ transactions, onTransactionChange }: { transactions: string[]; onTransactionChange: (index: number, value: string) => void }) {
  const b = useBi()
  const txHashes = useMemo(() => transactions.map(transactionDigest), [transactions])
  const baselineHashes = useMemo(() => initialTransactions.map(transactionDigest), [])
  const tree = useMemo(() => merkleTree(txHashes), [txHashes])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [proofCheck, setProofCheck] = useState<{ leafIndex: number; leaf: string; proof: MerkleProofNode[]; root: string; valid: boolean } | null>(null)

  function selectLeaf(index: number) {
    setSelectedIndex(index)
    setProofCheck(null)
  }

  function verifySelectedLeaf() {
    if (selectedIndex === null || !txHashes[selectedIndex]) return
    const proof = tree.proofs[selectedIndex]
    setProofCheck({ leafIndex: selectedIndex, leaf: txHashes[selectedIndex], proof, root: tree.root, valid: verifyMerkleProof(txHashes[selectedIndex], proof, tree.root) })
  }

  return <div className="space-y-3">
    <MerkleTree txHashes={txHashes} labels={transactions} baselineHashes={baselineHashes} selectedIndex={selectedIndex} onSelect={selectLeaf} onLabelChange={onTransactionChange} />
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3" aria-label={b('Xác minh bằng Merkle proof', 'Verify with a Merkle proof')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" />{b('Xác minh bằng Merkle proof', 'Verify with a Merkle proof')}</h3><p className="mt-1 text-xs text-slate-400">{selectedIndex === null ? b('Chọn một lá (Tx) trên cây Merkle để chạy chứng minh.', 'Select a leaf (Tx) in the Merkle tree to run the proof.') : b(`Lá đã chọn: Tx ${selectedIndex + 1} · ${tree.proofs[selectedIndex]?.length ?? 0} bước proof.`, `Selected leaf: Tx ${selectedIndex + 1} · ${tree.proofs[selectedIndex]?.length ?? 0} proof steps.`)}</p></div>
        <button type="button" onClick={verifySelectedLeaf} disabled={selectedIndex === null} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.09] px-3 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/[0.15] disabled:cursor-not-allowed disabled:opacity-45"><ShieldCheck size={14} />{b('Xác minh bằng Merkle proof', 'Verify with a Merkle proof')}</button>
      </div>
      {proofCheck && <div className="mt-3 space-y-2">
        <div className="rounded-md border border-slate-700 bg-slate-950/60 p-2.5">
          <p className="text-xs text-slate-300">Leaf (Tx {proofCheck.leafIndex + 1}): <code className="break-all font-mono text-sky-200">{proofCheck.leaf}</code></p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{proofCheck.proof.map((node, stepIndex) => <span key={stepIndex} className={`rounded border border-slate-700 px-2 py-1 font-mono text-xs ${node.side === 'left' ? 'text-fuchsia-200' : 'text-cyan-200'}`}>{node.side === 'left' ? '←' : '→'} {node.hash.slice(0, 12)}…</span>)}</div>
          <p className="mt-1.5 text-xs text-slate-300">{b('Root so khớp', 'Root to match')}: <code className="break-all font-mono text-emerald-200">{proofCheck.root}</code></p>
        </div>
        <div role="status" className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${proofCheck.valid ? 'bg-emerald-300/[0.08] text-emerald-200' : 'bg-rose-400/[0.08] text-rose-200'}`}>{proofCheck.valid ? <Check size={14} /> : <ShieldX size={14} />}{proofCheck.valid ? b('Chứng minh HỢP LỆ — đi từ leaf tái tạo đúng root', 'Proof VALID — walking up from the leaf rebuilds the root') : b('Chứng minh KHÔNG HỢP LỆ — leaf/proof/root không khớp', 'Proof INVALID — leaf/proof/root do not match')}</div>
      </div>}
    </section>
  </div>
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const b = useBi()
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
  return <button type="button" onClick={copyValue} aria-label={b(`Sao chép ${label}`, `Copy ${label}`)} title={b(`Sao chép ${label}`, `Copy ${label}`)} className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 transition hover:border-emerald-300/40 hover:text-emerald-200">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
}

function KeyValue({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const b = useBi()
  const [visible, setVisible] = useState(!secret)
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${secret ? 'border-amber-300/20 bg-amber-300/[0.035]' : 'border-slate-800 bg-[#0b0f19]/65'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-mono text-[9px] uppercase tracking-[0.1em] ${secret ? 'text-amber-200/80' : 'text-slate-500'}`}>{label}</span>
        <div className="flex items-center gap-1">
          {secret && <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? b('Ẩn private key', 'Hide private key') : b('Hiện private key', 'Show private key')} title={visible ? b('Ẩn private key', 'Hide private key') : b('Hiện private key', 'Show private key')} className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:text-slate-200">{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
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
  const language = useLanguage()
  const b = useBi()
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
  const [error, setError] = useState<Status | null>(null)
  const [transactions, setTransactions] = useState(initialTransactions)
  const payload = hashTransaction({ from: sender, to: receiver, amount })

  async function handleCreateWallet() {
    setKeyLoading(true)
    setError(null)
    try {
      const nextWallet = await createWallet()
      setWallet(nextWallet)
      setSender(nextWallet.address)
      setVerifyPublicKey(nextWallet.publicKeyHex)
      setVerifySignature('')
      setVerifyMessage('')
      setVerification(null)
    } catch {
      setError({ vi: 'Không thể tạo khóa. Hãy mở ứng dụng trên localhost hoặc trình duyệt hỗ trợ Web Crypto.', en: 'Could not create keys. Open the app on localhost or a browser with Web Crypto support.' })
    } finally {
      setKeyLoading(false)
    }
  }

  async function handleSignTransaction() {
    setError(null)
    setVerification(null)
    if (!wallet) return setError({ vi: 'Hãy tạo ví trước khi ký giao dịch.', en: 'Create a wallet before signing a transaction.' })
    if (!sender.trim() || !receiver.trim() || !amount.trim()) return setError({ vi: 'Vui lòng nhập ví gửi, ví nhận và số tiền.', en: 'Please enter sender, receiver and amount.' })
    if (sender.trim().toLowerCase() !== wallet.address.toLowerCase()) return setError({ vi: 'Ví gửi phải khớp với địa chỉ của key pair đang dùng để ký.', en: 'The sender must match the address of the key pair used to sign.' })

    setSigning(true)
    try {
      const signature = await window.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, wallet.privateKey, encoder.encode(payload))
      setVerifyMessage(payload)
      setVerifyPublicKey(wallet.publicKeyHex)
      setVerifySignature(bufferToHex(signature))
    } catch {
      setError({ vi: 'Ký giao dịch thất bại. Hãy tạo key pair mới và thử lại.', en: 'Signing failed. Generate a new key pair and try again.' })
    } finally {
      setSigning(false)
    }
  }

  async function handleVerifySignature() {
    setError(null)
    setVerification(null)
    if (!verifyMessage.trim() || !verifyPublicKey.trim() || !verifySignature.trim()) {
      setVerification(false)
      setError({ vi: 'Cần nhập đủ Message, Public Key và Digital Signature để xác thực.', en: 'Message, Public Key and Digital Signature are all required to verify.' })
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
    setError(null)
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
          {wallet ? <div className="space-y-2.5"><KeyValue label="PRIVATE KEY · PKCS#8 HEX" value={wallet.privateKeyHex} secret /><KeyValue label="PUBLIC KEY · P-256 RAW" value={wallet.publicKeyHex} /><KeyValue label="WALLET ADDRESS" value={wallet.address} /></div> : <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0b0f19]/45 px-5 text-center"><span className="grid size-12 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-500"><KeyRound size={21} /></span><strong className="mt-4 text-xs font-semibold text-slate-300">{b('Chưa có ví trong phiên này', 'No wallet in this session')}</strong><p className="mt-1.5 max-w-xs text-[10px] leading-5 text-slate-500">{b('Sinh key pair để tạo địa chỉ và ký payload giao dịch ngay trong trình duyệt.', 'Generate a key pair to create an address and sign the transaction payload right in the browser.')}</p></div>}
          <p className="mt-4 flex items-start gap-2 text-[9px] leading-4 text-amber-200/70"><LockKeyhole size={12} className="mt-0.5 shrink-0" />{b('Private key demo chỉ lưu trong state trình duyệt. Không dùng khóa này cho tài sản thật.', 'The demo private key lives only in browser state. Do not use it for real assets.')}</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <header className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[0.07] text-sky-300"><Fingerprint size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">Sign transaction</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">SENDER + RECEIVER + AMOUNT → ECDSA SIGNATURE</p></div></header>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label={b('Ví gửi', 'Sender')} value={sender} onChange={(value) => { setSender(value); setVerification(null) }} placeholder={b('Generate wallet trước', 'Generate a wallet first')} />
            <InputField label={b('Ví nhận', 'Receiver')} value={receiver} onChange={(value) => { setReceiver(value); setVerification(null) }} placeholder="0x..." />
            <InputField label={b('Số tiền', 'Amount')} value={amount} onChange={(value) => { setAmount(value); setVerification(null) }} placeholder="12.50 ETH" />
            <div className="flex items-end"><span className="mb-2 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500"><ShieldCheck size={12} className="text-emerald-300" />{b('Payload ký bằng SHA-256', 'SHA-256 signed payload')}</span></div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-[#0b0f19]/70 p-3"><span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">Canonical transaction SHA-256 · signed payload</span><code className="block break-all font-mono text-[10px] leading-5 text-slate-300">{payload}</code></div>
          <button type="button" onClick={handleSignTransaction} disabled={!wallet || signing} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-300/25 bg-sky-300/[0.1] px-4 py-2.5 text-xs font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/[0.15] disabled:cursor-not-allowed disabled:opacity-45">{signing ? <RefreshCw size={14} className="animate-spin" /> : <Fingerprint size={14} />}{signing ? b('Đang ký giao dịch...', 'Signing transaction...') : b('Ký giao dịch', 'Sign transaction')}</button>
          {verifySignature && <div className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.035] p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-sky-200/80">Digital Signature · Hex</span><CopyButton value={verifySignature} label="digital signature" /></div><code className="block max-h-20 overflow-auto break-all font-mono text-[9px] leading-4 text-slate-300">{verifySignature}</code></div>}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <header className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.07] text-amber-200"><ShieldCheck size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">Signature verification</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">VERIFY SIGNER IDENTITY & MESSAGE INTEGRITY</p></div></header>
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-slate-800 bg-[#0b0f19]/55 p-3 text-[10px] leading-5 text-slate-400"><ArrowRight size={13} className="mt-0.5 shrink-0 text-sky-300" />{b('Người ký gửi', 'The sender sends')} <strong className="text-slate-300">Message + Signature + Public Key</strong> {b('cho người nhận. Người nhận dùng public key để kiểm tra chữ ký và tính toàn vẹn; public key có thể chia sẻ công khai. Chữ ký số không mã hóa nội dung.', 'to the receiver. The receiver uses the public key to check the signature and integrity; the public key can be shared openly. A digital signature does not encrypt the content.')}</p>
        <div className="grid gap-3 xl:grid-cols-3">
          <label htmlFor="verify-message" className="block min-w-0"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Message</span><textarea id="verify-message" value={verifyMessage} onChange={(event) => updateVerification(setVerifyMessage, event.target.value)} rows={4} placeholder={b('Nội dung đã ký...', 'Signed content...')} className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-3 py-2.5 font-mono text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/10" /></label>
          <label htmlFor="verify-public-key" className="block min-w-0"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Public Key · raw hex</span><textarea id="verify-public-key" value={verifyPublicKey} onChange={(event) => updateVerification(setVerifyPublicKey, event.target.value)} rows={4} placeholder="04..." className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-3 py-2.5 font-mono text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/10" /></label>
          <label htmlFor="verify-signature" className="block min-w-0"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Digital Signature · hex</span><textarea id="verify-signature" value={verifySignature} onChange={(event) => updateVerification(setVerifySignature, event.target.value)} rows={4} placeholder="r || s signature hex..." className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19]/80 px-3 py-2.5 font-mono text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/10" /></label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={handleVerifySignature} disabled={verifying} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.09] px-5 py-2.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/[0.14] disabled:cursor-wait disabled:opacity-65">{verifying ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}{verifying ? b('Đang xác thực...', 'Verifying...') : 'Verify signature'}</button>
          {verification !== null && <div role="status" className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${verification ? 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200' : 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200'}`}>{verification ? <Check size={14} /> : <ShieldX size={14} />}{verification ? b('Giao dịch chính chủ & nguyên vẹn', 'Authentic signature & intact data') : b('Cảnh báo: dữ liệu bị can thiệp hoặc sai key', 'Warning: data was tampered with or the key is wrong')}</div>}
        </div>
        {error && <p role="alert" className="mt-3 flex items-center gap-2 text-[10px] text-rose-300"><AlertTriangle size={13} />{language === 'VN' ? error.vi : error.en}</p>}
      </section>

      <MerkleGraph transactions={transactions} onTransactionChange={updateTransaction} />
      <p className="flex items-start gap-2 px-1 text-[9px] leading-5 text-slate-600"><ArrowRight size={12} className="mt-0.5 shrink-0 text-rose-300" />{b('Sửa Tx₁–Tx₄ để tính lại leaf hash, parent hash và Merkle Root theo thời gian thực. Nhánh bị ảnh hưởng sẽ chuyển đỏ.', 'Edit Tx₁–Tx₄ to recompute the leaf hash, parent hashes and Merkle root in real time. The affected branch turns red.')}</p>
      <RealityCheck />
      <LearningGoals />
    </div>
  )
}