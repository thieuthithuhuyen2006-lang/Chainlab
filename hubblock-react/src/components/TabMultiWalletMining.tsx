import { useEffect, useRef, useState } from 'react'
import { Activity, Blocks, Check, Cpu, Network, Radio, Send, ShieldCheck, Zap } from 'lucide-react'
import CryptoJS from 'crypto-js'
import type { MiningWorkerRequest, MiningWorkerResponse } from './pow.worker'

type Architecture = 'workers' | 'p2p'
type MinerStatus = 'idle' | 'mining' | 'winner' | 'stopped'
type PeerStatus = 'online' | 'receiving' | 'synced'

type Wallet = {
  id: string
  name: string
  address: string
}

type Miner = {
  walletId: string
  status: MinerStatus
  attempts: number
  latestHash: string
}

type Peer = {
  wallet: Wallet
  status: PeerStatus
  latencyMs: number
  mempoolSize: number
  height: number
}

type SimulatedBlock = {
  index: number
  timestamp: string
  previousHash: string
  merkleRoot: string
  validatorAddress: string
  nonce: number
  hash: string
}

const wallets: Wallet[] = [
  { id: 'wallet-a', name: 'Wallet A · Alice', address: '0x7A3F...91C2' },
  { id: 'wallet-b', name: 'Wallet B · Bruno', address: '0x2B8E...0D44' },
  { id: 'wallet-c', name: 'Wallet C · Chika', address: '0x4D10...A567' },
  { id: 'wallet-d', name: 'Wallet D · Dara', address: '0x91C2...3F8B' },
]

const sampleTransactions = [
  'Alice → Bob · 1.25 ETH',
  'Carol → Dave · 0.80 ETH',
  'Emil → Alice · 2.10 ETH',
]
const zeroHash = '0'.repeat(64)

function sha256(value: string) {
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex)
}

function createMerkleRoot(transactions: string[]) {
  let level = transactions.length ? transactions.map(sha256) : [sha256('')]
  while (level.length > 1) {
    const next: string[] = []
    for (let index = 0; index < level.length; index += 2) {
      next.push(sha256(level[index] + (level[index + 1] ?? level[index])))
    }
    level = next
  }
  return level[0]
}

function shortHash(value: string) {
  return `${value.slice(0, 12)}…${value.slice(-8)}`
}

