import { useEffect, useState } from 'react'
import { BookOpenCheck, Blocks, FileKey2, Fingerprint, Home, Info, Moon, Network, Sun, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ModuleId = 'home' | 'hash' | 'mining' | 'rsa' | 'flashcards' | 'project' | 'team'

type TabDefinition = { id: ModuleId; label: string; icon: LucideIcon }
type NavbarProps = { activeTab: ModuleId; onTabChange: (tab: ModuleId) => void; onProjectInfo: () => void }

const tabs: TabDefinition[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'hash', label: 'Hash Demo', icon: Fingerprint },
  { id: 'mining', label: 'Mining', icon: Blocks },
  { id: 'rsa', label: 'RSA Crypto', icon: FileKey2 },
  { id: 'flashcards', label: 'Flashcards', icon: BookOpenCheck },
  { id: 'project', label: 'Project', icon: Network },
  { id: 'team', label: 'Team', icon: UsersRound },
]

export default function Navbar({ activeTab, onTabChange, onProjectInfo }: NavbarProps) {
  const [logoUnavailable, setLogoUnavailable] = useState(false)
  const [avatarUnavailable, setAvatarUnavailable] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [language, setLanguage] = useState<'VN' | 'VI'>(() => localStorage.getItem('hubblock-language') === 'VN' ? 'VN' : 'VI')

  useEffect(() => {
    document.getElementById('top')?.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language === 'VN' ? 'vi-VN' : 'vi'
    localStorage.setItem('hubblock-language', language)
  }, [language])

  return (
    <header className={`sticky top-0 z-50 w-full border-b px-4 py-3 backdrop-blur-xl sm:px-6 ${theme === 'dark' ? 'border-purple-900/40 bg-[#0d0b18]/95 shadow-lg shadow-purple-950/20' : 'border-slate-300/70 bg-slate-100/95'}`}>
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <a className="order-1 flex shrink-0 items-center gap-3" href="#top" aria-label="CHAINLAB trang chủ" onClick={() => onTabChange('home')}>
          <span className="grid size-10 place-items-center rounded-xl border border-purple-300/30 bg-white p-1.5 shadow-lg shadow-purple-950/30">
            <img src="/hub-logo.png" alt="HUB" onError={() => setLogoUnavailable(true)} className={`h-full w-full object-contain ${logoUnavailable ? 'hidden' : ''}`} />
            {logoUnavailable && <span className="font-mono text-xs font-bold text-purple-700">HUB</span>}
          </span>
          <span className="leading-tight">
            <span className={`block text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>CHAIN<span className="text-rose-300">LAB</span></span>
            <span className="mt-0.5 block whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">HUB BLOCKCHAIN LAB</span>
          </span>
        </a>

        <nav className="order-3 flex basis-full flex-wrap items-center justify-center gap-1 rounded-xl border border-purple-900/30 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-md lg:order-2 lg:basis-auto lg:flex-1" aria-label="Mô-đun mô phỏng">
          {tabs.map(({ id, label, icon: Icon }) => {
            const selected = activeTab === id
            return <button key={id} type="button" onClick={() => onTabChange(id)} aria-current={selected ? 'page' : undefined} className={`relative flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${selected ? 'bg-gradient-to-r from-purple-600 to-pink-600 font-medium text-white shadow-md shadow-purple-500/25' : 'text-slate-400 hover:bg-white/[0.04] hover:text-rose-200'}`}><Icon size={14} /><span className="whitespace-nowrap">{label}</span></button>
          })}
        </nav>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3 lg:ml-0">
          <div aria-label="Chọn ngôn ngữ" className="flex items-center gap-0.5 rounded-lg border border-purple-900/40 bg-slate-900/80 p-1">
            {(['VN', 'VI'] as const).map((value) => <button key={value} type="button" aria-pressed={language === value} onClick={() => setLanguage(value)} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${language === value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{value}</button>)}
          </div>
          <button type="button" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'} className="grid size-9 place-items-center rounded-lg border border-purple-900/40 bg-slate-900/80 text-violet-200 transition-colors hover:border-violet-400/50 hover:bg-violet-500/10">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <div className="flex items-center gap-2 rounded-full border border-rose-300/20 bg-slate-900/80 px-2 py-1">
            {avatarUnavailable ? <span aria-label="Avatar Huyền" className="grid size-8 place-items-center rounded-full border border-rose-300/40 bg-gradient-to-br from-violet-500/50 to-pink-500/50 font-mono text-[10px] font-bold text-white">TH</span> : <img src="/huyen-avatar.svg" alt="Avatar Huyền" onError={() => setAvatarUnavailable(true)} className="size-8 rounded-full border border-rose-300/30 object-cover" />}
            <span className="pr-1 text-sm font-medium text-slate-200">Huyền</span>
          </div>
          <button type="button" onClick={onProjectInfo} aria-label="Thông tin dự án" title="Thông tin dự án" className="grid size-9 place-items-center rounded-lg border border-purple-900/40 bg-slate-900/80 text-slate-300 transition-colors hover:border-violet-400/50 hover:text-violet-200"><Info size={15} /></button>
        </div>
      </div>
    </header>
  )
}