import { BookOpenCheck, Blocks, FileKey2, Fingerprint, Network, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleId } from '../Navbar'
import { useLanguage } from '../lib/useLanguage'
import { translations } from '../lib/i18n'

type HomeLink = { id: ModuleId; titleKey: keyof typeof translations.VN; descriptionKey: keyof typeof translations.VN; icon: LucideIcon; accent: string }

const homeLinks: HomeLink[] = [
  { id: 'hash', titleKey: 'tabHash', descriptionKey: 'homeHashDesc', icon: Fingerprint, accent: 'text-emerald-300' },
  { id: 'mining', titleKey: 'tabMining', descriptionKey: 'homeMiningDesc', icon: Blocks, accent: 'text-sky-300' },
  { id: 'rsa', titleKey: 'tabRsa', descriptionKey: 'homeRsaDesc', icon: FileKey2, accent: 'text-violet-300' },
  { id: 'flashcards', titleKey: 'tabFlashcards', descriptionKey: 'homeFlashcardsDesc', icon: BookOpenCheck, accent: 'text-amber-200' },
  { id: 'project', titleKey: 'tabProject', descriptionKey: 'homeProjectDesc', icon: Network, accent: 'text-cyan-300' },
  { id: 'team', titleKey: 'tabTeam', descriptionKey: 'homeTeamDesc', icon: UsersRound, accent: 'text-rose-200' },
]

export default function TabHome({ onNavigate }: { onNavigate: (tab: ModuleId) => void }) {
  const language = useLanguage()
  const t = (key: keyof typeof translations.VN) => translations[language][key]
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md sm:p-8"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-indigo-300/20 bg-indigo-400/[0.08] text-indigo-300"><Blocks size={20} /></span><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-indigo-300">{t('hubBlockchainLab')}</p><h3 className="mt-2 text-xl font-semibold text-slate-100">{language === 'VN' ? 'Phòng lab khám phá Blockchain' : 'Blockchain Exploration Lab'}</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">{t('interactiveLab')}</p></div></div></section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={language === 'VN' ? 'Các khu vực học tập' : 'Learning areas'}>{homeLinks.map(({ id, titleKey, descriptionKey, icon: Icon, accent }, index) => <button key={id} type="button" onClick={() => onNavigate(id)} className="group flex min-h-[112px] items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 text-left shadow-xl shadow-black/10 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/35 hover:bg-slate-900"><span className={`grid size-9 shrink-0 place-items-center rounded-xl border border-slate-700/80 bg-[#0b0f19]/70 ${accent}`}><Icon size={16} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="text-xs font-semibold text-slate-100">{t(titleKey)}</strong><span className="font-mono text-[8px] text-slate-600">0{index + 1}</span></span><span className="mt-1.5 block text-[10px] leading-5 text-slate-400">{t(descriptionKey)}</span></span></button>)}</section>
      <p className="px-1 text-[9px] leading-5 text-slate-500">{t('educationalSimulation')} · {language === 'VN' ? 'Không kết nối ví, blockchain mainnet hoặc tài sản thật.' : 'No wallet, mainnet or real assets connection.'}</p>
    </div>
  )
}
