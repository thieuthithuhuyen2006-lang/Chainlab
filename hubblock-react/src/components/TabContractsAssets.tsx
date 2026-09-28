import { useMemo, useState } from 'react'
import { Blocks, Check, Coins, FileCode2, Flame, Gem, Plus, ShieldCheck, WalletCards } from 'lucide-react'

type Account = {
  id: string
  name: string
  address: string
  balance: number
}

type Nft = {
  id: string
  name: string
  ownerId: string
  color: string
}

type ContractAction = 'transfer' | 'mint' | 'burn'

const initialAccounts: Account[] = [
  { id: 'treasury', name: 'HUB Treasury', address: '0x7A3F...91C2', balance: 10_000 },
  { id: 'alice', name: 'Alice Chen', address: '0x2B8E...0D44', balance: 1_200 },
  { id: 'bruno', name: 'Bruno Silva', address: '0x4D10...A567', balance: 420 },
  { id: 'chika', name: 'Chika Mori', address: '0x91C2...3F8B', balance: 85 },
]

const codeSamples: Record<ContractAction, string> = {
  transfer: `function transfer(address to, uint256 amount) external returns (bool) {\n  require(balanceOf[msg.sender] >= amount);\n  balanceOf[msg.sender] -= amount;\n  balanceOf[to] += amount;\n  emit Transfer(msg.sender, to, amount);\n  return true;\n}`,
  mint: `function mint(address to, uint256 amount) external onlyOwner {\n  totalSupply += amount;\n  balanceOf[to] += amount;\n  emit Transfer(address(0), to, amount);\n}`,
  burn: `function burn(uint256 amount) external {\n  require(balanceOf[msg.sender] >= amount);\n  balanceOf[msg.sender] -= amount;\n  totalSupply -= amount;\n  emit Transfer(msg.sender, address(0), amount);\n}`,
}

const actionLabels: Record<ContractAction, string> = { transfer: 'transfer()', mint: 'mint()', burn: 'burn()' }

