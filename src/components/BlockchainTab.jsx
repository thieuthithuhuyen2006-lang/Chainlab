import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, CircleDot, Database, RotateCcw, ShieldCheck, Unlink } from 'lucide-react'
import { getChainValidity, makeBlockHash, makeInitialChain, makeMerkleRoot, remineChain } from '../lib/crypto.js'
import './Blockchain.css'

function shortHash(value) {
  return `${value.slice(0, 13)}…${value.slice(-8)}`
}

export default function BlockchainTab() {
  const [chain, setChain] = useState(makeInitialChain)
  const [selectedBlock, setSelectedBlock] = useState(1)
  const [notice, setNotice] = useState('')
  const validity = useMemo(() => getChainValidity(chain), [chain])
  const validCount = validity.filter(Boolean).length

  function updateBlock(index, value) {
    const transactions = value.split(/\r?\n/).map((transaction) => transaction.trim()).filter(Boolean)
    setChain((current) => current.map((block, blockIndex) => blockIndex === index
      ? { ...block, transactions, merkleRoot: makeMerkleRoot(transactions) }
      : block))
    setNotice(`Block #${index} đã chỉnh sửa · các hash kế tiếp cần được tính lại.`)
  }

  function remine() {
    setChain((current) => remineChain(current))
    setNotice('Đã re-validate toàn bộ chuỗi. Tất cả block hiện hợp lệ.')
  }

  return <div className="view-stack">
    <div className="module-title-row"><div><div className="section-kicker">02 / IMMUTABLE LEDGER</div><h2>Blockchain <span>tamper test</span></h2><p>Sửa dữ liệu để quan sát tính toàn vẹn của chuỗi.</p></div><div className="chain-actions"><button className="secondary-button" onClick={() => { setChain(makeInitialChain()); setNotice('Đã khôi phục chuỗi ban đầu.') }}><RotateCcw size={14} /> RESET</button><button className="primary-button" onClick={remine}><ShieldCheck size={15} /> RE-MINE / RE-VALIDATE</button></div></div>

    <div className="chain-summary"><div className="chain-summary-main"><span className="summary-icon"><Database size={17} /></span><div><strong>{chain.length} blocks</strong><span>ĐỘ DÀI CHUỖI</span></div></div><div className={`chain-health ${validCount === chain.length ? 'healthy' : 'unhealthy'}`}><span className="health-dot" />{validCount === chain.length ? 'CHAIN INTEGRITY VERIFIED' : `${chain.length - validCount} BLOCK${chain.length - validCount > 1 ? 'S' : ''} INVALID`}</div><div className="summary-meta"><span>CONSENSUS</span><strong>PROOF OF STAKE</strong></div><div className="summary-meta"><span>BLOCK TIME</span><strong>12 SEC</strong></div></div>

    {notice && <div className="inline-notice"><CircleDot size={13} /> {notice}</div>}
    <div className="chain-list">{chain.map((block, index) => {
      const isValid = validity[index]
      const isSelected = selectedBlock === index
      return <article key={block.index} className={`block-card ${isValid ? '' : 'invalid'} ${isSelected ? 'selected' : ''}`}>
        <div className="block-card-top"><div className="block-id"><span className="block-cube"><Database size={16} /></span><div><span>BLOCK HEIGHT</span><strong>#{String(block.index).padStart(4, '0')}</strong></div></div><div className={`block-status ${isValid ? 'is-valid' : 'is-invalid'}`}>{isValid ? <Check size={12} /> : <AlertTriangle size={12} />}{isValid ? 'VALID' : 'INVALID'}</div><button className="expand-button" aria-label={`Mở block ${index}`} onClick={() => setSelectedBlock(isSelected ? -1 : index)}><ChevronDown size={17} /></button></div>
        <div className="block-hashes"><div><span>PREVIOUS HASH</span><code>{shortHash(block.prevHash)}</code></div><div><span>CALCULATED BLOCK HASH</span><code className={isValid ? '' : 'bad-hash'}>{shortHash(makeBlockHash(block))}</code></div></div>
        {isSelected && <div className="block-details"><label className="field-label" htmlFor={`block-data-${index}`}>TRANSACTIONS <span>MỖI DÒNG LÀ MỘT GIAO DỊCH · SỬA ĐỂ KIỂM TRA TAMPER</span></label><textarea id={`block-data-${index}`} value={block.transactions.join('\n')} onChange={(event) => updateBlock(index, event.target.value)} rows={Math.min(Math.max(block.transactions.length, 2), 5)} className="text-input block-data-input" placeholder="Nhập mỗi transaction trên một dòng" /><div className="block-metadata block-v2-metadata"><div><span>TIMESTAMP · UNIX EPOCH MS</span><code>{block.timestamp}</code></div><div><span>TIMESTAMP · ISO 8601</span><code>{new Date(block.timestamp).toISOString()}</code></div><div><span>PREVIOUS HASH</span><code>{block.prevHash}</code></div><div><span>MERKLE ROOT · {block.transactions.length} TX</span><code>{block.merkleRoot}</code></div><div><span>NONCE</span><code>{block.nonce}</code></div><div><span>VALIDATOR ADDRESS</span><code>{block.validator}</code></div><div><span>STORED BLOCK HASH</span><code className={isValid ? '' : 'bad-hash'}>{block.hash}</code></div></div>{!isValid && <div className="invalid-explanation"><Unlink size={13} /> Hash đã lưu không khớp block hiện tại hoặc Previous Hash không khớp digest mới của block trước.</div>}</div>}
        {!isSelected && <button className="inspect-link" onClick={() => setSelectedBlock(index)}>XEM CHI TIẾT BLOCK <span>↗</span></button>}
      </article>
    })}</div>
    <div className="chain-footnote"><span className="note-mark">i</span><span>Thay đổi transaction làm Merkle Root và Block Hash đổi; các block sau liên kết đến digest cũ sẽ bị đánh dấu invalid.</span><code>SHA256(Index + Timestamp + PrevHash + MerkleRoot + Nonce + Validator)</code></div>
  </div>
}