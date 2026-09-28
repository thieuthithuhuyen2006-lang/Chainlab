import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Building2, FileKey2, Fingerprint, GraduationCap, Network, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Navbar, { type ModuleId } from './Navbar'
import TabSHA256 from './components/TabSHA256'
import TabCrypto from './components/TabCrypto'
import TabFlashcards from './components/TabFlashcards'
import TabMining from './components/TabMining'
import TabProject from './components/TabProject'
import TabTeam from './components/TabTeam'
import TabHome from './components/TabHome'

type ModuleInfo = { eyebrow: string; title: string; description: string; icon: LucideIcon }

const modules: Record<ModuleId, ModuleInfo> = {
  home: { eyebrow: '00 / HUB BLOCKCHAIN LAB', title: 'Home', description: 'Tổng quan phòng lab và các khu vực học tập tương tác.', icon: Network },
  hash: { eyebrow: '01 / HASH FUNCTION', title: 'SHA-256 Demo', description: 'Quan sát trực tiếp bốn tính chất của hàm băm SHA-256.', icon: Fingerprint },
  mining: { eyebrow: '02 / MINING & CONSENSUS', title: 'Mining Workbench', description: 'Tamper Test, Web Worker mining, P2P propagation và Ethereum PoS.', icon: Network },
  rsa: { eyebrow: '03 / PUBLIC-KEY CRYPTOGRAPHY', title: 'RSA Crypto', description: 'Mã hóa RSA-OAEP, chữ ký RSA-PSS, ECDSA wallet và Merkle proofs.', icon: FileKey2 },
  flashcards: { eyebrow: '04 / LEARNING DECK', title: 'Blockchain Flashcards', description: 'Ôn tập blockchain, cryptography, consensus và smart contracts.', icon: Fingerprint },
  project: { eyebrow: '05 / PROJECT OVERVIEW', title: 'HUB Blockchain Lab', description: 'Mục tiêu học tập, kiến trúc mô phỏng và phạm vi sandbox.', icon: Network },
  team: { eyebrow: '06 / PROJECT TEAM', title: 'Khoa Khoa học dữ liệu · HUB', description: 'Giảng viên hướng dẫn và nhóm thực hiện dự án.', icon: UsersRound },
}

function ProjectInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div key="project-info-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm" role="presentation">
        <motion.section role="dialog" aria-modal="true" aria-labelledby="project-info-title" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.18 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-emerald-300">HUB · Blockchain Lab</span><h2 id="project-info-title" className="mt-2 text-lg font-semibold text-slate-100">Thông tin dự án</h2><p className="mt-1 text-xs text-slate-400">HUB Blockchain & PoS Explorer Simulator</p></div>
            <button type="button" onClick={onClose} aria-label="Đóng thông tin dự án" title="Đóng" className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 transition hover:border-slate-500 hover:text-slate-100"><X size={16} /></button>
          </header>
          <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0b0f19]/60 px-4">
            <div className="flex gap-3 py-3.5"><Building2 size={15} className="mt-0.5 shrink-0 text-emerald-300" /><div><dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">Đơn vị</dt><dd className="mt-1 text-xs text-slate-200">Đại Học Ngân Hàng TP.HCM (HUB)</dd></div></div>
            <div className="flex gap-3 py-3.5"><GraduationCap size={15} className="mt-0.5 shrink-0 text-sky-300" /><div><dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">Giảng viên hướng dẫn</dt><dd className="mt-1 text-xs text-slate-200">TS. Nguyễn Hoài Đức</dd></div></div>
            <div className="flex gap-3 py-3.5"><UsersRound size={15} className="mt-0.5 shrink-0 text-amber-200" /><div><dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">Trưởng nhóm</dt><dd className="mt-1 text-xs text-slate-200">Thiều Thị Thu Huyền</dd></div></div>
            <div className="flex gap-3 py-3.5"><UsersRound size={15} className="mt-0.5 shrink-0 text-emerald-300" /><div><dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">Thành viên</dt><dd><ul className="mt-1 space-y-1 text-xs leading-5 text-slate-200"><li>Huỳnh Ngọc Minh Thảo</li><li>Nguyễn Thu Thảo</li><li>Lê Thị Kim Oanh</li><li>Trần Thị Thanh Hoàng</li><li>Nguyễn Thị Mỹ Chi</li></ul></dd></div></div>
          </dl>
          <div className="mt-4 flex items-center gap-2 text-[9px] text-slate-500"><ShieldCheck size={12} className="text-emerald-400/80" />Dữ liệu trong phòng lab chỉ phục vụ mục đích học tập.</div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  )
}

