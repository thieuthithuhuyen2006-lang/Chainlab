import { useMemo, useState } from 'react'
import { Check, Copy, Fingerprint, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, ShieldX, TreePine } from 'lucide-react'
import { makeMerkleTree, sha256 } from '../lib/crypto.js'

const initialTransactions = [
  '0x7A3F → 0x2B8E · 12.50 CHAIN',
  '0x91C2 → 0x4D10 · 3.25 CHAIN',
  '0x2B8E → 0xA501 · 8.00 CHAIN',
  '0x4D10 → 0x7A3F · 1.75 CHAIN',
]
const encoder = new TextEncoder()
const toBase64Url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
const fromBase64Url = (value) => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)), (char) => char.charCodeAt(0))

async function generateEcdsaPair() {
  const pair = await window.crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const [publicKey, privateKey] = await Promise.all([window.crypto.subtle.exportKey('raw', pair.publicKey), window.crypto.subtle.exportKey('pkcs8', pair.privateKey)])
  const publicEncoded = toBase64Url(publicKey)
  return { publicKey: publicEncoded, privateKey: toBase64Url(privateKey), address: `0x${sha256(publicEncoded).slice(0, 40)}` }
}

async function signMessage(privateKey, message) {
  const key = await window.crypto.subtle.importKey('pkcs8', fromBase64Url(privateKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  return toBase64Url(await window.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(message)))
}

async function verifyMessage(publicKey, message, signature) {
  const key = await window.crypto.subtle.importKey('raw', fromBase64Url(publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  return window.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromBase64Url(signature), encoder.encode(message))
}

function makeMessage(sender, receiver, amount) {
  return `${sender.trim()}|${receiver.trim()}|${amount.trim()}`
}

function MerkleDiagram({ levels, selected, setSelected }) {
  const visibleLevels = [...levels].reverse()
  return <div className="merkle-diagram">{visibleLevels.map((level, levelIndex) => {
    const originalLevel = levels.length - levelIndex - 1
    return <div className={`merkle-level level-${originalLevel}`} key={originalLevel}>{level.map((hash, nodeIndex) => {
      const nodeId = `${originalLevel}-${nodeIndex}`
      const isLeaf = originalLevel === 0
      const label = isLeaf ? `TX ${nodeIndex + 1}` : originalLevel === levels.length - 1 ? 'ROOT' : `NODE ${nodeIndex + 1}`
      return <button key={nodeId} className={`merkle-node ${isLeaf ? 'leaf-node' : 'parent-node'} ${selected === nodeId ? 'node-selected' : ''}`} onClick={() => setSelected(nodeId)}><span>{label}</span><code>{hash.slice(0, 12)}…</code></button>
    })}</div>
  })}</div>
}

export default function CryptoTab() {
  const [keyPair, setKeyPair] = useState(null)
  const [keyLoading, setKeyLoading] = useState(false)
  const [sender, setSender] = useState('0x7A3F...91C2')
  const [receiver, setReceiver] = useState('0x2B8E...0D44')
  const [amount, setAmount] = useState('12.50 CHAIN')
  const [signature, setSignature] = useState('')
  const [verification, setVerification] = useState(null)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [selectedNode, setSelectedNode] = useState('2-0')
  const [error, setError] = useState('')
  const message = makeMessage(sender, receiver, amount)
  const levels = useMemo(() => makeMerkleTree(transactions), [transactions])
  const [level, node] = selectedNode.split('-').map(Number)
  const selectedHash = levels[level]?.[node]

  async function createKeys() {
    setKeyLoading(true)
    setError('')
    try { setKeyPair(await generateEcdsaPair()); setSignature(''); setVerification(null) }
    catch { setError('Không thể tạo key trong trình duyệt này. Hãy mở qua localhost hoặc trình duyệt hiện đại.') }
    finally { setKeyLoading(false) }
  }

  async function createSignature() {
    if (!keyPair) return setError('Hãy tạo key pair trước khi ký giao dịch.')
    if (!sender.trim() || !receiver.trim() || !amount.trim()) return setError('Vui lòng điền đủ sender, receiver và amount.')
    try { setSignature(await signMessage(keyPair.privateKey, message)); setVerification(null); setError('') }
    catch { setError('Ký thất bại. Private key không hợp lệ.') }
  }

  async function verifySignature() {
    if (!keyPair || !signature) return setError('Cần có key pair và chữ ký trước khi xác minh.')
    try { setVerification(await verifyMessage(keyPair.publicKey, message, signature)); setError('') }
    catch { setVerification(false); setError('Public key hoặc chữ ký không đúng định dạng.') }
  }

  function updateTransaction(index, value) {
    setTransactions((current) => current.map((transaction, transactionIndex) => transactionIndex === index ? value : transaction))
  }

  return <div className="view-stack">
    <div className="module-title-row"><div><div className="section-kicker">03 / KEYS · SIGNATURES · PROOFS</div><h2>Cryptography <span>&amp; Merkle tree</span></h2><p>Danh tính mật mã, chữ ký số và bằng chứng toàn vẹn dữ liệu.</p></div><div className="algorithm-tag"><span className="tag-dot" /> ECDSA P-256 <span className="tag-divider" /> SHA-256</div></div>

    <div className="crypto-layout"><section className="surface-panel key-panel"><div className="panel-heading"><div className="panel-title-icon"><KeyRound size={16} /></div><div><h3>Wallet keypair</h3><span>PUBLIC IDENTITY / PRIVATE AUTHORITY</span></div></div><div className="key-status-row"><span>ALGORITHM</span><strong>ELLIPTIC CURVE · P-256</strong><span className={`key-status ${keyPair ? '' : 'status-empty'}`}><i />{keyPair ? 'KEY GENERATED' : 'NO KEY PAIR'}</span></div>{keyPair ? <div className="key-fields"><div className="key-field"><span>PUBLIC KEY <small>· CHIA SẺ ĐƯỢC</small></span><code>{keyPair.publicKey}</code></div><div className="key-field private-key-field"><span>PRIVATE KEY <small>· GIỮ BÍ MẬT</small></span><code>{keyPair.privateKey}</code></div><div className="key-field address-field"><span>WALLET ADDRESS</span><code>{keyPair.address}</code></div></div> : <div className="empty-key"><Fingerprint size={30} /><span>Chưa có danh tính trên mạng này.</span></div>}<button className="secondary-button full-button" onClick={createKeys} disabled={keyLoading}>{keyLoading ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}{keyLoading ? 'GENERATING…' : keyPair ? 'TẠO KEY PAIR MỚI' : 'GENERATE KEY PAIR'}</button></section>

    <section className="surface-panel transaction-panel"><div className="panel-heading"><div className="panel-title-icon"><LockKeyhole size={16} /></div><div><h3>Sign a transaction</h3><span>SENDER + RECEIVER + AMOUNT → SIGNATURE</span></div></div><div className="transaction-fields"><label>FROM / SENDER<input className="text-input" value={sender} onChange={(event) => { setSender(event.target.value); setVerification(null) }} /></label><label>TO / RECEIVER<input className="text-input" value={receiver} onChange={(event) => { setReceiver(event.target.value); setVerification(null) }} /></label><label>AMOUNT<input className="text-input" value={amount} onChange={(event) => { setAmount(event.target.value); setVerification(null) }} /></label></div><div className="message-preview"><span>MESSAGE PAYLOAD</span><code>{message}</code></div><button className="primary-button sign-button" onClick={createSignature}><Fingerprint size={15} /> SIGN WITH PRIVATE KEY</button>{signature && <div className="signature-result"><div><span>DIGITAL SIGNATURE</span><code>{signature}</code></div><button className="secondary-button verify-button" onClick={verifySignature}><ShieldCheck size={14} /> VERIFY</button></div>}{verification !== null && <div className={`verification-result ${verification ? 'verified' : 'rejected'}`}>{verification ? <Check size={14} /> : <ShieldX size={14} />}{verification ? 'CHỮ KÝ HỢP LỆ · MESSAGE KHÔNG BỊ THAY ĐỔI' : 'TỪ CHỐI · CHỮ KÝ KHÔNG KHỚP MESSAGE'}</div>}{error && <div className="error-note">{error}</div>}</section></div>

    <section className="surface-panel merkle-panel"><div className="panel-heading merkle-heading"><div className="panel-title-icon"><TreePine size={16} /></div><div><h3>Merkle tree explorer</h3><span>4 TRANSACTIONS · SHA-256 · CLICK ĐỂ KIỂM TRA NODE</span></div><div className="merkle-root"><span>MERKLE ROOT</span><code>{levels.at(-1)?.[0]}</code></div></div><div className="merkle-workspace"><div className="transaction-list">{transactions.map((transaction, index) => <label key={index} className="merkle-transaction"><span className="tx-index">TX 0{index + 1}</span><input value={transaction} onChange={(event) => updateTransaction(index, event.target.value)} aria-label={`Giao dịch ${index + 1}`} /><code>{levels[0][index].slice(0, 12)}…</code></label>)}</div><div className="tree-view"><MerkleDiagram levels={levels} selected={selectedNode} setSelected={setSelectedNode} /><div className="selected-proof"><span>SELECTED NODE <b>{selectedNode}</b></span><code>{selectedHash}</code></div></div></div><div className="merkle-footer"><span><i className="legend-leaf" /> TRANSACTION LEAF</span><span><i className="legend-parent" /> PARENT HASH</span><span><i className="legend-root" /> ROOT DIGEST</span><span className="merkle-footnote">Sửa giao dịch để cập nhật toàn bộ nhánh.</span></div></section>
    <div className="educational-note"><span className="note-mark">i</span><span>Private key chỉ được dùng cục bộ để ký. Đừng sử dụng key demo này cho tài sản hoặc mạng thật.</span><span className="note-end">WEB CRYPTO API</span></div>
  </div>
}