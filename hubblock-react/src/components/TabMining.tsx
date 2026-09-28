import { useState } from 'react'
import { Blocks, Network } from 'lucide-react'
import TabBlockchain from './TabBlockchain'
import TabPoS from './TabPoS'

type MiningView = 'chain' | 'network'

export default function TabMining() {
  const [view, setView] = useState<MiningView>('chain')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Mining & consensus workbench</p><p className="mt-1 text-xs text-slate-400">Block integrity, multi-wallet mining, P2P và Ethereum PoS trong cùng phòng lab.</p></div>
        <div role="tablist" aria-label="Mining views" className="inline-flex rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          <button id="mining-chain-tab" type="button" role="tab" aria-selected={view === 'chain'} aria-controls="mining-chain-panel" onClick={() => setView('chain')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${view === 'chain' ? 'bg-sky-300/[0.1] text-sky-100' : 'text-slate-500 hover:text-slate-200'}`}><Blocks size={13} />Blockchain V2</button>
          <button id="mining-network-tab" type="button" role="tab" aria-selected={view === 'network'} aria-controls="mining-network-panel" onClick={() => setView('network')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${view === 'network' ? 'bg-emerald-300/[0.1] text-emerald-100' : 'text-slate-500 hover:text-slate-200'}`}><Network size={13} />Multi-wallet & PoS</button>
        </div>
      </div>
      <div id="mining-chain-panel" role="tabpanel" aria-labelledby="mining-chain-tab" hidden={view !== 'chain'}><TabBlockchain /></div>
      <div id="mining-network-panel" role="tabpanel" aria-labelledby="mining-network-tab" hidden={view !== 'network'}><TabPoS /></div>
    </div>
  )
}