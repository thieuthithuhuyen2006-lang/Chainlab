import { useState } from 'react'
import { Lightbulb, Target, Flag, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { translations, type TranslationKey } from '../lib/i18n'
import { useLanguage } from '../lib/useLanguage'

const learningGoals = {
  vn: [
    {
      id: 'goal1',
      type: 'goal',
      icon: Target,
      title: 'Mục tiêu 1: Cấu trúc block & Merkle',
      description: 'Hiểu cấu trúc block, Merkle root và cách hash liên kết dữ liệu thành chuỗi bất biến.',
    },
    {
      id: 'goal2',
      type: 'goal',
      icon: Flag,
      title: 'Mục tiêu 2: PoW/PoS bảo vệ chuỗi',
      description: 'Biết cách Proof-of-Work và Proof-of-Stake bảo vệ tính toàn vẹn và sự đồng thuận.',
    },
    {
      id: 'goal3',
      type: 'goal',
      icon: Lightbulb,
      title: 'Mục tiêu 3: Mô phỏng vs Thực tế',
      description: 'Nhận diện các điểm khác biệt chính giữa mô phỏng giáo dục và blockchain production.',
    },
    {
      id: 'challenge1',
      type: 'challenge',
      icon: HelpCircle,
      title: 'Thử thách 1: Sửa giao dịch block 1',
      description: 'Sửa một giao dịch ở block 1: giải thích vì sao block 2 và 3 cũng thành không hợp lệ.',
      hint: 'Hash của block 1 thay đổi → previousHash của block 2 không khớp → block 2 hash thay đổi → previousHash của block 3 không khớp → cascade failure.',
    },
    {
      id: 'challenge2',
      type: 'challenge',
      icon: HelpCircle,
      title: 'Thử thách 2: Dự đoán số lần thử PoW',
      description: 'Tìm nonce cho block difficulty=4: dự đoán số lần thử kỳ vọng.',
      hint: 'Mỗi hex char có 16 giá trị. Difficulty=4 nghĩa là 4 ký tự 0 hex đầu = 16^4 = 65,536 lần thử trung bình.',
    },
    {
      id: 'challenge3',
      type: 'challenge',
      icon: HelpCircle,
      title: 'Thử thách 3: UTXO vs Account',
      description: 'So sánh UTXO vs Account model cho cùng một tập giao dịch.',
      hint: 'UTXO: đầu vào = tập UTXO chưa chi, đầu ra = UTXO mới. Account: trừ/cộng balance trực tiếp. UTXO song song tốt hơn; Account dễ hiểu hơn.',
    },
  ],
  en: [
    {
      id: 'goal1',
      type: 'goal',
      icon: Target,
      title: 'Goal 1: Block structure & Merkle',
      description: 'Understand block structure, Merkle root, and how hashes link data into an immutable chain.',
    },
    {
      id: 'goal2',
      type: 'goal',
      icon: Flag,
      title: 'Goal 2: PoW/PoS chain protection',
      description: 'Know how Proof-of-Work and Proof-of-Stake protect chain integrity and consensus.',
    },
    {
      id: 'goal3',
      type: 'goal',
      icon: Lightbulb,
      title: 'Goal 3: Simulation vs Reality',
      description: 'Identify key differences between educational simulation and production blockchain.',
    },
    {
      id: 'challenge1',
      type: 'challenge',
      icon: HelpCircle,
      title: 'Challenge 1: Modify tx in block 1',
      description: 'Modify a transaction in block 1: explain why blocks 2 and 3 also become invalid.',
      hint: 'Block 1 hash changes → block 2 previousHash mismatch → block 2 hash changes → block 3 previousHash mismatch → cascade failure.',
    },
    {
      id: 'challenge2',
      type: 'challenge',
      icon: HelpCircle,
      title: 'Challenge 2: Predict PoW attempts',
      description: 'Find nonce for block difficulty=4: predict expected attempts.',
      hint: 'Each hex char has 16 values. Difficulty=4 means 4 leading hex zeros = 16^4 = 65,536 average attempts.',
    },
    {
      id: 'challenge3',
      type: 'challenge',
      icon: HelpCircle,
      title: 'Challenge 3: UTXO vs Account',
      description: 'Compare UTXO vs Account model for the same transaction set.',
      hint: 'UTXO: inputs = unspent UTXOs, outputs = new UTXOs. Account: direct balance add/subtract. UTXO better parallelism; Account simpler.',
    },
  ],
}

export default function LearningGoals() {
  const language = useLanguage()
  const t = (key: TranslationKey) => translations[language][key]
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({})

  const content = learningGoals[language === 'VN' ? 'vn' : 'en']

  const toggleHint = (id: string) => {
    setOpenHints((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-300">
            <Lightbulb size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t('learningGoalsTitle')}</h3>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">{t('learningGoalsSubtitle')}</p>
          </div>
        </div>
      </header>
      <div className="divide-y divide-slate-800/80 px-4 sm:px-6">
        {content.map((item) => {
          const isOpen = openHints[item.id]
          const Icon = item.icon
          return (
            <article key={item.id} className="py-4">
              <div className="flex items-start gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                  item.type === 'goal' ? 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-300' : 'border-sky-300/20 bg-sky-300/[0.07] text-sky-300'
                }`}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className={`block text-xs font-semibold ${item.type === 'goal' ? 'text-emerald-200' : 'text-sky-200'}`}>{item.title}</strong>
                  <p className="mt-1 text-[9px] leading-5 text-slate-300">{item.description}</p>
                  {item.hint && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleHint(item.id)}
                        className="inline-flex items-center gap-1.5 text-[8px] font-semibold text-amber-200 hover:text-amber-100 transition"
                      >
                        {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {isOpen ? t('hideHint') : t('showHint')}
                      </button>
                      <div className="mt-2 ml-5 rounded-md border border-amber-300/20 bg-amber-300/[0.05] p-2.5 text-[8px] leading-5 text-amber-200/90">
                        {item.hint}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}