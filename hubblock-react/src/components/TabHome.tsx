import { BookOpenCheck, Blocks, FileKey2, Fingerprint, Network, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleId } from '../Navbar'

type HomeLink = { id: ModuleId; title: string; description: string; icon: LucideIcon; accent: string }

const homeLinks: HomeLink[] = [
  { id: 'hash', title: 'Hash Demo', description: 'SHA-256 input, digest và 4 tính chất.', icon: Fingerprint, accent: 'text-emerald-300' },
  { id: 'mining', title: 'Mining', description: 'Blockchain V2, worker mining, P2P và PoS.', icon: Blocks, accent: 'text-sky-300' },
  { id: 'rsa', title: 'RSA Crypto', description: 'Mã hóa, chữ ký số, ví ECDSA và Merkle.', icon: FileKey2, accent: 'text-violet-300' },
  { id: 'flashcards', title: 'Quiz / Flashcards', description: 'Ôn tập 26 câu hỏi theo chủ đề.', icon: BookOpenCheck, accent: 'text-amber-200' },
  { id: 'project', title: 'Project', description: 'Mục tiêu, kiến trúc và công nghệ.', icon: Network, accent: 'text-cyan-300' },
  { id: 'team', title: 'Team', description: 'Giảng viên hướng dẫn và nhóm HUB.', icon: UsersRound, accent: 'text-rose-200' },
]

export default function TabHome({ onNavigate }: { onNavigate: (tab: ModuleId) => void }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md sm:p-8"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-indigo-300/20 bg-indigo-400/[0.08] text-indigo-300"><Blocks size={20} /></span><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-indigo-300">HUB Blockchain Lab</p><h3 className="mt-2 text-xl font-semibold text-slate-100">Phòng lab khám phá Blockchain</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">Thực hành các khái niệm hash, cấu trúc block, cryptography, đồng thuận và tài sản số trong môi trường mô phỏng cục bộ.</p></div></div></section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Các khu vực học tập">{homeLinks.map(({ id, title, description, icon: Icon, accent }, index) => <button key={id} type="button" onClick={() => onNavigate(id)} className="group flex min-h-[112px] items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 text-left shadow-xl shadow-black/10 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/35 hover:bg-slate-900"><span className={`grid size-9 shrink-0 place-items-center rounded-xl border border-slate-700/80 bg-[#0b0f19]/70 ${accent}`}><Icon size={16} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="text-xs font-semibold text-slate-100">{title}</strong><span className="font-mono text-[8px] text-slate-600">0{index + 1}</span></span><span className="mt-1.5 block text-[10px] leading-5 text-slate-400">{description}</span></span></button>)}</section>
      <p className="px-1 text-[9px] leading-5 text-slate-500">Educational simulator · Không kết nối ví, blockchain mainnet hoặc tài sản thật.</p>
    </div>
  )
}