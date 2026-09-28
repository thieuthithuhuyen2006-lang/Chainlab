import { useMemo, useState } from 'react'
import { AlertOctagon, ArrowDownToLine, BadgeCheck, Blocks, Check, CircleDot, Coins, Gavel, Play, Radio, ShieldAlert, Users, Zap } from 'lucide-react'

const initialValidators = [
  { id: 'v1', name: 'Alice Chen', address: '0x7A3F...91C2', stake: 3200, color: 'mint', slashed: 0 },
  { id: 'v2', name: 'Bruno Silva', address: '0x2B8E...0D44', stake: 2100, color: 'blue', slashed: 0 },
  { id: 'v3', name: 'Chika Mori', address: '0x4D10...A567', stake: 1450, color: 'amber', slashed: 0 },
  { id: 'v4', name: 'Dara Nguyen', address: '0x91C2...3F8B', stake: 800, color: 'coral', slashed: 0 },
]

function chooseWeighted(validators) {
  const eligible = validators.filter((validator) => validator.stake > 0)
  const total = eligible.reduce((sum, validator) => sum + validator.stake, 0)
  if (!total) return null
  let ticket = Math.random() * total
  return eligible.find((validator) => (ticket -= validator.stake) < 0) ?? eligible.at(-1)
}

function shortTime() {
  return new Date().toLocaleTimeString('vi-VN', { hour12: false })
}

