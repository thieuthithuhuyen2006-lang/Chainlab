import { useState } from 'react'
import { GitBranch, KeyRound } from 'lucide-react'
import TabRSA from './TabRSA'
import TabSignatureMerkle from './TabSignatureMerkle'

type CryptoView = 'rsa' | 'wallet'

export default function TabCrypto() {
  const [view, setView] = useState<CryptoView>('rsa')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Public-key cryptography</p><p className="mt-1 text-xs text-slate-400">RSA encryption/signatures cùng ECDSA wallet và Merkle proofs.</p></div>
        <div role="tablist" aria-label="RSA and wallet cryptography" className="inline-flex rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          <button id="rsa-crypto-tab" type="button" role="tab" aria-selected={view === 'rsa'} aria-controls="rsa-crypto-panel" onClick={() => setView('rsa')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${view === 'rsa' ? 'bg-violet-300/[0.1] text-violet-100' : 'text-slate-500 hover:text-slate-200'}`}><KeyRound size={13} />RSA Crypto</button>
          <button id="ecdsa-merkle-tab" type="button" role="tab" aria-selected={view === 'wallet'} aria-controls="ecdsa-merkle-panel" onClick={() => setView('wallet')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${view === 'wallet' ? 'bg-emerald-300/[0.1] text-emerald-100' : 'text-slate-500 hover:text-slate-200'}`}><GitBranch size={13} />ECDSA & Merkle</button>
        </div>
      </div>
      <div id="rsa-crypto-panel" role="tabpanel" aria-labelledby="rsa-crypto-tab" hidden={view !== 'rsa'}><TabRSA /></div>
      <div id="ecdsa-merkle-panel" role="tabpanel" aria-labelledby="ecdsa-merkle-tab" hidden={view !== 'wallet'}><TabSignatureMerkle /></div>
    </div>
  )
}