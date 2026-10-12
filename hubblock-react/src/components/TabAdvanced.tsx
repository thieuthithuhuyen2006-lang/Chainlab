import { useMemo, useState } from 'react'
import { Activity, Coins, GitFork, Layers } from 'lucide-react'
import { attackSuccessProbability, difficultyRetarget, selectForBlock, selectUtxos, type MempoolTx, type Utxo } from '../lib/advanced'
import { translations, type TranslationKey } from '../lib/i18n'
import { useLanguage } from '../lib/useLanguage'
import LearningGoals from './LearningGoals'

function Card({ icon: Icon, tone, title, subtitle, children }: { icon: typeof Activity; tone: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-4">
      <header className="mb-3 flex items-center gap-3">
        <span className={`grid size-9 place-items-center rounded-lg border ${tone}`}><Icon size={16} /></span>
        <div><h3 className="text-sm font-semibold text-slate-100">{title}</h3><p className="mt-0.5 text-xs text-slate-400">{subtitle}</p></div>
      </header>
      {children}
    </section>
  )
}

export default function TabAdvanced() {
  const language = useLanguage()
  const t = (key: TranslationKey) => translations[language][key]
  const [attackerRatio, setAttackerRatio] = useState(0.3)
  const [confirmations, setConfirmations] = useState(3)
  const [actualTime, setActualTime] = useState(1209600)
  const [targetTime, setTargetTime] = useState(1209600)
  const [currentDifficulty, setCurrentDifficulty] = useState(100)

  const attackProbability = attackSuccessProbability(attackerRatio, confirmations)
  const newDifficulty = difficultyRetarget(currentDifficulty, actualTime, targetTime)
  const difficultyChange = currentDifficulty > 0 ? ((newDifficulty - currentDifficulty) / currentDifficulty) * 100 : 0

  const mempoolTxs = useMemo<MempoolTx[]>(() => [
    { id: 'tx-a', fee: 250, vbytes: 250 },
    { id: 'tx-b', fee: 500, vbytes: 100 },
    { id: 'tx-c', fee: 180, vbytes: 200 },
    { id: 'tx-d', fee: 900, vbytes: 300 },
    { id: 'tx-e', fee: 120, vbytes: 150 },
  ], [])
  const blockSelection = useMemo(() => selectForBlock(mempoolTxs, 400), [mempoolTxs])

  const utxos = useMemo<Utxo[]>(() => [
    { txId: 'u1', amount: 0.5 },
    { txId: 'u2', amount: 2.0 },
    { txId: 'u3', amount: 0.25 },
    { txId: 'u4', amount: 1.0 },
  ], [])
  const utxoSelection = useMemo(() => selectUtxos(utxos, 1.5), [utxos])

  return <div className="space-y-4" aria-label={t('advTitle')}>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card icon={Activity} tone="border-rose-300/20 bg-rose-300/[0.07] text-rose-300" title={t('adv51Title')} subtitle={t('adv51Desc')}>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-300">{t('adv51Attacker')}: {(attackerRatio * 100).toFixed(0)}%</span>
            <input type="range" min="0" max="0.95" step="0.05" value={attackerRatio} onChange={(event) => setAttackerRatio(Number(event.target.value))} className="w-full accent-rose-400" aria-label={t('adv51Attacker')} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-300">{t('adv51Confirmations')}: {confirmations}</span>
            <input type="range" min="0" max="20" step="1" value={confirmations} onChange={(event) => setConfirmations(Number(event.target.value))} className="w-full accent-rose-400" aria-label={t('adv51Confirmations')} />
          </label>
          <div className={`rounded-md border p-3 ${attackProbability > 0.05 ? 'border-rose-400/40 bg-[#24151d]' : 'border-emerald-300/25 bg-[#101f1b]'}`}>
            <span className="block text-xs text-slate-300">{t('adv51Probability')}</span>
            <span className={`mt-1 block text-2xl font-bold font-mono ${attackProbability > 0.05 ? 'text-rose-200' : 'text-emerald-200'}`}>{(attackProbability * 100).toFixed(4)}%</span>
            <span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${attackProbability > 0.05 ? 'text-rose-200' : 'text-emerald-200'}`}>{attackProbability > 0.05 ? t('adv51Risky') : t('adv51Safe')}</span>
          </div>
          <p className="text-[10px] leading-4 text-slate-400">{t('adv51Note')}</p>
        </div>
      </Card>

      <Card icon={GitFork} tone="border-violet-300/20 bg-violet-300/[0.07] text-violet-300" title={t('advDifficultyTitle')} subtitle={t('advDifficultyDesc')}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] text-slate-400">{t('advDifficultyCurrent')}</span>
              <input type="number" min="1" value={currentDifficulty} onChange={(event) => setCurrentDifficulty(Math.max(1, Number(event.target.value)))} className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-200" aria-label={t('advDifficultyCurrent')} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-slate-400">{t('advDifficultyActual')}</span>
              <input type="number" min="1" value={actualTime} onChange={(event) => setActualTime(Math.max(1, Number(event.target.value)))} className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-200" aria-label={t('advDifficultyActual')} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-slate-400">{t('advDifficultyTarget')}</span>
              <input type="number" min="1" value={targetTime} onChange={(event) => setTargetTime(Math.max(1, Number(event.target.value)))} className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-200" aria-label={t('advDifficultyTarget')} />
            </label>
          </div>
          <div className="rounded-md border border-violet-300/25 bg-[#1a1024] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">{t('advDifficultyNew')}</span>
              <span className="font-mono text-lg font-bold text-violet-200">{newDifficulty.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-300">{t('advDifficultyChange')}</span>
              <span className={`font-mono text-xs font-semibold ${difficultyChange > 0 ? 'text-emerald-300' : difficultyChange < 0 ? 'text-rose-300' : 'text-slate-300'}`}>{difficultyChange > 0 ? '+' : ''}{difficultyChange.toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-[10px] leading-4 text-slate-400">{t('advDifficultyNote')}</p>
        </div>
      </Card>

      <Card icon={Coins} tone="border-amber-300/20 bg-amber-300/[0.07] text-amber-300" title={t('advMempoolTitle')} subtitle={t('advMempoolDesc')}>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span>Tx</span><span className="text-right">{t('advMempoolFeeRate')}</span><span className="text-right">{t('advMempoolSelected')}</span></div>
          {mempoolTxs.map((tx) => {
            const selected = blockSelection.selected.some((item) => item.id === tx.id)
            const rate = tx.vbytes > 0 ? tx.fee / tx.vbytes : 0
            return (
              <div key={tx.id} className={`grid grid-cols-3 items-center gap-2 rounded-md border px-2 py-1.5 font-mono text-xs ${selected ? 'border-amber-300/30 bg-amber-300/[0.05]' : 'border-slate-800 bg-slate-950/50'}`}>
                <span className="text-slate-200">{tx.id}</span>
                <span className="text-right text-amber-200">{rate.toFixed(2)}</span>
                <span className={`text-right font-semibold ${selected ? 'text-emerald-300' : 'text-slate-500'}`}>{selected ? '✓' : '—'}</span>
              </div>
            )
          })}
          <div className="mt-1 flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-2 py-2">
            <span className="text-xs text-slate-300">{t('advMempoolTotalFee')}</span>
            <span className="font-mono text-xs font-bold text-amber-200">{blockSelection.totalFee} sat</span>
          </div>
          <p className="text-[10px] leading-4 text-slate-400">{t('advMempoolNote')}</p>
        </div>
      </Card>

      <Card icon={Layers} tone="border-sky-300/20 bg-sky-300/[0.07] text-sky-300" title={t('advUtxoTitle')} subtitle={t('advUtxoDesc')}>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span>UTXO</span><span className="text-right">Amount</span><span className="text-right">{t('advUtxoSelected')}</span></div>
          {utxos.map((utxo) => {
            const selected = utxoSelection.selected.some((item) => item.txId === utxo.txId)
            return (
              <div key={utxo.txId} className={`grid grid-cols-3 items-center gap-2 rounded-md border px-2 py-1.5 font-mono text-xs ${selected ? 'border-sky-300/30 bg-sky-300/[0.05]' : 'border-slate-800 bg-slate-950/50'}`}>
                <span className="text-slate-200">{utxo.txId}</span>
                <span className="text-right text-sky-200">{utxo.amount.toFixed(2)} BTC</span>
                <span className={`text-right font-semibold ${selected ? 'text-emerald-300' : 'text-slate-500'}`}>{selected ? '✓' : '—'}</span>
              </div>
            )
          })}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-2">
              <span className="block text-[10px] text-slate-400">{t('advUtxoTotal')}</span>
              <span className="font-mono text-xs font-bold text-sky-200">{utxoSelection.total.toFixed(2)} BTC</span>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-2">
              <span className="block text-[10px] text-slate-400">{t('advUtxoChange')}</span>
              <span className="font-mono text-xs font-bold text-emerald-200">{utxoSelection.change.toFixed(2)} BTC</span>
            </div>
          </div>
          <p className="text-[10px] leading-4 text-slate-400">{t('advUtxoNote')}</p>
        </div>
      </Card>
    </div>
    <LearningGoals />
  </div>
}