export default function PosTab() {
  const [validators, setValidators] = useState(initialValidators)
  const [selected, setSelected] = useState(null)
  const [fraudMode, setFraudMode] = useState(false)
  const [slot, setSlot] = useState(128)
  const [blocksProduced, setBlocksProduced] = useState(0)
  const [attestations, setAttestations] = useState(0)
  const [logs, setLogs] = useState([{ time: '09:41:02', type: 'system', message: 'Chainlab PoS testnet đã khởi tạo.', detail: '4 validators · epoch 08' }])
  const totalStake = useMemo(() => validators.reduce((sum, validator) => sum + validator.stake, 0), [validators])

  function addLog(type, message, detail) {
    setLogs((current) => [{ time: shortTime(), type, message, detail }, ...current].slice(0, 8))
  }

  function proposeBlock() {
    const winner = chooseWeighted(validators)
    if (!winner) return
    setSelected(winner.id)
    setSlot((current) => current + 1)
    setBlocksProduced((current) => current + 1)
    addLog('block', `Block #${slot} proposed by ${winner.name}.`, `${winner.address} · ${winner.stake.toLocaleString()} CHAIN staked`)
  }

  function attestBlock() {
    if (!selected) return addLog('warning', 'No block to attest.', 'Propose a block first')
    const validator = validators.find((entry) => entry.id === selected)
    if (fraudMode) {
      const penalty = Math.max(1, Math.floor(validator.stake * 0.1))
      setValidators((current) => current.map((entry) => entry.id === selected ? { ...entry, stake: entry.stake - penalty, slashed: entry.slashed + penalty } : entry))
      addLog('slash', `Slashing · ${validator.name} bị phạt ${penalty.toLocaleString()} CHAIN.`, 'Double-sign detected · 10% stake slashed')
      setFraudMode(false)
    } else {
      setAttestations((current) => current + 1)
      addLog('attest', `Attestation accepted for block #${slot - 1}.`, `Validator committee confirmed · ${validator.name}`)
    }
    setSelected(null)
  }

  return <div className="view-stack">
    <div className="module-title-row"><div><div className="section-kicker">04 / CONSENSUS MECHANISM</div><h2>Proof of Stake <span>network</span></h2><p>Stake quyết định xác suất được chọn. Hành vi xấu phải trả giá.</p></div><div className="network-live"><span className="live-dot" /> EPOCH 08 <span>·</span> SLOT {slot}</div></div>

    <div className="pos-stats"><div className="pos-stat"><span className="stat-icon"><Users size={16} /></span><div><strong>{validators.length}</strong><span>ACTIVE VALIDATORS</span></div><i className="stat-accent accent-mint" /></div><div className="pos-stat"><span className="stat-icon"><Coins size={16} /></span><div><strong>{totalStake.toLocaleString()} <small>CHAIN</small></strong><span>TOTAL STAKED</span></div><i className="stat-accent accent-amber" /></div><div className="pos-stat"><span className="stat-icon"><Blocks size={16} /></span><div><strong>{blocksProduced}</strong><span>BLOCKS PRODUCED</span></div><i className="stat-accent accent-blue" /></div><div className="pos-stat"><span className="stat-icon"><BadgeCheck size={16} /></span><div><strong>{attestations}</strong><span>ATTESTATIONS</span></div><i className="stat-accent accent-coral" /></div></div>

    <div className="pos-columns"><section className="surface-panel validator-panel"><div className="panel-heading"><div className="panel-title-icon"><Users size={16} /></div><div><h3>Validator set</h3><span>SELECTION WEIGHTED BY STAKE</span></div><span className="panel-count">{validators.filter((validator) => validator.stake > 0).length} ONLINE</span></div><div className="validator-list">{validators.map((validator) => {
      const share = totalStake ? (validator.stake / totalStake) * 100 : 0
      return <div className={`validator-row ${selected === validator.id ? 'validator-selected' : ''} ${validator.stake === 0 ? 'validator-jailed' : ''}`} key={validator.id}><span className={`validator-avatar avatar-${validator.color}`}>{validator.name.split(' ').map((part) => part[0]).join('')}</span><div className="validator-identity"><strong>{validator.name}</strong><code>{validator.address}</code></div><div className="stake-meter"><div><strong>{validator.stake.toLocaleString()} <small>CHAIN</small></strong><span>{share.toFixed(1)}% weight</span></div><div className="stake-track"><span style={{ width: `${share}%` }} /></div></div>{validator.slashed > 0 && <span className="slashed-tag">-{validator.slashed.toLocaleString()}</span>}{selected === validator.id && <span className="selected-badge"><Radio size={12} /> PROPOSER</span>}{validator.stake === 0 && <span className="jailed-tag">JAILED</span>}</div>
    })}</div><div className="validator-legend"><span><i className="legend-active" /> VALIDATOR ACTIVE</span><span><i className="legend-weight" /> STAKE WEIGHT = SELECTION CHANCE</span></div></section>

    <section className="surface-panel flow-panel"><div className="panel-heading"><div className="panel-title-icon"><Zap size={16} /></div><div><h3>Consensus flow</h3><span>PROPOSE → ATTEST → FINALIZE</span></div><span className="flow-live"><i /> LIVE</span></div><div className="consensus-flow"><div className={`flow-step ${selected ? 'step-complete' : 'step-current'}`}><span className="step-number">{selected ? <Check size={14} /> : '01'}</span><div><strong>Propose block</strong><span>Weighted random validator</span></div></div><div className={`flow-connector ${selected ? 'connector-active' : ''}`} /><div className={`flow-step ${selected ? 'step-current' : ''}`}><span className="step-number">02</span><div><strong>Attestation</strong><span>Committee checks block</span></div></div><div className="flow-connector" /><div className="flow-step"><span className="step-number">03</span><div><strong>Finalize</strong><span>Block added to chain</span></div></div></div><div className="fraud-toggle-row"><div className="fraud-copy"><span className="fraud-icon"><ShieldAlert size={15} /></span><div><strong>Gian lận mô phỏng</strong><span>Double-sign sẽ kích hoạt slashing</span></div></div><button role="switch" aria-checked={fraudMode} aria-label="Bật mô phỏng gian lận" className={`toggle-switch ${fraudMode ? 'toggle-on' : ''}`} onClick={() => setFraudMode((current) => !current)}><i /></button></div>{fraudMode && <div className="fraud-warning"><AlertOctagon size={13} /> Block kế tiếp bị đánh dấu gian lận; validator sẽ mất 10% stake.</div>}<div className="flow-actions"><button className="secondary-button" onClick={proposeBlock}><Play size={13} /> PROPOSE BLOCK</button><button className={`primary-button ${fraudMode ? 'slash-button' : ''}`} onClick={attestBlock}><Gavel size={14} />{fraudMode ? 'SLASH VALIDATOR' : 'ATTEST & FINALIZE'}</button></div><div className="randomness-note"><ArrowDownToLine size={13} /><span>Lottery ngẫu nhiên: mỗi validator có xác suất tỷ lệ thuận với stake.</span></div></section></div>

    <section className="surface-panel event-panel"><div className="panel-heading"><div className="panel-title-icon"><CircleDot size={16} /></div><div><h3>Network events</h3><span>CONSENSUS ACTIVITY STREAM</span></div><button className="text-button" onClick={() => setLogs([])}>CLEAR LOG</button></div><div className="event-list">{logs.length ? logs.map((log, index) => <div className="event-row" key={`${log.time}-${index}`}><span className={`event-indicator event-${log.type}`}>{log.type === 'slash' ? <AlertOctagon size={13} /> : log.type === 'attest' ? <BadgeCheck size={13} /> : log.type === 'block' ? <Blocks size={13} /> : <CircleDot size={13} />}</span><time>{log.time}</time><div className="event-copy"><strong>{log.message}</strong><span>{log.detail}</span></div><span className={`event-type type-${log.type}`}>{log.type.toUpperCase()}</span></div>) : <div className="empty-events">Chưa có hoạt động mạng.</div>}</div></section>
    <div className="educational-note"><span className="note-mark">i</span><span>PoS chọn validator theo tỷ lệ stake; slashing mô phỏng hình phạt khi validator double-sign hoặc vi phạm quy tắc.</span><span className="note-end">SIMULATED TESTNET</span></div>
  </div>
}