export default function TabContractsAssets() {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [totalSupply, setTotalSupply] = useState(initialAccounts.reduce((sum, account) => sum + account.balance, 0))
  const [action, setAction] = useState<ContractAction>('transfer')
  const [fromId, setFromId] = useState('alice')
  const [toId, setToId] = useState('bruno')
  const [amount, setAmount] = useState('25')
  const [contractMessage, setContractMessage] = useState('')
  const [contractError, setContractError] = useState('')
  const [events, setEvents] = useState<string[]>(['ERC-20 LabToken deployed · 4 accounts initialized.'])
  const [nfts, setNfts] = useState<Nft[]>([
    { id: 'HUB-001', name: 'Genesis Badge', ownerId: 'treasury', color: 'from-emerald-400/25 to-sky-400/5' },
    { id: 'HUB-002', name: 'Validator Pass', ownerId: 'alice', color: 'from-sky-400/25 to-indigo-400/5' },
  ])
  const [nftName, setNftName] = useState('Consensus Pioneer')
  const [nftRecipient, setNftRecipient] = useState('alice')
  const [nftTransferId, setNftTransferId] = useState('HUB-002')
  const [nftTransferRecipient, setNftTransferRecipient] = useState('bruno')
  const holders = useMemo(() => accounts.filter((account) => account.balance > 0).length, [accounts])
  const selectedFrom = accounts.find((account) => account.id === fromId)
  const selectedTo = accounts.find((account) => account.id === toId)

  function recordEvent(message: string) {
    setEvents((current) => [`${new Date().toLocaleTimeString('vi-VN', { hour12: false })} · ${message}`, ...current].slice(0, 6))
  }

  function executeContract() {
    const units = Number(amount)
    setContractError('')
    setContractMessage('')
    if (!Number.isSafeInteger(units) || units <= 0) {
      setContractError('Amount phải là số nguyên dương trong sandbox này.')
      return
    }

    if (action === 'transfer') {
      if (!selectedFrom || !selectedTo || fromId === toId) {
        setContractError('Chọn hai ví khác nhau để transfer.')
        return
      }
      if (selectedFrom.balance < units) {
        setContractError(`Insufficient balance · ${selectedFrom.name} hiện có ${selectedFrom.balance} LAB.`)
        return
      }
      setAccounts((current) => current.map((account) => account.id === fromId
        ? { ...account, balance: account.balance - units }
        : account.id === toId ? { ...account, balance: account.balance + units } : account))
      setContractMessage(`transfer() thành công · ${units} LAB từ ${selectedFrom.name} đến ${selectedTo.name}.`)
      recordEvent(`Transfer ${units} LAB · ${selectedFrom.name} → ${selectedTo.name}.`)
      return
    }

    if (action === 'mint') {
      if (!selectedTo) {
        setContractError('Chọn ví nhận token mint.')
        return
      }
      setAccounts((current) => current.map((account) => account.id === toId ? { ...account, balance: account.balance + units } : account))
      setTotalSupply((current) => current + units)
      setContractMessage(`mint() thành công · ${units} LAB được phát hành cho ${selectedTo.name}.`)
      recordEvent(`Mint ${units} LAB to ${selectedTo.name} · total supply increased.`)
      return
    }

    if (!selectedFrom || selectedFrom.balance < units) {
      setContractError(`Insufficient balance · ${selectedFrom?.name ?? 'Ví gửi'} không đủ token để burn.`)
      return
    }
    setAccounts((current) => current.map((account) => account.id === fromId ? { ...account, balance: account.balance - units } : account))
    setTotalSupply((current) => current - units)
    setContractMessage(`burn() thành công · ${units} LAB đã bị hủy khỏi ${selectedFrom.name}.`)
    recordEvent(`Burn ${units} LAB from ${selectedFrom.name} · total supply decreased.`)
  }

  function mintNft() {
    const name = nftName.trim()
    const owner = accounts.find((account) => account.id === nftRecipient)
    if (!name || !owner) return
    const index = nfts.length + 1
    const nft: Nft = {
      id: `HUB-${String(index).padStart(3, '0')}`,
      name,
      ownerId: nftRecipient,
      color: index % 2 === 0 ? 'from-sky-400/25 to-indigo-400/5' : 'from-amber-300/20 to-rose-400/5',
    }
    setNfts((current) => [...current, nft])
    setNftTransferId(nft.id)
    recordEvent(`ERC-721 mint · ${nft.id} (${name}) → ${owner.name}.`)
    setNftName('')
  }

  function transferNft() {
    const nft = nfts.find((item) => item.id === nftTransferId)
    const receiver = accounts.find((account) => account.id === nftTransferRecipient)
    if (!nft || !receiver || nft.ownerId === nftTransferRecipient) return
    const previousOwner = accounts.find((account) => account.id === nft.ownerId)
    setNfts((current) => current.map((item) => item.id === nft.id ? { ...item, ownerId: nftTransferRecipient } : item))
    recordEvent(`ERC-721 transfer · ${nft.id} ${previousOwner?.name ?? ''} → ${receiver.name}.`)
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Digital asset overview">
        {[{ label: 'TOKEN', value: 'LAB · ERC-20', detail: 'Fungible test asset', icon: Coins, tint: 'text-amber-200' }, { label: 'TOTAL SUPPLY', value: `${totalSupply.toLocaleString()} LAB`, detail: 'Mint / burn enabled', icon: Blocks, tint: 'text-emerald-300' }, { label: 'TOKEN HOLDERS', value: String(holders), detail: 'Local wallet ledger', icon: WalletCards, tint: 'text-sky-300' }, { label: 'NFT COLLECTION', value: `${nfts.length} items`, detail: 'HUB Genesis · ERC-721', icon: Gem, tint: 'text-rose-200' }].map(({ label, value, detail, icon: Icon, tint }) => <article key={label} className="relative min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">{label}</span><Icon size={14} className={tint} /></div><strong className="mt-3 block truncate text-xs font-semibold text-slate-100">{value}</strong><span className="mt-1 block text-[9px] text-slate-500">{detail}</span><span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent" /></article>)}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <header className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[0.07] text-sky-200"><FileCode2 size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">Solidity / EVM action sandbox</h3><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-500">Local deterministic contract simulation</p></div></header>
          <div className="mb-4 inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-800 bg-[#0b0f19]/70 p-1" role="tablist" aria-label="ERC-20 contract actions">
            {(['transfer', 'mint', 'burn'] as const).map((type) => <button key={type} type="button" role="tab" aria-selected={action === type} onClick={() => { setAction(type); setContractError(''); setContractMessage('') }} className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[9px] font-semibold transition ${action === type ? 'bg-sky-300/[0.12] text-sky-100' : 'text-slate-500 hover:text-slate-200'}`}>{type === 'transfer' ? <WalletCards size={12} /> : type === 'mint' ? <Plus size={12} /> : <Flame size={12} />}{actionLabels[type]}</button>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {action !== 'mint' && <label><span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">{action === 'burn' ? 'Burn from wallet' : 'From wallet'}</span><select value={fromId} onChange={(event) => setFromId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-2.5 text-[10px] text-slate-200 outline-none focus:border-sky-300/40">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.balance.toLocaleString()} LAB</option>)}</select></label>}
            {action !== 'burn' && <label><span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">{action === 'mint' ? 'Mint to wallet' : 'To wallet'}</span><select value={toId} onChange={(event) => setToId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-2.5 text-[10px] text-slate-200 outline-none focus:border-sky-300/40">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.address}</option>)}</select></label>}
            <label className="block"><span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">Amount · LAB</span><input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 w-full rounded-lg border border-slate-800 bg-[#0b0f19] px-3 font-mono text-xs text-slate-200 outline-none focus:border-sky-300/40" /></label>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-[#080c14] p-3 font-mono text-[8px] leading-5 text-sky-100/75"><code>{codeSamples[action]}</code></pre>
          <button type="button" onClick={executeContract} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] px-4 py-2 text-[10px] font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/[0.12]"><FileCode2 size={13} />Execute {actionLabels[action]} · local sandbox</button>
          {contractMessage && <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] p-3 text-[9px] leading-4 text-emerald-200"><Check size={12} className="mt-0.5 shrink-0" />{contractMessage}</p>}
          {contractError && <p role="alert" className="mt-3 text-[9px] leading-4 text-rose-300">{contractError}</p>}
          <p className="mt-3 text-[8px] leading-4 text-slate-600">This is a bounded teaching simulator, not a Solidity compiler or production EVM.</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
          <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h3 className="text-sm font-semibold text-slate-100">ERC-20 wallet ledger</h3><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-500">LAB token balances by address</p></div><Coins size={16} className="text-amber-200" /></header>
          <div className="divide-y divide-slate-800/80 px-5">{accounts.map((account) => <div key={account.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><strong className="block text-[10px] text-slate-200">{account.name}</strong><code className="mt-1 block font-mono text-[8px] text-slate-600">{account.address}</code></div><strong className="shrink-0 font-mono text-[10px] text-amber-100">{account.balance.toLocaleString()} <span className="text-[8px] text-slate-500">LAB</span></strong></div>)}</div>
          <footer className="border-t border-slate-800 px-5 py-3"><span className="font-mono text-[8px] uppercase text-slate-600">Total supply </span><strong className="font-mono text-[9px] text-slate-300">{totalSupply.toLocaleString()} LAB</strong></footer>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-rose-300/20 bg-rose-300/[0.07] text-rose-200"><Gem size={18} /></span><div><h3 className="text-sm font-semibold text-slate-100">ERC-721 NFT collection</h3><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-500">Mint unique assets · transfer ownership by wallet</p></div></div><span className="rounded-full border border-slate-700 px-2.5 py-1 font-mono text-[8px] text-slate-400">{nfts.length} NFTs</span></header>
        <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0b0f19]/45 p-4"><label className="block"><span className="mb-1.5 block font-mono text-[8px] uppercase text-slate-500">New NFT name</span><input value={nftName} onChange={(event) => setNftName(event.target.value)} placeholder="Asset name" className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-[10px] text-slate-200 outline-none focus:border-rose-300/40" /></label><label className="block"><span className="mb-1.5 block font-mono text-[8px] uppercase text-slate-500">Mint to</span><select value={nftRecipient} onChange={(event) => setNftRecipient(event.target.value)} className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-[10px] text-slate-200">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><button type="button" onClick={mintNft} disabled={!nftName.trim()} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-300/25 bg-rose-300/[0.07] text-[9px] font-semibold text-rose-100 disabled:opacity-40"><Plus size={12} />Mint ERC-721</button><div className="border-t border-slate-800 pt-3"><label className="block"><span className="mb-1.5 block font-mono text-[8px] uppercase text-slate-500">Transfer NFT</span><select value={nftTransferId} onChange={(event) => setNftTransferId(event.target.value)} className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-[10px] text-slate-200">{nfts.map((nft) => <option key={nft.id} value={nft.id}>{nft.id} · {nft.name}</option>)}</select></label><div className="mt-2 flex gap-2"><select aria-label="NFT recipient" value={nftTransferRecipient} onChange={(event) => setNftTransferRecipient(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 text-[9px] text-slate-200">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><button type="button" onClick={transferNft} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-300/20 px-3 text-[9px] text-sky-100"><WalletCards size={12} />Transfer</button></div></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{nfts.map((nft) => { const owner = accounts.find((account) => account.id === nft.ownerId); return <article key={nft.id} className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b0f19]/65"><div className={`grid h-24 place-items-center bg-gradient-to-br ${nft.color}`}><div className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-slate-950/55 text-white/80"><Gem size={22} /></div></div><div className="p-3"><span className="font-mono text-[8px] text-slate-600">{nft.id} · ERC-721</span><h4 className="mt-1 truncate text-[10px] font-semibold text-slate-100">{nft.name}</h4><p className="mt-1 truncate text-[8px] text-slate-500">Owner · {owner?.name ?? 'Unknown'}</p></div></article> })}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3"><div><h3 className="text-[10px] font-semibold text-slate-200">Contract event log</h3><p className="mt-1 font-mono text-[8px] text-slate-600">Local simulated state transitions</p></div><ShieldCheck size={14} className="text-emerald-300" /></header>
        <div className="max-h-32 space-y-1 overflow-y-auto px-5 py-3">{events.map((event, index) => <p key={`${index}-${event}`} className="font-mono text-[8px] leading-4 text-slate-500">{event}</p>)}</div>
      </section>
    </div>
  )
}