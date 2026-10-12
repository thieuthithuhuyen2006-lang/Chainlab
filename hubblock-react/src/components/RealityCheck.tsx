import { useState } from 'react'
import { ChevronDown, ShieldCheck, AlertCircle, Cpu, Network, Database, Lock, FileText, HelpCircle } from 'lucide-react'
import { translations, type TranslationKey } from '../lib/i18n'
import { useLanguage } from '../lib/useLanguage'

const realityChecks = {
  vn: [
    {
      id: 'hash-block',
      title: 'Hash & Block',
      icon: ShieldCheck,
      items: [
        'Bitcoin băm SHA-256 <strong>hai lần</strong> trên header 80 byte (double-SHA256); demo dùng một lần SHA-256 trên chuỗi nối có dấu "|".',
        'Bitcoin điều chỉnh target mỗi <strong>2016 block</strong> (~2 tuần) để giữ 10 phút/block; demo dùng độ khó cố định (số ký tự 0 hex đầu).',
        'Merkle root Bitcoin: băm theo <strong>byte raw</strong> của giao dịch; demo nối chuỗi hex của hash giao dịch.',
        'Merkle tree nhân đôi nút lẻ cuối (Bitcoin style) — quy tắc này là cơ chế của CVE-2012-2459 (xem thẻ Merkle).',
      ],
    },
    {
      id: 'mining',
      title: 'Mining (PoW)',
      icon: Cpu,
      items: [
        'Không có <strong>phí giao dịch</strong> (transaction fees) — miner chỉ nhận block reward mô phỏng.',
        'Không có <strong>halving</strong> — reward cố định 0.01 ETH mô phỏng mỗi block.',
        'Chỉ <strong>một trình duyệt</strong> (không P2P thật) — hashPower là mô phỏng cục bộ, không phải hashrate mạng.',
        'Nonce không gian tìm kiếm nhỏ — difficulty 3–5 hex 0 (demo); Bitcoin thực tế ~19–20 byte 0 đầu.',
      ],
    },
    {
      id: 'pos',
      title: 'Proof of Stake',
      icon: Network,
      items: [
        'Validator thật cần <strong>tối thiểu 32 ETH</strong> để kích hoạt; demo dùng số nhỏ (8–32 ETH) cho dễ quan sát.',
        'Mỗi slot có <strong>ủy ban chứng thực lớn</strong> (committee) ngẫu nhiên; demo dùng tất cả validator hoạt động.',
        'Finality thật cần <strong>~2 epoch (~12,8 phút)</strong> theo Casper FFG; demo "included" = block đã attest ≥2/3 stake và thêm vào chuỗi cục bộ.',
        'RANDAO và slashing được <strong>đơn giản hóa</strong>: thực tế có phạt tương quan (proportional), buộc rời mạng, inactivity leak.',
      ],
    },
    {
      id: 'signatures',
      title: 'Chữ ký & Địa chỉ',
      icon: Lock,
      items: [
        'Bitcoin/Ethereum dùng <strong>secp256k1</strong>; Ethereum lấy địa chỉ từ Keccak-256(publicKey)[12:].',
        'Demo dùng <strong>P-256 + SHA-256</strong> vì WebCrypto không hỗ trợ secp256k1 native.',
        'RSA <strong>hầu như không dùng</strong> trong blockchain; chỉ để minh họa khóa công khai/riêng.',
      ],
    },
    {
      id: 'contracts',
      title: 'Smart Contracts',
      icon: FileText,
      items: [
        'Không phải <strong>EVM thật</strong> — không có gas, không biên dịch bytecode, không lỗi kiểu reentrancy.',
        'ERC-20/721 được <strong>rút gọn cực đại</strong>: chỉ transfer, mint, burn, balanceOf, ownerOf.',
        'Không có storage trie, không có delegatecall, không có CREATE2, không có precompiles.',
      ],
    },
    {
      id: 'merkle',
      title: 'Merkle Tree',
      icon: Database,
      items: [
        'Bitcoin nhân đôi nút lẻ cuối (CVE-2012-2459); demo làm theo cùng cách.',
        'Bitcoin băm Merkle theo <strong>byte little-endian</strong>; demo nối chuỗi hex big-endian.',
        'Proof verification dùng đường đi sibling hashes — chuẩn Bitcoin SPV.',
      ],
    },
    {
      id: 'wallet-address',
      title: 'Địa chỉ ví đào (1.7)',
      icon: HelpCircle,
      items: [
        'Địa chỉ ví đào hiện tại là <strong>địa chỉ mô phỏng</strong> (sha256(tên)), chưa derive từ public key.',
        'Thực tế: Ethereum = keccak256(publicKey)[12:], Bitcoin = RIPEMD160(SHA256(publicKey)).',
      ],
    },
  ],
  en: [
    {
      id: 'hash-block',
      title: 'Hash & Block',
      icon: ShieldCheck,
      items: [
        'Bitcoin uses <strong>double-SHA256</strong> on 80-byte header; demo uses single SHA-256 on pipe-separated string.',
        'Bitcoin retargets difficulty every <strong>2016 blocks</strong> (~2 weeks) to keep 10 min/block; demo uses fixed difficulty (leading hex zeros).',
        'Bitcoin Merkle root hashes <strong>raw transaction bytes</strong>; demo concatenates hex transaction hashes.',
        'Merkle tree duplicates last odd node (Bitcoin style) — this rule is the mechanism behind CVE-2012-2459 (see Merkle tab).',
      ],
    },
    {
      id: 'mining',
      title: 'Mining (PoW)',
      icon: Cpu,
      items: [
        'No <strong>transaction fees</strong> — miners only receive simulated block reward.',
        'No <strong>halving</strong> — fixed 0.01 ETH reward per block.',
        'Single <strong>browser only</strong> (no real P2P) — hashPower is local simulation, not network hashrate.',
        'Small nonce search space — difficulty 3–5 hex zeros (demo); Bitcoin mainnet ~19–20 leading zero bytes.',
      ],
    },
    {
      id: 'pos',
      title: 'Proof of Stake',
      icon: Network,
      items: [
        'Real validators need <strong>minimum 32 ETH</strong> to activate; demo uses small amounts (8–32 ETH) for observability.',
        'Each slot has a <strong>large random committee</strong>; demo uses all active validators.',
        'Real finality requires <strong>~2 epochs (~12.8 min)</strong> per Casper FFG; demo "included" = block attested ≥2/3 stake and appended locally.',
        'RANDAO and slashing are <strong>simplified</strong>: real Ethereum has proportional penalties, forced exit, inactivity leak.',
      ],
    },
    {
      id: 'signatures',
      title: 'Signatures & Addresses',
      icon: Lock,
      items: [
        'Bitcoin/Ethereum use <strong>secp256k1</strong>; Ethereum address = Keccak-256(publicKey)[12:].',
        'Demo uses <strong>P-256 + SHA-256</strong> because WebCrypto lacks native secp256k1 support.',
        '<strong>RSA is virtually unused</strong> in blockchain; included only for public/private key illustration.',
      ],
    },
    {
      id: 'contracts',
      title: 'Smart Contracts',
      icon: FileText,
      items: [
        'Not a real <strong>EVM</strong> — no gas, no bytecode compilation, no reentrancy vulnerabilities.',
        'ERC-20/721 are <strong>highly simplified</strong>: only transfer, mint, burn, balanceOf, ownerOf.',
        'No storage trie, no delegatecall, no CREATE2, no precompiles.',
      ],
    },
    {
      id: 'merkle',
      title: 'Merkle Tree',
      icon: Database,
      items: [
        'Bitcoin duplicates last odd node (CVE-2012-2459); demo follows same rule.',
        'Bitcoin hashes Merkle in <strong>little-endian bytes</strong>; demo concatenates big-endian hex strings.',
        'Proof verification uses sibling hash path — standard Bitcoin SPV.',
      ],
    },
    {
      id: 'wallet-address',
      title: 'Miner Wallet Address (1.7)',
      icon: HelpCircle,
      items: [
        'Current miner address is a <strong>simulated address</strong> (sha256(name)), not derived from public key.',
        'Real: Ethereum = keccak256(publicKey)[12:], Bitcoin = RIPEMD160(SHA256(publicKey)).',
      ],
    },
  ],
}

