import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Blocks, Sparkles } from 'lucide-react'
import TabBlockchain from './TabBlockchain'
import TabTamperTest from './TabTamperTest'
import TabMultiWalletMining from './TabMultiWalletMining'
import { EthereumPoSLab } from './TabPoS'
import TabContractsAssets from './TabContractsAssets'
import { useChain } from '../lib/useChain'

const steps = [
  { title: 'Cấu trúc Block', english: 'Block structure', objective: 'Nhận biết các trường block và cách hash/Merkle root liên kết dữ liệu.', howTo: ['Chọn block V1 hoặc V2.', 'Chọn trường để highlight nó trong công thức.', 'Sửa giao dịch, chọn một leaf và theo đường lên Merkle root.'] },
  { title: 'Sửa dữ liệu', english: 'Tamper test', objective: 'Quan sát thay đổi dữ liệu làm hỏng hash và liên kết các block sau.', howTo: ['Sửa một giao dịch ở block bất kỳ.', 'Xem hash tính lại và checklist trạng thái đổi.', 'Kiểm tra block sau báo lỗi PreviousHash.', 'Bấm Re-mine để đào lại block này đến cuối chain.'] },
  { title: 'Khai thác nhiều ví', english: 'Multi-wallet mining', objective: 'So sánh nhiều ví đang tìm nonce hợp lệ song song.', howTo: ['Đặt số 0 difficulty trong bước 2.', 'Bắt đầu khai thác bốn ví.', 'So sánh số lần thử và block winner.'] },
  { title: 'Mạng P2P', english: 'P2P network', objective: 'Quan sát transaction và block lan qua các node với độ trễ khác nhau.', howTo: ['Đặt độ trễ mạng.', 'Broadcast giao dịch tới các peer.', 'Đồng bộ block và xem trạng thái từng node.'] },
  { title: 'Ethereum PoS', english: 'Ethereum proof of stake', objective: 'Theo dõi proposer, attestation và finalization theo stake.', howTo: ['Tạo slot để chọn proposer.', 'Gửi attestation từ các validator.', 'Quan sát block finalized và thay đổi stake/reward.'] },
  { title: 'Mở rộng', english: 'Expansion', objective: 'Thử mô phỏng token, smart contract và tài sản số trên cùng phòng lab.', howTo: ['Thử transfer, mint hoặc burn LAB.', 'Theo dõi thay đổi số dư và total supply.', 'Tạo hoặc chuyển NFT trong sandbox.'] },
]

export default function TabMining() {
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
    <header className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-mono text-xs font-semibold uppercase text-sky-300">Mining & consensus workbench</p><h2 className="mt-1 text-xl font-semibold text-slate-100">{current.title} <span className="text-sm font-medium text-slate-400">({current.english})</span></h2><p className="mt-1 max-w-3xl text-sm leading-5 text-slate-300">Mục tiêu: {current.objective}</p></div><span className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300"><Blocks size={14} className="text-sky-200" />Một chain dùng chung</span></header>

    <nav className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70 p-1.5" aria-label="Sáu bước khai thác">
      <ol className="flex min-w-max gap-1">{steps.map((item, index) => <li key={item.title}><button type="button" onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${step === index ? 'bg-sky-300/15 text-sky-100' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'}`}><span className="grid size-6 place-items-center rounded-md border border-current font-mono">{index + 1}</span>{item.title}<span className="text-xs font-normal opacity-75">({item.english})</span></button></li>)}</ol>
    </nav>

    <details className="rounded-lg border border-slate-800 bg-slate-900/55 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-slate-200">Cách sử dụng (How to use)</summary><ol className={`mt-2 grid gap-1.5 text-xs leading-5 text-slate-300 ${current.howTo.length === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>{current.howTo.map((instruction, index) => <li key={instruction}><span className="mr-1 font-mono text-sky-200">{String(index + 1).padStart(2, '0')}</span>{instruction}</li>)}</ol></details>

    <section key={step} className="min-w-0" aria-live="polite">{step === 0 ? <TabBlockchain /> : step === 1 ? <TabTamperTest /> : step === 2 ? <TabMultiWalletMining architecture="workers" /> : step === 3 ? <TabMultiWalletMining architecture="p2p" /> : step === 4 ? <EthereumPoSLab /> : <TabContractsAssets />}</section>

    <aside className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/55 px-3 py-2 text-xs" aria-label="Shared chain status"><span className="font-semibold text-slate-200">Chain dùng chung: {chain.length} blocks · height #{latest?.index ?? 0}</span><code className="font-mono text-slate-300">Latest hash · {latest?.hash.slice(0, 16)}…</code></aside>

    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3"><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} aria-label="Quay lại bước trước" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-semibold text-slate-200 disabled:opacity-40"><ArrowLeft size={14} />Quay lại</button><div className="inline-flex items-center gap-2 text-xs text-slate-400"><Sparkles size={13} className="text-sky-300" />Bước {step + 1} / 6</div><button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} disabled={step === steps.length - 1} aria-label="Tiếp theo bước sau" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-sky-300/25 bg-sky-300/[0.07] px-3 text-xs font-semibold text-sky-100 disabled:opacity-40">Tiếp theo<ArrowRight size={14} /></button></footer>
  </div>
}