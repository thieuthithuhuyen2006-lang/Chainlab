import { useEffect, useState } from 'react'
import { BookOpenCheck, Blocks, FileKey2, Fingerprint, Home, Info, Moon, Network, Sun, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import hubLogo from '../public/hub-logo.png'
import { useLanguage } from './lib/useLanguage'
import { translations } from './lib/i18n'

export type ModuleId = 'home' | 'hash' | 'mining' | 'rsa' | 'flashcards' | 'project' | 'team'

type TabDefinition = { id: ModuleId; labelKey: keyof typeof translations.VN; icon: LucideIcon }
type NavbarProps = { activeTab: ModuleId; onTabChange: (tab: ModuleId) => void; onProjectInfo: () => void }

const tabs: TabDefinition[] = [
  { id: 'home', labelKey: 'tabHome', icon: Home },
  { id: 'hash', labelKey: 'tabHash', icon: Fingerprint },
  { id: 'mining', labelKey: 'tabMining', icon: Blocks },
  { id: 'rsa', labelKey: 'tabRsa', icon: FileKey2 },
  { id: 'flashcards', labelKey: 'tabFlashcards', icon: BookOpenCheck },
  { id: 'project', labelKey: 'tabProject', icon: Network },
  { id: 'team', labelKey: 'tabTeam', icon: UsersRound },
]

export default function Navbar({ activeTab, onTabChange, onProjectInfo }: NavbarProps) {
  const language = useLanguage()
  const t = (key: keyof typeof translations.VN) => translations[language][key]
  const [logoUnavailable, setLogoUnavailable] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [lang, setLang] = useState<'VN' | 'EN'>(() => localStorage.getItem('hubblock-language') === 'EN' ? 'EN' : 'VN')

  useEffect(() => {
    document.getElementById('top')?.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang === 'VN' ? 'vi-VN' : 'en'
    localStorage.setItem('hubblock-language', lang)
    window.dispatchEvent(new CustomEvent('hubblock-language-change', { detail: lang }))
  }, [lang])

  return (
    <header className={`sticky top-0 z-50 w-full border-b px-4 py-3 backdrop-blur-xl sm:px-6 ${theme === 'dark' ? 'border-purple-900/40 bg-[#0d0b18]/95 shadow-lg shadow-purple-950/20' : 'border-slate-300/70 bg-slate-100/95'}`}>
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <a className="order-1 flex shrink-0 items-center gap-3" href="#top" aria-label={t('projectName')} onClick={() => onTabChange('home')}>
          <span className="grid size-10 place-items-center rounded-xl border border-purple-300/30 bg-white p-1.5 shadow-lg shadow-purple-950/30">
            <img src={hubLogo} alt="HUB" onError={() => setLogoUnavailable(true)} className={`h-full w-full object-contain ${logoUnavailable ? 'hidden' : ''}`} />
            {logoUnavailable && <span className="font-mono text-xs font-bold text-purple-700">HUB</span>}
          </span>
          <span className="leading-tight">
            <span className={`block text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>CHAIN<span className="text-rose-300">LAB</span></span>
            <span className="mt-0.5 block whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">{t('hubbLab')}</span>
          </span>
        </a>

        <nav className="order-3 flex basis-full flex-wrap items-center justify-center gap-1 rounded-xl border border-purple-900/30 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-md lg:order-2 lg:basis-auto lg:flex-1" aria-label={language === 'VN' ? 'Mô-đun mô phỏng' : 'Simulation modules'}>
          {tabs.map(({ id, labelKey, icon: Icon }) => {
            const selected = activeTab === id
            return <button key={id} type="button" onClick={() => onTabChange(id)} aria-current={selected ? 'page' : undefined} className={`relative flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${selected ? 'bg-gradient-to-r from-purple-600 to-pink-600 font-medium text-white shadow-md shadow-purple-500/25' : 'text-slate-400 hover:bg-white/[0.04] hover:text-rose-200'}`}><Icon size={14} /><span className="whitespace-nowrap">{t(labelKey)}</span></button>
          })}
        </nav>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3 lg:ml-0">
          <div aria-label={language === 'VN' ? 'Chọn ngôn ngữ' : 'Choose language'} className="flex items-center gap-0.5 rounded-lg border border-purple-900/40 bg-slate-900/80 p-1">
            {(['VN', 'EN'] as const).map((value) => <button key={value} type="button" aria-pressed={lang === value} onClick={() => setLang(value)} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${lang === value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{value}</button>)}
          </div>
          <button type="button" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={language === 'VN' ? 'Chuyển sang giao diện sáng' : 'Switch to light theme'} title={language === 'VN' ? 'Giao diện sáng' : 'Light theme'} className="grid size-9 place-items-center rounded-lg border border-purple-900/40 bg-slate-900/80 text-violet-200 transition-colors hover:border-violet-400/50 hover:bg-violet-500/10">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button type="button" onClick={onProjectInfo} aria-label={t('projectInfo')} title={t('projectInfo')} className="grid size-9 place-items-center rounded-lg border border-purple-900/40 bg-slate-900/80 text-slate-300 transition-colors hover:border-violet-400/50 hover:text-violet-200"><Info size={15} /></button>
        </div>
      </div>
    </header>
  )
}