export default function RealityCheck() {
  const language = useLanguage()
  const t = (key: TranslationKey) => translations[language][key]
  const [openSections, setOpenSections] = useState<string[]>([])

  const toggle = (id: string) => {
    setOpenSections((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const content = realityChecks[language === 'VN' ? 'vn' : 'en']

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.07] text-amber-300">
            <AlertCircle size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t('realityCheckTitle') || 'Khác gì so với thực tế?'}</h3>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">
              {t('realityCheckSubtitle') || 'Lưu ý: đây là mô phỏng giáo dục, không phải blockchain thật'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpenSections(openSections.length === content.length ? [] : content.map((c) => c.id))}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-[9px] font-semibold text-slate-200 transition hover:border-amber-300/50"
        >
          {openSections.length === content.length ? t('collapseAll') : t('expandAll')}
        </button>
      </header>
      <div className="divide-y divide-slate-800/80 px-4 sm:px-6">
        {content.map((section) => {
          const isOpen = openSections.includes(section.id)
          const Icon = section.icon
          return (
            <details key={section.id} open={isOpen} onToggle={() => toggle(section.id)} className="py-3">
              <summary className="flex items-center gap-3 cursor-pointer list-none">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300">
                  <Icon size={15} />
                </span>
                <strong className="text-xs font-semibold text-slate-100">{section.title}</strong>
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[8px] text-slate-500">
                  <ChevronDown size={12} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </span>
              </summary>
              <div className="ml-11 mt-3 space-y-2 text-[9px] leading-5 text-slate-300">
                {section.items.map((item, idx) => (
                  <p key={idx} className="flex gap-2" dangerouslySetInnerHTML={{ __html: `• ${item}` }} />
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}