export default function TabMultiWalletMining() {
  const [architecture, setArchitecture] = useState<Architecture>('workers')
  const [difficulty, setDifficulty] = useState(2)
  const [mining, setMining] = useState(false)
  const [miners, setMiners] = useState<Miner[]>(wallets.map((wallet) => ({ walletId: wallet.id, status: 'idle', attempts: 0, latestHash: '' })))
  const [winner, setWinner] = useState<{ walletName: string; nonce: number; hash: string; attempts: number; elapsedMs: number } | null>(null)
  const [p2pLatency, setP2pLatency] = useState(120)
  const [peers, setPeers] = useState<Peer[]>(wallets.map((wallet) => ({ wallet, status: 'online', latencyMs: 0, mempoolSize: 0, height: 0 })))
  const [transactionsBroadcast, setTransactionsBroadcast] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [syncingBlock, setSyncingBlock] = useState(false)
  const [events, setEvents] = useState<string[]>(['P2P testnet ready · 4 wallets connected.'])
  const [block, setBlock] = useState<SimulatedBlock | null>(null)
  const [chainHeight, setChainHeight] = useState(0)
  const [error, setError] = useState('')
  const workersRef = useRef<Worker[]>([])
  const winnerRef = useRef(false)

  useEffect(() => () => workersRef.current.forEach((worker) => worker.terminate()), [])

  function addEvent(message: string) {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false })
    setEvents((current) => [`${time} · ${message}`, ...current].slice(0, 8))
  }

  function stopWorkers() {
    workersRef.current.forEach((worker) => worker.terminate())
    workersRef.current = []
    setMining(false)
    setMiners((current) => current.map((miner) => miner.status === 'mining' ? { ...miner, status: 'stopped' } : miner))
  }

  function mineWithWorkers() {
    if (mining) return
    setError('')
    setWinner(null)
    winnerRef.current = false

    const timestamp = new Date().toISOString()
    const index = chainHeight + 1
    const previousHash = block?.hash ?? zeroHash
    const merkleRoot = createMerkleRoot(sampleTransactions)
    setMiners(wallets.map((wallet) => ({ walletId: wallet.id, status: 'mining', attempts: 0, latestHash: '' })))

    try {
      const workers = wallets.map(() => new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' }))
      workersRef.current = workers
      setMining(true)

      workers.forEach((worker, workerIndex) => {
        const wallet = wallets[workerIndex]
        worker.onmessage = (event: MessageEvent<MiningWorkerResponse>) => {
          const result = event.data
          if (result.type === 'progress') {
            setMiners((current) => current.map((miner) => miner.walletId === result.workerId
              ? { ...miner, attempts: result.attempts, latestHash: result.latestHash }
              : miner))
            return
          }

          if (result.type === 'error') {
            setError(result.message)
            stopWorkers()
            return
          }

          if (result.type !== 'found' || winnerRef.current) return
          winnerRef.current = true
          workersRef.current.forEach((activeWorker) => activeWorker.terminate())
          workersRef.current = []
          setMining(false)
          setWinner(result)
          setMiners((current) => current.map((miner) => ({
            ...miner,
            status: miner.walletId === result.workerId ? 'winner' : 'stopped',
            attempts: miner.walletId === result.workerId ? result.attempts : miner.attempts,
          })))
          const minedBlock: SimulatedBlock = {
            index,
            timestamp,
            previousHash,
            merkleRoot,
            validatorAddress: result.validatorAddress,
            nonce: result.nonce,
            hash: result.hash,
          }
          setBlock(minedBlock)
          setChainHeight(index)
          addEvent(`${result.walletName} mined block #${index} · nonce ${result.nonce} · ${result.elapsedMs.toFixed(0)} ms.`)
        }
        worker.onerror = (event) => {
          setError(event.message || 'A mining worker stopped unexpectedly.')
          stopWorkers()
        }

        const request: MiningWorkerRequest = {
          type: 'start',
          workerId: wallet.id,
          walletName: wallet.name,
          validatorAddress: wallet.address,
          index,
          timestamp,
          previousHash,
          merkleRoot,
          nonceStart: workerIndex,
          nonceStride: workers.length,
          difficulty,
        }
        worker.postMessage(request)
      })
    } catch (workerError) {
      stopWorkers()
      setError(workerError instanceof Error ? workerError.message : 'Web Workers are unavailable in this browser.')
    }
  }

  async function broadcastTransaction() {
    if (broadcasting || transactionsBroadcast) return
    setBroadcasting(true)
    setPeers((current) => current.map((peer) => ({ ...peer, status: 'receiving' })))
    await Promise.all(wallets.map(async (wallet, index) => {
      const delay = p2pLatency + index * 45
      await new Promise((resolve) => window.setTimeout(resolve, delay))
      setPeers((current) => current.map((peer) => peer.wallet.id === wallet.id
        ? { ...peer, status: 'online', latencyMs: delay, mempoolSize: peer.mempoolSize + 1 }
        : peer))
      addEvent(`TX broadcast reached ${wallet.name} after ${delay} ms.`)
    }))
    setTransactionsBroadcast(true)
    setBroadcasting(false)
    addEvent('Transaction propagated to all peer mempools.')
  }

  async function broadcastBlock() {
    if (!transactionsBroadcast || syncingBlock) return
    let blockToSync = block
    if (!blockToSync) {
      const timestamp = new Date().toISOString()
      const index = chainHeight + 1
      const previousHash = zeroHash
      const merkleRoot = createMerkleRoot(sampleTransactions)
      const validatorAddress = wallets[0].address
      const nonce = 0
      const hash = CryptoJS.SHA256(`${index}${timestamp}${previousHash}${merkleRoot}${nonce}${validatorAddress}`).toString(CryptoJS.enc.Hex)
      blockToSync = { index, timestamp, previousHash, merkleRoot, validatorAddress, nonce, hash }
      setBlock(blockToSync)
      setChainHeight(index)
      addEvent(`P2P sample block #${index} assembled by ${wallets[0].name}.`)
    }

    setSyncingBlock(true)
    setPeers((current) => current.map((peer) => ({ ...peer, status: 'receiving' })))
    await Promise.all(wallets.map(async (wallet, index) => {
      const delay = p2pLatency + index * 70
      await new Promise((resolve) => window.setTimeout(resolve, delay))
      setPeers((current) => current.map((peer) => peer.wallet.id === wallet.id
        ? { ...peer, status: 'synced', latencyMs: delay, height: blockToSync.index }
        : peer))
      addEvent(`Block #${blockToSync.index} synced to ${wallet.name} after ${delay} ms.`)
    }))
    setSyncingBlock(false)
    addEvent(`Network synchronized at block height ${blockToSync.index}.`)
  }

  const architectureOptions: { id: Architecture; label: string; description: string; icon: typeof Cpu }[] = [
    { id: 'workers', label: 'Web Workers', description: 'Ví cạnh tranh nonce song song trên worker riêng.', icon: Cpu },
    { id: 'p2p', label: 'P2P Network', description: 'Broadcast giao dịch và đồng bộ block qua các node trễ khác nhau.', icon: Network },
  ]

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">Multi-wallet mining lab</p><h3 className="mt-1 text-sm font-semibold text-slate-100">Chọn kiến trúc mô phỏng</h3></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.05] px-3 py-1.5 font-mono text-[8px] uppercase text-emerald-200"><span className="size-1.5 rounded-full bg-emerald-400" />4 wallets connected</span></div>
        <div className="grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Mining architecture">
          {architectureOptions.map(({ id, label, description, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={architecture === id} onClick={() => { setArchitecture(id); setError('') }} className={`flex min-h-[74px] items-start gap-3 rounded-xl border p-3 text-left transition ${architecture === id ? 'border-emerald-300/25 bg-emerald-300/[0.055]' : 'border-slate-800 bg-[#0b0f19]/50 hover:border-slate-700'}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${architecture === id ? 'bg-emerald-300/10 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}><Icon size={15} /></span><span><strong className={`block text-[11px] font-semibold ${architecture === id ? 'text-emerald-100' : 'text-slate-200'}`}>{label}</strong><span className="mt-1 block text-[9px] leading-4 text-slate-500">{description}</span></span></button>)}
        </div>
      </section>

      {architecture === 'workers' ? (
        <div className="space-y-4">
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="min-w-[220px] flex-1"><label htmlFor="pow-difficulty" className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500"><span>PoW difficulty · zero prefix</span><strong className="text-emerald-200">{difficulty} zeros</strong></label><input id="pow-difficulty" type="range" min="1" max="5" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} disabled={mining} className="h-1.5 w-full cursor-pointer accent-emerald-300 disabled:opacity-50" /><p className="mt-1.5 text-[8px] text-slate-600">Mỗi worker duyệt nonce riêng; nonce không trùng giữa các luồng.</p></div>
            <div className="flex gap-2"><button type="button" onClick={mineWithWorkers} disabled={mining} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] px-4 text-[10px] font-semibold text-emerald-100 transition hover:border-emerald-300/45 disabled:cursor-wait disabled:opacity-50"><Zap size={14} />{mining ? 'Mining in parallel...' : 'Start 4-worker mining'}</button>{mining && <button type="button" onClick={stopWorkers} className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 text-[10px] text-rose-200"><span className="size-2 rounded-full bg-rose-400" />Stop</button>}</div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Mining workers">
            {wallets.map((wallet) => {
              const miner = miners.find((item) => item.walletId === wallet.id)
              const status = miner?.status ?? 'idle'
              return <article key={wallet.id} className={`min-w-0 rounded-2xl border bg-slate-900/75 p-4 ${status === 'winner' ? 'border-emerald-300/35' : status === 'mining' ? 'border-sky-300/25' : 'border-slate-800'}`}><header className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-100">{wallet.name}</span><span className={`size-2 rounded-full ${status === 'winner' ? 'bg-emerald-300' : status === 'mining' ? 'animate-pulse bg-sky-300' : status === 'stopped' ? 'bg-slate-600' : 'bg-slate-700'}`} /></header><code className="mt-1 block font-mono text-[8px] text-slate-600">{wallet.address}</code><div className="mt-4 flex items-center justify-between"><span className="font-mono text-[8px] uppercase text-slate-500">{status === 'winner' ? 'BLOCK MINER' : status === 'mining' ? 'HASHING' : status}</span><strong className={`font-mono text-[9px] ${status === 'winner' ? 'text-emerald-200' : 'text-slate-300'}`}>{miner?.attempts.toLocaleString() ?? 0} hashes</strong></div><code className="mt-2 block min-h-8 break-all font-mono text-[8px] leading-4 text-slate-500">{miner?.latestHash ? shortHash(miner.latestHash) : 'Waiting for mining job...'}</code></article>
            })}
          </section>

          {winner && <section role="status" className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.055] p-5"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-100"><Check size={15} />{winner.walletName} tìm thấy block #{chainHeight}</div><div className="mt-3 grid gap-3 text-[9px] sm:grid-cols-3"><div><span className="block font-mono text-slate-600">NONCE</span><strong className="mt-1 block text-slate-200">{winner.nonce.toLocaleString()}</strong></div><div><span className="block font-mono text-slate-600">ATTEMPTS · WALL TIME</span><strong className="mt-1 block text-slate-200">{winner.attempts.toLocaleString()} · {winner.elapsedMs.toFixed(0)} ms</strong></div><div className="min-w-0"><span className="block font-mono text-slate-600">PROOF HASH</span><code className="mt-1 block break-all font-mono text-sky-200">{winner.hash}</code></div></div></section>}
          {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-3 text-[10px] text-rose-200">{error}</p>}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
            <header className="mb-5 flex items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Peer-to-peer propagation</p><h3 className="mt-1 text-sm font-semibold text-slate-100">Transaction broadcast → Block sync</h3></div><span className="inline-flex items-center gap-1.5 font-mono text-[8px] text-emerald-300"><Radio size={12} />4 PEERS</span></header>
            <div className="mb-4 rounded-xl border border-slate-800 bg-[#0b0f19]/55 p-3"><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="network-latency" className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">Network latency</label><strong className="font-mono text-[10px] text-sky-200">{p2pLatency} ms</strong></div><input id="network-latency" type="range" min="50" max="500" step="25" value={p2pLatency} onChange={(event) => setP2pLatency(Number(event.target.value))} className="h-1.5 w-full cursor-pointer accent-sky-300" /><p className="mt-1.5 text-[8px] text-slate-600">Mỗi peer kế tiếp nhận message sau thêm 45–70 ms.</p></div>
            <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/55 p-3"><span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">Mempool transaction</span>{sampleTransactions.map((transaction) => <p key={transaction} className="mt-2 text-[9px] text-slate-300">{transaction}</p>)}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={broadcastTransaction} disabled={broadcasting || transactionsBroadcast} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-sky-300/25 bg-sky-300/[0.07] px-3 py-2 text-[9px] font-semibold text-sky-100 disabled:cursor-wait disabled:opacity-45"><Send size={13} />{broadcasting ? 'Broadcasting TX...' : transactionsBroadcast ? 'Transaction received' : 'Broadcast transaction'}</button><button type="button" onClick={broadcastBlock} disabled={!transactionsBroadcast || syncingBlock} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.07] px-3 py-2 text-[9px] font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"><Blocks size={13} />{syncingBlock ? 'Syncing block...' : block ? 'Broadcast & sync block' : 'Create & broadcast block'}</button></div>
            {block && <div className="mt-4 border-t border-slate-800 pt-3"><span className="font-mono text-[8px] uppercase text-slate-600">Latest block #{block.index}</span><code className="mt-1 block break-all font-mono text-[9px] text-emerald-200">{block.hash}</code><span className="mt-1 block text-[8px] text-slate-600">{block.timestamp} · Prev {shortHash(block.previousHash)}</span></div>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h3 className="text-xs font-semibold text-slate-100">Peer nodes</h3><p className="mt-1 font-mono text-[8px] uppercase text-slate-600">Latency · mempool · chain height</p></div><Network size={15} className="text-sky-300" /></header>
            <div className="divide-y divide-slate-800/80 px-4 sm:px-5">{peers.map((peer) => <article key={peer.wallet.id} className="flex items-center gap-3 py-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${peer.status === 'receiving' ? 'bg-sky-300/10 text-sky-200' : peer.status === 'synced' ? 'bg-emerald-300/10 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}><Radio size={14} className={peer.status === 'receiving' ? 'animate-pulse' : ''} /></span><div className="min-w-0 flex-1"><strong className="block text-[10px] text-slate-200">{peer.wallet.name}</strong><code className="mt-1 block font-mono text-[8px] text-slate-600">{peer.wallet.address}</code></div><div className="shrink-0 text-right"><strong className="block font-mono text-[9px] text-sky-200">{peer.latencyMs || p2pLatency} ms</strong><span className="mt-1 block font-mono text-[8px] text-slate-600">TX {peer.mempoolSize} · BLK {peer.height}</span></div></article>)}</div>
            <div className="border-t border-slate-800 px-5 py-3"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[8px] uppercase text-slate-600">Network event stream</span><Activity size={12} className="text-emerald-300" /></div><div className="max-h-32 space-y-1.5 overflow-y-auto">{events.map((event, index) => <p key={`${index}-${event}`} className="text-[8px] leading-4 text-slate-500">{event}</p>)}</div></div>
          </section>
        </div>
      )}

      <p className="flex items-start gap-2 px-1 text-[9px] leading-5 text-slate-600"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-400/70" />Web Workers tìm nonce SHA-256 thật trên các luồng riêng; P2P mode mô phỏng độ trễ lan truyền, không kết nối mạng ngoài.</p>
    </div>
  )
}