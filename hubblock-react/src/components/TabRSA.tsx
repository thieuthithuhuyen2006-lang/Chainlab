import { useState } from 'react'
import { Check, Copy, Eye, EyeOff, FileKey2, Fingerprint, LockKeyhole, RefreshCw, ShieldCheck, ShieldX, UnlockKeyhole } from 'lucide-react'

type EncryptionPair = { publicKey: CryptoKey; privateKey: CryptoKey; publicPem: string; privatePem: string }
type SigningPair = { publicKey: CryptoKey; privateKey: CryptoKey; publicPem: string; privatePem: string }

const exponent = new Uint8Array([1, 0, 1])
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toPem(label: string, buffer: ArrayBuffer) {
  const body = toBase64(buffer).match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`
}

async function generateEncryptionPair(): Promise<EncryptionPair> {
  const keys = await window.crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: exponent, hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])
  const [pub, priv] = await Promise.all([window.crypto.subtle.exportKey('spki', keys.publicKey), window.crypto.subtle.exportKey('pkcs8', keys.privateKey)])
  return { ...keys, publicPem: toPem('PUBLIC KEY', pub), privatePem: toPem('PRIVATE KEY', priv) }
}

async function generateSigningPair(): Promise<SigningPair> {
  const keys = await window.crypto.subtle.generateKey({ name: 'RSA-PSS', modulusLength: 2048, publicExponent: exponent, hash: 'SHA-256' }, true, ['sign', 'verify'])
  const [pub, priv] = await Promise.all([window.crypto.subtle.exportKey('spki', keys.publicKey), window.crypto.subtle.exportKey('pkcs8', keys.privateKey)])
  return { ...keys, publicPem: toPem('PUBLIC KEY', pub), privatePem: toPem('PRIVATE KEY', priv) }
}

function CopyKey({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard?.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1200) } catch { setCopied(false) }
  }
  return <button type="button" onClick={copy} aria-label={`Copy ${label}`} title={`Copy ${label}`} className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 transition hover:border-sky-300/40 hover:text-sky-100">{copied ? <Check size={13} /> : <Copy size={13} />}</button>
}

function KeyPanel({ title, value, secret = false }: { title: string; value: string; secret?: boolean }) {
  const [visible, setVisible] = useState(!secret)
  return <div className={`min-w-0 rounded-xl border p-3 ${secret ? 'border-amber-300/20 bg-amber-300/[0.035]' : 'border-slate-800 bg-[#0b0f19]/60'}`}><div className="mb-2 flex items-center justify-between gap-2"><span className={`font-mono text-[8px] uppercase tracking-[0.1em] ${secret ? 'text-amber-200/70' : 'text-slate-500'}`}>{title}</span><div className="flex items-center gap-1">{secret && <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide private key' : 'Show private key'} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:text-slate-200">{visible ? <EyeOff size={13} /> : <Eye size={13} />}</button>}<CopyKey value={value} label={title} /></div></div><code className="block max-h-20 overflow-auto break-all whitespace-pre-wrap font-mono text-[8px] leading-4 text-slate-300">{secret && !visible ? '•'.repeat(64) : value || '—'}</code></div>
}

export default function TabRSA() {
  const [encryptionPair, setEncryptionPair] = useState<EncryptionPair | null>(null)
  const [signingPair, setSigningPair] = useState<SigningPair | null>(null)
  const [generating, setGenerating] = useState(false)
  const [plainText, setPlainText] = useState('A public key can be shared; keep the private key secret.')
  const [cipherText, setCipherText] = useState('')
  const [decryptedText, setDecryptedText] = useState('')
  const [message, setMessage] = useState('HUB blockchain learning lab transaction #01')
  const [signature, setSignature] = useState('')
  const [validSignature, setValidSignature] = useState<boolean | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function generateKeys() {
    setGenerating(true)
    setError('')
    setStatus('')
    try {
      const [encryptionKeys, signingKeys] = await Promise.all([generateEncryptionPair(), generateSigningPair()])
      setEncryptionPair(encryptionKeys)
      setSigningPair(signingKeys)
      setCipherText('')
      setDecryptedText('')
      setSignature('')
      setValidSignature(null)
    } catch {
      setError('RSA key generation requires a secure browser context such as localhost or HTTPS.')
    } finally {
      setGenerating(false)
    }
  }

  async function encrypt() {
    if (!encryptionPair) return setError('Generate an RSA key pair first.')
    setError('')
    try {
      const encrypted = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, encryptionPair.publicKey, encoder.encode(plainText))
      setCipherText(toBase64(encrypted))
      setDecryptedText('')
      setStatus('Encrypted with the recipient public key; only its matching private key can decrypt.')
    } catch {
      setError('Encryption failed. RSA-OAEP plaintext may exceed the key-size limit.')
    }
  }

  async function decrypt() {
    if (!encryptionPair || !cipherText) return setError('Encrypt a message before decrypting it.')
    setError('')
    try {
      const bytes = Uint8Array.from(atob(cipherText), (character) => character.charCodeAt(0))
      const result = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, encryptionPair.privateKey, bytes)
      setDecryptedText(decoder.decode(result))
      setStatus('Decrypted with the matching private key.')
    } catch {
      setError('Decryption failed. The ciphertext and private key do not match.')
    }
  }

  async function sign() {
    if (!signingPair) return setError('Generate an RSA signing key pair first.')
    setError('')
    setValidSignature(null)
    try {
      const result = await window.crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, signingPair.privateKey, encoder.encode(message))
      setSignature(toHex(result))
      setStatus('Message signed with RSA-PSS · SHA-256.')
    } catch {
      setError('RSA-PSS signing failed.')
    }
  }

  async function verify() {
    if (!signingPair || !signature) return setError('Create a signature before verifying it.')
    setError('')
    try {
      const bytes = new Uint8Array(signature.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [])
      setValidSignature(await window.crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 32 }, signingPair.publicKey, bytes, encoder.encode(message)))
    } catch {
      setValidSignature(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-violet-300/20 bg-violet-300/[0.07] text-violet-200"><FileKey2 size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">RSA cryptography lab</h3><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">RSA-OAEP encryption · RSA-PSS signatures · SHA-256</p></div></div><button type="button" onClick={generateKeys} disabled={generating} className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-300/25 bg-violet-300/[0.08] px-4 text-[10px] font-semibold text-violet-100 disabled:opacity-50">{generating ? <RefreshCw size={13} className="animate-spin" /> : <Fingerprint size={13} />}{generating ? 'Generating 2,048-bit keys...' : encryptionPair ? 'Regenerate RSA keys' : 'Generate RSA key pairs'}</button></section>
      {status && <p role="status" className="rounded-xl border border-sky-300/20 bg-sky-300/[0.04] p-3 text-[9px] leading-4 text-sky-100">{status}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-3 text-[9px] leading-4 text-rose-200">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <header className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg border border-sky-300/20 bg-sky-300/[0.07] text-sky-200"><LockKeyhole size={16} /></span><div><h3 className="text-xs font-semibold text-slate-100">RSA-OAEP · Encrypt & decrypt</h3><p className="mt-1 text-[8px] text-slate-500">Encrypt with recipient public key; decrypt with matching private key.</p></div></header>
          {encryptionPair && <div className="space-y-2"><KeyPanel title="Recipient public key · SPKI PEM" value={encryptionPair.publicPem} /><KeyPanel title="Recipient private key · PKCS#8 PEM" value={encryptionPair.privatePem} secret /></div>}
          <label className="block"><span className="mb-1.5 block font-mono text-[8px] uppercase text-slate-500">Plaintext</span><textarea value={plainText} onChange={(event) => setPlainText(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-2.5 text-[10px] leading-5 text-slate-200 outline-none focus:border-sky-300/40" /></label>
          <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={encrypt} disabled={!encryptionPair} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-sky-300/20 bg-sky-300/[0.06] text-[9px] font-semibold text-sky-100 disabled:opacity-40"><LockKeyhole size={12} />Encrypt with public key</button><button type="button" onClick={decrypt} disabled={!cipherText} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] text-[9px] font-semibold text-emerald-100 disabled:opacity-40"><UnlockKeyhole size={12} />Decrypt with private key</button></div>
          {cipherText && <KeyPanel title="Ciphertext · Base64" value={cipherText} />}{decryptedText && <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.04] p-3 text-[9px] text-emerald-100">Decrypted: {decryptedText}</p>}
        </section>
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <header className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg border border-amber-300/20 bg-amber-300/[0.07] text-amber-100"><ShieldCheck size={16} /></span><div><h3 className="text-xs font-semibold text-slate-100">RSA-PSS · Sign & verify</h3><p className="mt-1 text-[8px] text-slate-500">Private key signs; public key verifies origin and integrity.</p></div></header>
          {signingPair && <div className="space-y-2"><KeyPanel title="Signing public key · SPKI PEM" value={signingPair.publicPem} /><KeyPanel title="Signing private key · PKCS#8 PEM" value={signingPair.privatePem} secret /></div>}
          <label className="block"><span className="mb-1.5 block font-mono text-[8px] uppercase text-slate-500">Message to sign</span><textarea value={message} onChange={(event) => { setMessage(event.target.value); setValidSignature(null) }} rows={3} className="w-full resize-y rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-2.5 text-[10px] leading-5 text-slate-200 outline-none focus:border-amber-300/40" /></label>
          <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={sign} disabled={!signingPair} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] text-[9px] font-semibold text-amber-100 disabled:opacity-40"><Fingerprint size={12} />Sign with private key</button><button type="button" onClick={verify} disabled={!signature} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-sky-300/20 bg-sky-300/[0.06] text-[9px] font-semibold text-sky-100 disabled:opacity-40"><ShieldCheck size={12} />Verify with public key</button></div>
          {signature && <KeyPanel title="RSA-PSS signature · Hex" value={signature} />}{validSignature !== null && <p role="status" className={`flex items-center gap-2 rounded-lg border p-3 text-[9px] font-semibold ${validSignature ? 'border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100' : 'border-rose-300/20 bg-rose-300/[0.05] text-rose-100'}`}>{validSignature ? <Check size={13} /> : <ShieldX size={13} />}{validSignature ? 'Signature valid · signer and message verified' : 'Invalid signature · message changed or wrong key'}</p>}
          <p className="text-[8px] leading-4 text-slate-600">Educational local keys only. OAEP and PSS use separate RSA key pairs and are not interchangeable.</p>
        </section>
      </div>
    </div>
  )
}