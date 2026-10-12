import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Blocks, Sparkles } from 'lucide-react'
import TabBlockchain from './TabBlockchain'
import TabTamperTest from './TabTamperTest'
import TabMultiWalletMining from './TabMultiWalletMining'
import { EthereumPoSLab } from './TabPoS'
import TabContractsAssets from './TabContractsAssets'
import { useChain } from '../lib/useChain'
import { useBi } from '../lib/useLanguage'

export default function TabMining() {
  const b = useBi()
  const steps = [
    { title: b('Cấu trúc Block', 'Block structure'), objective: b('Nhận biết các trường block và cách hash/Merkle root liên kết dữ liệu.', 'Learn the block fields and how hashes and Merkle roots link the data.'), howTo: [b('Chọn block V1 hoặc V2.', 'Select block V1 or V2.'), b('Chọn trường để highlight nó trong công thức.', 'Pick a field to highlight it in the formula.'), b('Sửa giao dịch, chọn một leaf và theo đường lên Merkle root.', 'Edit a transaction, pick a leaf and follow the path up to the Merkle root.')] },
    { title: b('Sửa dữ liệu', 'Tamper test'), objective: b('Quan sát thay đổi dữ liệu làm hỏng hash và liên kết các block sau.', 'See how a data change breaks the hash and the links of the following blocks.'), howTo: [b('Sửa một giao dịch ở block bất kỳ.', 'Edit a transaction in any block.'), b('Xem hash tính lại và checklist trạng thái đổi.', 'Watch the recomputed hash and the changed status checklist.'), b('Kiểm tra block sau báo lỗi PreviousHash.', 'Check that the next block reports a PreviousHash error.'), b('Bấm Re-mine để đào lại block này đến cuối chain.', 'Press Re-mine to re-mine this block to the end of the chain.')] },
    { title: b('Khai thác nhiều ví', 'Multi-wallet mining'), objective: b('So sánh nhiều ví đang tìm nonce hợp lệ song song.', 'Compare several wallets searching for a valid nonce in parallel.'), howTo: [b('Đặt số 0 difficulty trong bước 2.', 'Set the difficulty zero count in step 2.'), b('Bắt đầu khai thác bốn ví.', 'Start mining with four wallets.'), b('So sánh số lần thử và block winner.', 'Compare attempt counts and the winning block.')] },
    { title: b('Mạng P2P', 'P2P network'), objective: b('Quan sát transaction và block lan qua các node với độ trễ khác nhau.', 'Watch transactions and blocks spread across nodes with different delays.'), howTo: [b('Đặt độ trễ mạng.', 'Set the network latency.'), b('Broadcast giao dịch tới các peer.', 'Broadcast a transaction to the peers.'), b('Đồng bộ block và xem trạng thái từng node.', 'Sync blocks and check each node status.')] },
    { title: b('Ethereum PoS', 'Ethereum proof of stake'), objective: b('Theo dõi proposer, attestation và finalization theo stake.', 'Follow proposer selection, attestation and finalization driven by stake.'), howTo: [b('Tạo slot để chọn proposer.', 'Create a slot to select a proposer.'), b('Gửi attestation từ các validator.', 'Send attestations from the validators.'), b('Quan sát block finalized và thay đổi stake/reward.', 'Watch finalized blocks and stake/reward changes.')] },
    { title: b('Mở rộng', 'Expansion'), objective: b('Thử mô phỏng token, smart contract và tài sản số trên cùng phòng lab.', 'Try the token, smart contract and digital asset simulations in the same lab.'), howTo: [b('Thử transfer, mint hoặc burn LAB.', 'Try transferring, minting or burning LAB.'), b('Theo dõi thay đổi số dư và total supply.', 'Watch balance and total supply changes.'), b('Tạo hoặc chuyển NFT trong sandbox.', 'Create or transfer an NFT in the sandbox.')] },
  ]
  const [step, setStep] = useState(0)
  useEffect(() => {
    const showP2P = () => setStep(3)
    window.addEventListener('chainlab-mining-step', showP2P)
    return () => window.removeEventListener('chainlab-mining-step', showP2P)
  }, [])
  const current = steps[step]
  const chain = useChain()
  const latest = chain.at(-1)

  return <div className="mining-workbench space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-mono text-xs font-semibold uppercase text-sky-300">{b('Xưởng khai thác & đồng thuận', 'Mining & consensus workbench')}</p><h2 className="mt-1 text-xl font-semibold text-slate-100">{current.title}</h2><p className="mt-1 max-w-3xl text-sm leading-5 text-slate-300">{b('Mục tiêu', 'Goal')}: {current.objective}</p></div><span className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300"><Blocks size={14} className="text-sky-200" />{b('Một chain dùng chung', 'One shared chain')}</span></header>

    <nav className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70 p-1.5" aria-label={b('Sáu bước khai thác', 'Six mining steps')}>
      <ol className="flex min-w-max gap-1">{steps.map((item, index) => <li key={index}><button type="button" onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${step === index ? 'bg-sky-300/15 text-sky-100' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'}`}><span className="grid size-6 place-items-center rounded-md border border-current font-mono">{index + 1}</span>{item.title}</button></li>)}</ol>
    </nav>

    <details className="rounded-lg border border-slate-800 bg-slate-900/55 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-slate-200">{b('Cách sử dụng', 'How to use')}</summary><ol className={`mt-2 grid gap-1.5 text-xs leading-5 text-slate-300 ${current.howTo.length === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>{current.howTo.map((instruction, index) => <li key={index}><span className="mr-1 font-mono text-sky-200">{String(index + 1).padStart(2, '0')}</span>{instruction}</li>)}</ol></details>

    <section key={step} className="min-w-0" aria-live="polite">{step === 0 ? <TabBlockchain /> : step === 1 ? <TabTamperTest /> : step === 2 ? <TabMultiWalletMining architecture="workers" /> : step === 3 ? <TabMultiWalletMining architecture="p2p" /> : step === 4 ? <EthereumPoSLab /> : <TabContractsAssets />}</section>

    <aside className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/55 px-3 py-2 text-xs" aria-label="Shared chain status"><span className="font-semibold text-slate-200">{b('Chain dùng chung', 'Shared chain')}: {chain.length} blocks · height #{latest?.index ?? 0}</span><code className="font-mono text-slate-300">Latest hash · {latest?.hash.slice(0, 16)}…</code></aside>

    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3"><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} aria-label={b('Quay lại bước trước', 'Previous step')} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-semibold text-slate-200 disabled:opacity-40"><ArrowLeft size={14} />{b('Quay lại', 'Back')}</button><div className="inline-flex items-center gap-2 text-xs text-slate-400"><Sparkles size={13} className="text-sky-300" />{b('Bước', 'Step')} {step + 1} / 6</div><button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} disabled={step === steps.length - 1} aria-label={b('Tiếp theo bước sau', 'Next step')} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-sky-300/25 bg-sky-300/[0.07] px-3 text-xs font-semibold text-sky-100 disabled:opacity-40">{b('Tiếp theo', 'Next')}<ArrowRight size={14} /></button></footer>
  </div>
}
