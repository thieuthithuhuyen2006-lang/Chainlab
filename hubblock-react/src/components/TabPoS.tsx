import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, AlertTriangle, BadgeCheck, Blocks, Check, CircleAlert, Coins, Gavel, Network, Radio, ShieldAlert, ShieldCheck, Users, Vote, Zap } from 'lucide-react'
import CryptoJS from 'crypto-js'
import { hashBlock, hashTransaction, merkleRoot, type Block } from '../lib/chain'
import { appendMinedBlock, getChainSnapshot } from '../lib/chainStore'
import { useChain } from '../lib/useChain'

type Validator = {
  id: string
  name: string
  address: string
  stake: number
  rewards: number
  slashedAmount: number
  locked: boolean
}

type NetworkEvent = {
  id: number
  time: string
  type: 'system' | 'proposal' | 'attestation' | 'slashing'
  title: string
  detail: string
}

type SlotPhase = 'idle' | 'proposed' | 'attesting' | 'finalized'

const startingValidators: Validator[] = [
  { id: 'alice', name: 'Alice Chen', address: `0x${CryptoJS.SHA256('Alice Chen').toString().slice(-40)}`, stake: 32, rewards: 0, slashedAmount: 0, locked: false },
  { id: 'bruno', name: 'Bruno Silva', address: `0x${CryptoJS.SHA256('Bruno Silva').toString().slice(-40)}`, stake: 24, rewards: 0, slashedAmount: 0, locked: false },
  { id: 'chika', name: 'Chika Mori', address: `0x${CryptoJS.SHA256('Chika Mori').toString().slice(-40)}`, stake: 16, rewards: 0, slashedAmount: 0, locked: false },
  { id: 'dara', name: 'Dara Nguyen', address: `0x${CryptoJS.SHA256('Dara Nguyen').toString().slice(-40)}`, stake: 12, rewards: 0, slashedAmount: 0, locked: false },
  { id: 'emil', name: 'Emil Fischer', address: `0x${CryptoJS.SHA256('Emil Fischer').toString().slice(-40)}`, stake: 8, rewards: 0, slashedAmount: 0, locked: false },
]

const proposerReward = 0.02
const attesterReward = 0.005

function createRandaoReveal() {
  const entropy = new Uint8Array(32)
  window.crypto.getRandomValues(entropy)
  return Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function chooseWeightedValidator(validators: Validator[], randaoMix: string) {
  const eligible = validators.filter((validator) => validator.stake > 0 && !validator.locked)
  const totalStakeUnits = eligible.reduce((sum, validator) => sum + Math.round(validator.stake * 1000), 0)
  if (totalStakeUnits === 0) return null

  const randomValue = CryptoJS.SHA256(randaoMix).toString(CryptoJS.enc.Hex).slice(0, 16)
  let draw = Number(BigInt(`0x${randomValue}`) % BigInt(totalStakeUnits))
  for (const validator of eligible) {
    draw -= Math.round(validator.stake * 1000)
    if (draw < 0) return validator
  }
  return eligible[eligible.length - 1]
}

function timeNow() {
  return new Date().toLocaleTimeString('vi-VN', { hour12: false })
}

function formatEth(value: number) {
  return `${value.toFixed(3)} ETH`
}

function StatCard({ label, value, detail, icon: Icon, tint }: { label: string; value: string; detail: string; icon: typeof Activity; tint: string }) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">{label}</span><Icon size={15} className={tint} /></div>
      <strong className="mt-4 block truncate text-sm font-semibold text-slate-100">{value}</strong>
      <span className="mt-1 block text-[10px] text-slate-500">{detail}</span>
      <span className={`absolute inset-x-0 bottom-0 h-px ${tint === 'text-sky-300' ? 'bg-sky-300/50' : tint === 'text-amber-300' ? 'bg-amber-300/50' : 'bg-emerald-300/50'}`} />
    </article>
  )
}