function ModuleContent({ activeTab, onNavigate }: { activeTab: ModuleId; onNavigate: (tab: ModuleId) => void }) {
  if (activeTab === 'home') return <TabHome onNavigate={onNavigate} />
  if (activeTab === 'hash') return <TabSHA256 />
  if (activeTab === 'mining') return <TabMining />
  if (activeTab === 'rsa') return <TabCrypto />
  if (activeTab === 'flashcards') return <TabFlashcards />
  if (activeTab === 'project') return <TabProject />
  return <TabTeam />
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ModuleId>('home')
  const [projectInfoOpen, setProjectInfoOpen] = useState(false)
  const active = modules[activeTab]
  const ActiveIcon = active.icon
  return <div id="top" className="min-h-screen overflow-x-hidden bg-[#0d0b18] text-slate-200"><div className="pointer-events-none fixed inset-0 -z-0 bg-[linear-gradient(rgba(196,181,253,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(196,181,253,0.025)_1px,transparent_1px)] bg-[size:40px_40px]" /><div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(ellipse_at_50%_-20%,rgba(168,85,247,0.19),transparent_68%)]" /><div className="relative z-10"><Navbar activeTab={activeTab} onTabChange={setActiveTab} onProjectInfo={() => setProjectInfoOpen(true)} /><main className="mx-auto max-w-[1440px] px-5 pb-10 pt-7 sm:px-8 sm:pt-8 lg:px-10 lg:pt-9">
    <section className="mb-8 flex flex-col justify-between gap-6 lg:mb-9 lg:flex-row lg:items-end"><div className="max-w-3xl"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.17em] text-violet-300"><Sparkles size={13} /> HUB BLOCKCHAIN LAB <span className="text-slate-600">/</span> TESTNET</div><h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-slate-100 sm:text-4xl">Khám phá blockchain <span className="text-slate-500">qua thực nghiệm.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Một phòng lab tương tác để hiểu cấu trúc dữ liệu, mật mã và cơ chế đồng thuận phía sau blockchain.</p></div><div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/65 px-4 py-3"><span className="grid size-9 place-items-center rounded-lg border border-violet-300/20 bg-violet-300/[0.08] text-violet-300"><ActiveIcon size={17} /></span><div><span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">Current module</span><strong className="mt-1 block text-xs font-semibold text-slate-200">{active.title}</strong></div></div></section>
    <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Tổng quan phòng lab">{[{ label: 'ACTIVE MODULES', value: '07', detail: 'Interactive labs', icon: Activity, tone: 'text-violet-300' }, { label: 'HASH STANDARD', value: 'SHA-256', detail: '256-bit digest', icon: Fingerprint, tone: 'text-sky-300' }, { label: 'CONSENSUS', value: 'Proof of Stake', detail: 'Ethereum model', icon: Network, tone: 'text-rose-300' }, { label: 'NETWORK', value: 'Local Testnet', detail: 'Simulation only', icon: Activity, tone: 'text-violet-300' }].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="relative min-w-0 overflow-hidden rounded-xl border border-purple-900/30 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md sm:p-5"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">{label}</span><Icon size={15} className={tone} /></div><strong className="mt-4 block truncate text-sm font-semibold text-slate-100">{value}</strong><span className="mt-1 block text-[10px] text-slate-500">{detail}</span><span className={`absolute inset-x-0 bottom-0 h-px ${tone === 'text-sky-300' ? 'bg-sky-300/60' : tone === 'text-rose-300' ? 'bg-rose-300/60' : 'bg-violet-300/60'}`} /></article>)}</section>
    <section aria-live="polite"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{active.eyebrow}</p><h2 className="mt-1.5 text-lg font-semibold text-slate-100">{active.title}</h2><p className="mt-1 text-xs text-slate-400">{active.description}</p></div><span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 font-mono text-[9px] text-slate-400"><span className="size-1.5 rounded-full bg-emerald-400" /> SIMULATION MODE</span></div><motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}><ModuleContent activeTab={activeTab} onNavigate={setActiveTab} /></motion.div></section>
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-600"><span>HUBBLOCK · LAB</span><span className="inline-flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-400/70" /> Educational simulation · No real assets</span></footer>
  </main>{projectInfoOpen && <ProjectInfoModal onClose={() => setProjectInfoOpen(false)} />}</div></div>
}
