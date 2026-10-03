import { GraduationCap, Mail, UsersRound } from 'lucide-react'
import hubLogo from '../../public/hub-logo.png'
import { useLanguage } from '../lib/useLanguage'
import { translations } from '../lib/i18n'

const members = [
  { name: 'Thiều Thị Thu Huyền', role: 'Project Lead & UI Architecture', initials: 'TH' },
  { name: 'Huỳnh Ngọc Minh Thảo', role: 'Frontend Developer', initials: 'MT' },
  { name: 'Nguyễn Thu Thảo', role: 'Blockchain Logic Developer', initials: 'TT' },
  { name: 'Lê Thị Kim Oanh', role: 'PoS & Smart Contract Specialist', initials: 'KO' },
  { name: 'Trần Thị Thanh Hoàng', role: 'Research & Documentation', initials: 'TH' },
  { name: 'Nguyễn Thị Mỹ Chi', role: 'Data Analyst & QA Tester', initials: 'MC' },
]

function HubLogo() {
  return <span className="grid size-10 place-items-center rounded-xl border border-purple-300/30 bg-white p-1.5 shadow-lg shadow-purple-950/30"><img src={hubLogo} alt="HUB" className="h-full w-full object-contain" /></span>
}

export default function TabTeam() {
  const language = useLanguage()
  const t = (key: keyof typeof translations.VN) => translations[language][key]
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><HubLogo /><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-300">{t('academicProject')}</p><h3 className="mt-1 text-lg font-semibold text-slate-100">{t('bankUniversity')}</h3><p className="mt-1 text-[10px] text-slate-400">{t('dataScienceBusiness')} · HUB</p></div></div><span className="rounded-full border border-slate-700 bg-[#0b0f19]/60 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-400">{t('hubBlockchainLab')}</span></div></section>
      <section className="grid gap-3 sm:grid-cols-2" aria-label={language === 'VN' ? 'Giảng viên hướng dẫn và nhóm' : 'Advisors and team'}><article className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/75 p-5"><span className="grid size-11 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[0.07] text-sky-200"><GraduationCap size={20} /></span><div><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">{t('facultySupervisor')}</span><h4 className="mt-1 text-xs font-semibold text-slate-100">{t('advisorName')}</h4></div></article><article className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/75 p-5"><span className="grid size-11 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.07] text-amber-100"><UsersRound size={19} /></span><div><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">{t('groupExecution')}</span><h4 className="mt-1 text-xs font-semibold text-slate-100">{t('studentGroup')}</h4></div></article></section>
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80"><header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6"><div><h3 className="text-sm font-semibold text-slate-100">{t('projectTeam')}</h3><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">{t('studentsAdvisor')}</p></div><UsersRound size={16} className="text-emerald-300" /></header><div className="divide-y divide-slate-800/80 px-5 sm:px-6">{members.map((member, index) => <article key={member.name} className="flex items-start gap-3 py-4"><span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border font-mono text-[9px] font-semibold ${index === 0 ? 'border-amber-300/25 bg-amber-300/[0.08] text-amber-100' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>{member.initials}</span><div className="min-w-0 flex-1"><h4 className="text-xs font-semibold text-slate-100">{member.name}</h4><p className="mt-1 text-[10px] leading-5 text-slate-400">{member.role}</p></div>{index === 0 && <span className="rounded-full border border-amber-300/20 px-2.5 py-1 font-mono text-[8px] text-amber-100">LEAD</span>}</article>)}</div></section>
      <p className="flex items-center gap-2 px-1 text-[9px] text-slate-600"><Mail size={12} />{language === 'VN' ? 'Thông tin nhóm phục vụ nhận diện dự án học tập.' : 'Team information for project identification.'}</p>
    </div>
  )
}
