import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, Check, Copy, Fingerprint, LockKeyhole, Shuffle, Sigma, Zap } from 'lucide-react'
import { sha256 } from '../lib/crypto.js'

function PropertyCard({ icon: Icon, title, label, children, className = '' }) {
  return <article className={`property-card ${className}`}><div className="property-heading"><span className="property-icon"><Icon size={17} /></span><div><h3>{title}</h3><span>{label}</span></div></div>{children}</article>
}

function HashLine({ value }) {
  return <div className="hash-line">{value.match(/.{1,8}/g)?.map((part, index) => <span key={index}>{part}</span>)}</div>
}

export default function Sha256Tab() {
  const [input, setInput] = useState('Blockchain is built on trustless verification.')
  const [compareInput, setCompareInput] = useState('Blockchain is built on trustless verification!')
  const [copied, setCopied] = useState(false)
  const hash = useMemo(() => sha256(input), [input])
  const secondHash = useMemo(() => sha256(compareInput), [compareInput])
  const changedBits = useMemo(() => [...hash].reduce((total, char, index) => total + (parseInt(char, 16) ^ parseInt(secondHash[index], 16)).toString(2).replaceAll('0', '').length, 0), [hash, secondHash])
  const avalanchePercent = Math.round((changedBits / 256) * 100)

  async function copyHash() {
    await navigator.clipboard?.writeText(hash)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return <div className="view-stack">
    <div className="module-title-row"><div><div className="section-kicker">01 / HASH FUNCTION</div><h2>SHA-256 <span>properties</span></h2><p>Một chiều vào, một dấu vân tay duy nhất đi ra.</p></div><div className="algorithm-tag"><span className="tag-dot" /> NIST FIPS 180-4 <span className="tag-divider" /> 256-BIT</div></div>

    <section className="input-panel"><div className="input-panel-head"><label htmlFor="hash-input">INPUT MESSAGE</label><span>{new TextEncoder().encode(input).length} BYTES <span className="subtle-dot">·</span> REAL-TIME</span></div><textarea id="hash-input" className="message-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nhập nội dung cần băm..." rows={3} /><div className="hash-output-row"><div><span className="output-label">SHA-256 DIGEST</span><HashLine value={hash} /></div><button className="icon-button copy-button" title="Sao chép hash" aria-label="Sao chép hash" onClick={copyHash}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div></section>

    <div className="properties-grid">
      <PropertyCard icon={Fingerprint} title="Deterministic" label="CÙNG ĐẦU VÀO, CÙNG ĐẦU RA"><div className="property-body"><div className="compare-inputs"><div className="mini-input"><span>INPUT A</span><code>{input || '∅'}</code></div><ArrowDown size={15} className="muted-icon" /><div className="mini-input"><span>INPUT B · IDENTICAL</span><code>{input || '∅'}</code></div></div><div className="match-result"><Check size={14} /> DIGEST KHỚP TUYỆT ĐỐI</div></div></PropertyCard>

      <PropertyCard icon={Zap} title="Avalanche effect" label="THAY ĐỔI NHỎ, KẾT QUẢ KHÁC BIỆT"><div className="property-body"><label className="field-label" htmlFor="compare-input">INPUT SO SÁNH</label><input id="compare-input" className="text-input compact-input" value={compareInput} onChange={(event) => setCompareInput(event.target.value)} /><div className="digest-compare"><div><span>A</span><code>{hash.slice(0, 16)}…</code></div><div><span>B</span><code>{secondHash.slice(0, 16)}…</code></div></div><div className="avalanche-stat"><strong>{changedBits}<small>/256</small></strong><span>bits đã thay đổi</span></div><div className="progress-track"><div className="progress-fill lime-fill" style={{ width: `${avalanchePercent}%` }} /></div><div className="tiny-caption">{avalanchePercent}% digest khác nhau</div></div></PropertyCard>

      <PropertyCard icon={LockKeyhole} title="Pre-image resistance" label="KHÔNG THỂ ĐẢO NGƯỢC THỰC TẾ"><div className="property-body"><div className="one-way-flow"><div className="flow-chip"><span>MESSAGE</span><code>{input ? input.slice(0, 15) : '∅'}{input.length > 15 ? '…' : ''}</code></div><ArrowRight size={15} className="muted-icon" /><div className="flow-chip digest-chip"><span>DIGEST</span><code>{hash.slice(0, 15)}…</code></div></div><div className="lock-note"><LockKeyhole size={13} /><span>Không có phép toán ngược khả thi để khôi phục message từ hash.</span></div><div className="attempt-row"><span>Không gian đầu ra</span><code>2<sup>256</sup> khả năng</code></div></div></PropertyCard>

      <PropertyCard icon={Sigma} title="Fixed length" label="KÍCH THƯỚC LUÔN CỐ ĐỊNH"><div className="property-body"><div className="length-metric"><strong>256</strong><span>BITS</span><i /><strong>64</strong><span>HEX CHARS</span></div><div className="length-visual"><div className="length-bars">{Array.from({ length: 16 }, (_, index) => <span key={index} style={{ opacity: 0.35 + ((index * 29) % 60) / 100 }} />)}</div><div className="length-digest">{hash.slice(0, 32)}<br />{hash.slice(32)}</div></div><div className="fixed-note"><Shuffle size={13} /> Input có thể dài bất kỳ, digest luôn 64 ký tự hex.</div></div></PropertyCard>
    </div>
    <div className="educational-note"><span className="note-mark">i</span><span>SHA-256 là hàm băm mật mã. Hash không mã hóa nội dung và không thể giải mã ngược.</span><span className="note-end">CRYPTO-JS</span></div>
  </div>
}