export function EthereumPoSLab() {
  const chain = useChain()
  const [validators, setValidators] = useState(startingValidators)
  const [slot, setSlot] = useState(0)
  const [phase, setPhase] = useState<SlotPhase>('idle')
  const [proposerId, setProposerId] = useState<string | null>(null)
  const [randaoMix, setRandaoMix] = useState(() => CryptoJS.SHA256('HUB-POC-ETHEREUM-RANDAO').toString(CryptoJS.enc.Hex))
  const [randaoReveal, setRandaoReveal] = useState('')
  const [attestedIds, setAttestedIds] = useState<string[]>([])
  const [blocksProduced, setBlocksProduced] = useState(0)
  const [slashTargetId, setSlashTargetId] = useState(startingValidators[1].id)
  const [depositTargetId, setDepositTargetId] = useState(startingValidators[0].id)
  const [depositAmount, setDepositAmount] = useState('1')
  const [depositNotice, setDepositNotice] = useState('')
  const [networkLatencyMs, setNetworkLatencyMs] = useState(120)
  const [events, setEvents] = useState<NetworkEvent[]>([
    { id: 1, time: timeNow(), type: 'system', title: 'Ethereum PoS testnet đã khởi tạo.', detail: '5 validators · epoch 01 · slot duration 12s' },
  ])

  const activeValidators = validators.filter((validator) => validator.stake > 0 && !validator.locked)
  const totalStake = activeValidators.reduce((sum, validator) => sum + validator.stake, 0)
  const totalRewards = validators.reduce((sum, validator) => sum + validator.rewards, 0)
  const currentProposer = validators.find((validator) => validator.id === proposerId) ?? null
  const slotInEpoch = slot === 0 ? 0 : ((slot - 1) % 32) + 1
  const epoch = Math.floor(Math.max(slot - 1, 0) / 32) + 1
  const slashTarget = validators.find((validator) => validator.id === slashTargetId)
  const pendingSlot = phase === 'proposed' || phase === 'attesting'

  function addEvent(type: NetworkEvent['type'], title: string, detail: string) {
    setEvents((current) => [{ id: Date.now() + Math.random(), time: timeNow(), type, title, detail }, ...current].slice(0, 7))
  }

  function createSlot() {
    if (pendingSlot) return
    const nextSlot = slot + 1
    const reveal = createRandaoReveal()
    const nextRandaoMix = CryptoJS.SHA256(`${randaoMix}${nextSlot}${reveal}`).toString(CryptoJS.enc.Hex)
    const selected = chooseWeightedValidator(validators, nextRandaoMix)
    if (!selected) {
      addEvent('system', 'Không có validator đủ điều kiện.', 'Tất cả ví đang bị khóa hoặc không còn stake.')
      return
    }

    setSlot(nextSlot)
    setRandaoReveal(reveal)
    setRandaoMix(nextRandaoMix)
    setProposerId(selected.id)
    setAttestedIds([])
    setPhase('proposed')
    addEvent('proposal', `Slot ${nextSlot} · ${selected.name} được chọn làm Block Proposer.`, `${selected.address} · stake ${(selected.stake / totalStake * 100).toFixed(1)}% · RANDAO ${nextRandaoMix.slice(0, 12)}…`)
  }

  function depositStake() {
    const target = validators.find((validator) => validator.id === depositTargetId)
    const amount = Number(depositAmount)
    if (!target || target.locked || !Number.isFinite(amount) || amount <= 0) {
      setDepositNotice('Chọn validator đang hoạt động và nhập lượng ETH lớn hơn 0.')
      return
    }

    setValidators((current) => current.map((validator) => validator.id === target.id ? { ...validator, stake: validator.stake + amount } : validator))
    setDepositNotice(`${formatEth(amount)} đã được nạp vào stake của ${target.name}.`)
    addEvent('system', `Staking deposit · ${target.name} +${formatEth(amount)}.`, `New stake ${formatEth(target.stake + amount)} · proposer probability recalculated`)
  }

  async function attestAndFinalize() {
    if (!currentProposer || phase !== 'proposed') return
    const attesters = activeValidators.filter((validator) => validator.id !== currentProposer.id)
    const attesterIds = attesters.map((validator) => validator.id)

    setPhase('attesting')
    setAttestedIds([])
    await Promise.all(attesters.map(async (attester, index) => {
      const deliveryDelay = networkLatencyMs + index * 60
      await new Promise((resolve) => window.setTimeout(resolve, deliveryDelay))
      setAttestedIds((current) => [...current, attester.id])
      addEvent('attestation', `${attester.name} attested slot ${slot}.`, `P2P vote arrived after ${deliveryDelay} ms`)
    }))

    setValidators((current) => current.map((validator) => {
      if (validator.id === currentProposer.id) return { ...validator, rewards: validator.rewards + proposerReward }
      if (attesterIds.includes(validator.id)) return { ...validator, rewards: validator.rewards + attesterReward }
      return validator
    }))
    setAttestedIds(attesterIds)
    setPhase('finalized')
    setBlocksProduced((current) => current + 1)
    const sharedChain = getChainSnapshot()
    const latest = sharedChain.at(-1)!
    const finalized: Block = {
      index: sharedChain.length,
      timestamp: new Date().toISOString(),
      previousHash: latest.hash,
      transactions: latest.transactions,
      merkleRoot: merkleRoot(latest.transactions.map(hashTransaction)),
      difficulty: latest.difficulty,
      validator: currentProposer.address,
      nonce: 0,
      hash: '',
      consensus: 'pos',
    }
    finalized.hash = hashBlock(finalized)
    appendMinedBlock(finalized)
    addEvent('attestation', `Block #${finalized.index} finalized · ${attesters.length} attestations accepted.`, `${currentProposer.name} +${formatEth(proposerReward)} · committee +${formatEth(attesterReward)} each`)
  }

  function simulateDoubleSign() {
    if (phase === 'attesting' || !slashTarget || slashTarget.locked || slashTarget.stake <= 0) return
    const confiscatedStake = slashTarget.stake
    setValidators((current) => current.map((validator) => validator.id === slashTarget.id
      ? { ...validator, stake: 0, slashedAmount: validator.slashedAmount + confiscatedStake, locked: true }
      : validator))

    if (proposerId === slashTarget.id && phase === 'proposed') {
      setPhase('idle')
      setProposerId(null)
      setAttestedIds([])
    }
    const remainingStake = totalStake - confiscatedStake
    setSlashTargetId(validators.find((validator) => validator.id !== slashTarget.id && !validator.locked && validator.stake > 0)?.id ?? '')
    addEvent('slashing', `SLASHING · ${slashTarget.name} bị tịch thu stake và khóa ví.`, `${formatEth(confiscatedStake)} confiscated · remaining network stake ${formatEth(Math.max(remainingStake, 0))}`)
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[0.07] text-sky-300"><Network size={18} /></span><div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Ethereum PoS · simplified RANDAO</p><strong className="mt-1 block text-sm text-slate-100">Epoch {String(epoch).padStart(2, '0')} <span className="px-1 text-slate-600">/</span> Slot {slotInEpoch === 0 ? '--' : String(slotInEpoch).padStart(2, '0')} <span className="text-slate-500">of 32</span></strong><code className="mt-1 block font-mono text-[8px] text-slate-600" title={randaoReveal ? `Latest reveal: ${randaoReveal}` : 'Randomness mix updates on every slot'}>RANDAO MIX · {randaoMix.slice(0, 20)}…</code></div></div>
        <div className="min-w-[180px] flex-1 sm:max-w-[260px]"><div className="mb-1.5 flex justify-between font-mono text-[8px] uppercase tracking-wide text-slate-600"><span>Epoch progress</span><span>{slotInEpoch}/32 slots</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><motion.div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300" animate={{ width: `${slotInEpoch / 32 * 100}%` }} transition={{ duration: 0.35 }} /></div></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.05] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-emerald-200"><Radio size={12} className="animate-pulse" />Local testnet</span>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="PoS network statistics">
        <StatCard label="ACTIVE VALIDATORS" value={String(activeValidators.length).padStart(2, '0')} detail="eligible to propose" icon={Users} tint="text-emerald-300" />
        <StatCard label="TOTAL STAKED" value={formatEth(totalStake)} detail="eligible stake weight" icon={Coins} tint="text-amber-300" />
        <StatCard label="FINALIZED BLOCKS" value={String(blocksProduced).padStart(2, '0')} detail="this simulation session" icon={Blocks} tint="text-sky-300" />
        <StatCard label="REWARDS ISSUED" value={formatEth(totalRewards)} detail="proposer + attesters" icon={BadgeCheck} tint="text-emerald-300" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_.88fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6"><div><h3 className="text-sm font-semibold text-slate-100">Validator set</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">Weighted random selection · stake determines chance</p></div><span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 font-mono text-[9px] text-slate-400">{activeValidators.length} ONLINE</span></header>
          <div className="divide-y divide-slate-800/80 px-4 sm:px-6">
            {validators.map((validator) => {
              const chance = totalStake > 0 && !validator.locked ? validator.stake / totalStake * 100 : 0
              const isProposer = validator.id === proposerId && phase !== 'idle'
              const isAttested = attestedIds.includes(validator.id)
              return (
                <motion.article layout key={validator.id} className={`py-3.5 ${isProposer ? 'relative' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full border font-mono text-[9px] font-semibold ${validator.locked ? 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300' : isProposer ? 'border-emerald-300/25 bg-emerald-300/[0.1] text-emerald-200' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>{validator.name.split(' ').map((part) => part[0]).join('')}</span>
                    <div className="min-w-[100px] flex-1"><div className="flex flex-wrap items-center gap-2"><strong className={`text-xs font-semibold ${validator.locked ? 'text-rose-200' : 'text-slate-100'}`}>{validator.name}</strong><span className={`rounded-full border px-1.5 py-0.5 font-mono text-[8px] ${validator.locked ? 'border-rose-400/25 text-rose-300' : isProposer ? 'border-emerald-300/25 text-emerald-200' : isAttested ? 'border-sky-300/25 text-sky-200' : pendingSlot ? 'border-amber-300/20 text-amber-200/80' : 'border-slate-700 text-slate-500'}`}>{validator.locked ? 'SLASHED · LOCKED' : isProposer ? 'BLOCK PROPOSER' : isAttested ? 'ATTESTED' : pendingSlot ? 'AWAITING VOTE' : 'ACTIVE'}</span></div><span className="mt-1 block font-mono text-[9px] text-slate-500">{validator.address}</span></div>
                    <div className="hidden min-w-[110px] text-right sm:block"><strong className={`font-mono text-[10px] ${validator.locked ? 'text-rose-300 line-through' : 'text-slate-200'}`}>{formatEth(validator.stake)}</strong><span className="mt-1 block font-mono text-[8px] text-slate-600">STAKE</span></div>
                    <div className="w-[82px] shrink-0 text-right"><strong className={`font-mono text-[10px] ${validator.locked ? 'text-rose-300' : 'text-sky-200'}`}>{chance.toFixed(1)}%</strong><span className="mt-1 block font-mono text-[8px] text-slate-600">CHANCE</span></div>
                  </div>
                  <div className="ml-12 mt-2 flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800"><motion.div className={`h-full rounded-full ${validator.locked ? 'bg-rose-400/50' : isProposer ? 'bg-emerald-300' : 'bg-sky-300/70'}`} animate={{ width: `${chance}%` }} transition={{ duration: 0.35 }} /></div><span className="w-[108px] text-right font-mono text-[8px] text-slate-600">{validator.locked ? `-${formatEth(validator.slashedAmount)}` : `+${formatEth(validator.rewards)} reward`}</span></div>
                </motion.article>
              )
            })}
          </div>
          <footer className="border-t border-slate-800 px-5 py-3 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-600 sm:px-6">Selection chance = validator stake / active network stake</footer>
          <div className="border-t border-slate-800 bg-[#0b0f19]/30 p-4 sm:px-6"><div className="mb-3 flex items-center justify-between gap-3"><div><h4 className="text-[10px] font-semibold text-slate-200">Staking deposit</h4><p className="mt-1 text-[8px] text-slate-600">Nạp ETH mô phỏng để thay đổi proposer weight.</p></div><Coins size={15} className="text-amber-200" /></div><div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]"><select aria-label="Wallet nhận staking deposit" value={depositTargetId} onChange={(event) => setDepositTargetId(event.target.value)} disabled={activeValidators.length === 0} className="h-9 min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-2.5 text-[9px] text-slate-200 outline-none focus:border-amber-300/40 disabled:opacity-50">{activeValidators.map((validator) => <option key={validator.id} value={validator.id}>{validator.name} · {formatEth(validator.stake)}</option>)}</select><input aria-label="Deposit amount ETH" type="number" min="0.001" step="0.001" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2.5 font-mono text-[9px] text-slate-200 outline-none focus:border-amber-300/40" /><button type="button" onClick={depositStake} disabled={activeValidators.length === 0} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 text-[9px] font-semibold text-amber-100 transition hover:border-amber-300/40 disabled:opacity-40"><Coins size={12} />Deposit ETH</button></div>{depositNotice && <p role="status" className={`mt-2 text-[9px] ${depositNotice.startsWith('Chọn') ? 'text-rose-300' : 'text-emerald-300'}`}>{depositNotice}</p>}</div>
        </section>

        <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Slot lifecycle</p><h3 className="mt-1.5 text-sm font-semibold text-slate-100">Propose → Attest → Finalize</h3></div><span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 font-mono text-[8px] text-slate-400">12 SEC / SLOT</span></div>

          <div className="mt-5 space-y-3">
            <FlowStep number="01" title="Propose block" detail={currentProposer ? `${currentProposer.name} selected by stake weight` : 'Weighted random validator selection'} active={phase !== 'idle'} complete={phase === 'attesting' || phase === 'finalized'} icon={Network} />
            <FlowStep number="02" title="Attest & vote" detail={phase === 'finalized' ? `${attestedIds.length} validator votes accepted` : phase === 'attesting' ? `${attestedIds.length}/${Math.max(activeValidators.length - 1, 0)} P2P votes arrived` : 'Other active validators verify the block'} active={phase === 'attesting' || phase === 'finalized'} complete={phase === 'finalized'} icon={Vote} />
            <FlowStep number="03" title="Finalize & reward" detail={phase === 'finalized' ? `Block #${chain.at(-1)?.index ?? 0} added to the shared chain` : 'Rewards issued after valid attestations'} active={phase === 'finalized'} complete={phase === 'finalized'} icon={Check} />
          </div>

          {phase === 'proposed' && currentProposer && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-200"><Zap size={13} />Slot {slot} proposer: {currentProposer.name}</div><p className="mt-1 text-[9px] leading-4 text-slate-500">{activeValidators.length - 1} validator còn lại sẵn sàng attest block này.</p></motion.div>}
          {phase === 'attesting' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/[0.05] p-3"><div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-sky-100"><span className="inline-flex items-center gap-2"><Radio size={13} className="animate-pulse" />P2P vote propagation</span><span>{attestedIds.length}/{Math.max(activeValidators.length - 1, 0)} received</span></div><p className="mt-1 text-[9px] leading-4 text-slate-500">Mỗi validator nhận proposal sau một network delay lệch nhau.</p></motion.div>}
          {phase === 'finalized' && <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[0.05] p-3 text-[10px] text-sky-100"><ShieldCheck size={14} />Block finalized · proposer và attesters đã nhận thưởng.</div>}

          <div className="mt-4 rounded-xl border border-slate-800 bg-[#0b0f19]/55 p-3"><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="p2p-latency" className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">P2P base latency</label><strong className="font-mono text-[10px] text-sky-200">{networkLatencyMs} ms</strong></div><input id="p2p-latency" type="range" min="40" max="400" step="20" value={networkLatencyMs} onChange={(event) => setNetworkLatencyMs(Number(event.target.value))} className="h-1.5 w-full cursor-pointer accent-sky-300" disabled={phase === 'attesting'} /><p className="mt-1.5 text-[8px] leading-4 text-slate-600">Votes được mô phỏng đến theo base latency + 60 ms cho mỗi peer tiếp theo.</p></div>

          <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
            <button type="button" onClick={createSlot} disabled={pendingSlot || activeValidators.length === 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-sky-300/25 bg-sky-300/[0.08] px-3 py-2 text-[10px] font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40"><Activity size={14} />Tạo Slot Mới (12s)</button>
            <button type="button" onClick={attestAndFinalize} disabled={phase !== 'proposed'} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] px-3 py-2 text-[10px] font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40"><Vote size={14} />Attest & Finalize</button>
          </div>
          <p className="mt-2 text-center font-mono text-[8px] text-slate-600">Một click mô phỏng một slot 12 giây · mỗi epoch gồm 32 slot</p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <section className="rounded-2xl border border-rose-400/20 bg-slate-900/80 p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/[0.07] text-rose-300"><ShieldAlert size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">Slashing simulation</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">Double-sign: validator đề xuất hai block mâu thuẫn trong cùng slot.</p></div></div>
          <label htmlFor="slash-validator" className="mb-1.5 mt-5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Validator vi phạm</label>
          <select id="slash-validator" value={slashTargetId} onChange={(event) => setSlashTargetId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-200 outline-none focus:border-rose-300/40" disabled={activeValidators.length === 0}>
            {validators.filter((validator) => !validator.locked && validator.stake > 0).map((validator) => <option key={validator.id} value={validator.id}>{validator.name} · {formatEth(validator.stake)}</option>)}
          </select>
          <button type="button" onClick={simulateDoubleSign} disabled={phase === 'attesting' || !slashTarget || slashTarget.locked || slashTarget.stake === 0} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-400/30 bg-rose-400/[0.09] px-3 py-2 text-[10px] font-semibold text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-400/[0.15] disabled:cursor-not-allowed disabled:opacity-40"><Gavel size={14} />Validator gửi 2 block mâu thuẫn</button>
          <p className="mt-3 flex items-start gap-2 text-[9px] leading-4 text-rose-200/65"><CircleAlert size={12} className="mt-0.5 shrink-0" />Mô phỏng này tịch thu toàn bộ stake của ví được chọn và khóa validator. Ethereum thực tế áp dụng quy tắc phạt/thoát validator phức tạp hơn.</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
          <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6"><div><h3 className="text-sm font-semibold text-slate-100">Network events</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">Consensus activity stream</p></div><span className="inline-flex items-center gap-1.5 font-mono text-[8px] text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" />LIVE</span></header>
          <div className="max-h-[310px] divide-y divide-slate-800/70 overflow-y-auto px-5 sm:px-6">
            <AnimatePresence initial={false}>
              {events.map((event) => <motion.article key={event.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 py-3"><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${event.type === 'slashing' ? 'bg-rose-400/10 text-rose-300' : event.type === 'attestation' ? 'bg-sky-300/10 text-sky-200' : event.type === 'proposal' ? 'bg-emerald-300/10 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>{event.type === 'slashing' ? <AlertTriangle size={13} /> : event.type === 'attestation' ? <BadgeCheck size={13} /> : event.type === 'proposal' ? <Blocks size={13} /> : <Radio size={13} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><strong className={`text-[10px] font-medium ${event.type === 'slashing' ? 'text-rose-200' : 'text-slate-200'}`}>{event.title}</strong><time className="font-mono text-[8px] text-slate-600">{event.time}</time></div><p className="mt-1 text-[9px] leading-4 text-slate-500">{event.detail}</p></div></motion.article>)}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/65 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">Expansion roadmap</p><h3 className="mt-1 text-xs font-semibold text-slate-100">Smart contracts & digital assets</h3></div>
        <div className="grid flex-1 gap-3 sm:max-w-2xl sm:grid-cols-3 sm:gap-5"><div className="flex items-center gap-2 text-[10px] text-slate-300"><Blocks size={14} className="shrink-0 text-sky-300" />Smart Contracts</div><div className="flex items-center gap-2 text-[10px] text-slate-300"><Coins size={14} className="shrink-0 text-amber-200" />Tokens · ERC-20</div><div className="flex items-center gap-2 text-[10px] text-slate-300"><BadgeCheck size={14} className="shrink-0 text-emerald-300" />NFTs · ERC-721</div></div>
      </section>

      <p className="flex items-start gap-2 px-1 text-[9px] leading-5 text-slate-600"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-400/70" />Educational simulation only. Selection, rewards and slashing are local demonstrations, not connected to Ethereum mainnet.</p>
    </div>
  )
}

function FlowStep({ number, title, detail, active, complete, icon: Icon }: { number: string; title: string; detail: string; active: boolean; complete: boolean; icon: typeof Network }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${active ? 'border-emerald-300/20 bg-emerald-300/[0.045]' : 'border-slate-800 bg-[#0b0f19]/55'}`}>
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${active ? 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-500'}`}>{complete ? <Check size={14} /> : <Icon size={14} />}</span>
      <span className="font-mono text-[9px] text-slate-600">{number}</span>
      <div className="min-w-0 flex-1"><strong className={`block text-[10px] font-semibold ${active ? 'text-slate-100' : 'text-slate-400'}`}>{title}</strong><span className="mt-1 block text-[9px] leading-4 text-slate-600">{detail}</span></div>
      {active && <Check size={13} className="shrink-0 text-emerald-300" />}
    </div>
  )
}

export default function TabPoS() {
  return <EthereumPoSLab />
}