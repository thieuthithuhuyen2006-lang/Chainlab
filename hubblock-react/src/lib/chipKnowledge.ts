import type { ModuleId } from '../Navbar'

export type ChipText = { vi: string; en: string }

export type ChipEntry = {
  id: string
  keywords: string[]
  question: ChipText
  answer: ChipText
  tab?: ModuleId
}

export type ChipCard = { id: number; category: string; question: string; answer: string; level?: string }

export const chipWebEntries: ChipEntry[] = [
  {
    id: 'web-overview',
    keywords: ['co những phần nào', 'co gi', 'giam gi', 'gioi thieu', 'noi dung', 'sections', 'modules', 'what can you'],
    question: { vi: 'Web này có những phần nào?', en: 'What sections does this web have?' },
    answer: {
      vi: 'Chainlab (HUB Blockchain Lab) có 7 module: Trang chủ (tổng quan), Băm (SHA-256), Đào (cấu trúc Block, Tamper test, đào nhiều ví, mạng P2P, PoS), RSA (mã hóa khóa công khai, ví ECDSA, chữ ký số, Merkle tree), Flashcards (ôn tập 116 thẻ), Dự án (mục tiêu và công nghệ) và Nhóm (giới thiệu nhóm).',
      en: 'Chainlab (HUB Blockchain Lab) has 7 modules: Home (overview), Hash (SHA-256), Mining (block structure, tamper test, multi-wallet mining, P2P network, PoS), RSA (public-key encryption, ECDSA wallet, digital signature, Merkle tree), Flashcards (116 cards), Project (goals and tech) and Team.',
    },
    tab: 'home',
  },
  {
    id: 'home-what',
    keywords: ['trang chu', 'home', 'tong quan', 'overview', 'bat dau', 'start'],
    question: { vi: 'Trang chủ dùng để làm gì?', en: 'What is the Home page for?' },
    answer: {
      vi: 'Trang chủ là tổng quan phòng lab: liệt kê 7 khu vực học tập và thông tin nền (chế độ mô phỏng, không kết nối ví hay mainnet thật). Bấm vào thẻ khu vực để mở module tương ứng.',
      en: 'The Home page is the lab overview: it lists the 7 learning areas and background info (simulation mode, no real wallet or mainnet connection). Click an area card to open that module.',
    },
    tab: 'home',
  },
  {
    id: 'hash-what',
    keywords: ['sha', 'sha-256', 'ham', 'bam', 'hash', 'digest', 'deterministic', 'avalanche', 'collision', 'xac dinh', 'tuyet doi'],
    question: { vi: 'Module Băm (SHA-256) dạy điều gì?', en: 'What does the Hash (SHA-256) module teach?' },
    answer: {
      vi: 'Module Băm cho bạn nhập văn bản và xem digest SHA-256 ngay, kèm 4 tính chất: xác định (cùng input → cùng hash), hiệu ứng avalanche (đổi 1 ký tự → hash khác hẳn), chống va chạm và đầu ra độ dài cố định 64 ký tự hex.',
      en: 'The Hash module lets you type text and see the SHA-256 digest instantly, with 4 properties: determinism (same input → same hash), avalanche effect (one character changes → totally different hash), collision resistance and a fixed 64-hex-character output.',
    },
    tab: 'hash',
  },
  {
    id: 'hash-use',
    keywords: ['sha', 'thử', 'thu', 'nhap', 'ky tu', 'doi chu', 'kieu', 'how', 'try'],
    question: { vi: 'Làm sao thử hiệu ứng avalanche trong module Băm?', en: 'How do I try the avalanche effect in the Hash module?' },
    answer: {
      vi: 'Ở module Băm: nhập một đoạn văn bản, bấm "Băm" để lấy hash; sửa đúng 1 ký tự rồi băm lại — bạn sẽ thấy hai hash gần như khác hoàn toàn, đó là hiệu ứng avalanche. Số bit khác nhau được đếm tự động.',
      en: 'In the Hash module: type some text, click "Hash" to get the digest; change exactly one character and hash again — the two digests become almost completely different. That is the avalanche effect, and the differing-bit count is shown automatically.',
    },
    tab: 'hash',
  },
  {
    id: 'mining-what',
    keywords: ['đào', 'dao', 'mining', 'block', 'cau truc', 'structure', 'tamper', 'pow', 'nonce', 'p2p', 'pos', 'dong thuan', 'worker'],
    question: { vi: 'Module Đào (Mining) gồm những gì?', en: 'What is inside the Mining module?' },
    answer: {
      vi: 'Module Đào là workbench 5 bước: (1) Cấu trúc Block V1/V2 với Merkle tree, (2) Sửa dữ liệu (Tamper test) để thấy chuỗi vỡ, (3) Khai thác nhiều ví trên Web Worker, (4) Mạng P2P mô phỏng lan truyền block, (5) Ethereum PoS với validator, attestation và slashing.',
      en: 'The Mining module is a 5-step workbench: (1) Block structure V1/V2 with a Merkle tree, (2) Tamper test to watch the chain break, (3) Multi-wallet mining on a Web Worker, (4) a simulated P2P network propagating blocks, (5) Ethereum PoS with validators, attestations and slashing.',
    },
    tab: 'mining',
  },
  {
    id: 'mining-use',
    keywords: ['đào', 'dao', 'block', 'the nao', 'lam sao', 'difficulty', 'độ khó', 'how', 'mine', 'remine', 're-mine'],
    question: { vi: 'Làm sao để đào block trong web?', en: 'How do I mine a block in this web?' },
    answer: {
      vi: 'Vào module Đào → bước "Khai thác nhiều ví": thêm giao dịch vào mempool, chọn độ khó (số số 0 đầu hex), bấm đào — Web Worker thử nonce cho tới khi hash đạt yêu cầu, block mới được nối vào chuỗi. Ở bước Tamper test, nút "Re-mine" đào lại các block phía sau để chuỗi hợp lệ trở lại.',
      en: 'Open the Mining module → "Multi-wallet mining": add transactions to the mempool, pick the difficulty (leading hex zeros), press mine — a Web Worker tries nonces until the hash qualifies, then the block is appended. In the Tamper test step, the "Re-mine" button re-mines following blocks to make the chain valid again.',
    },
    tab: 'mining',
  },
  {
    id: 'rsa-what',
    keywords: ['rsa', 'ma hoa', 'hoa', 'encrypt', 'chữ ký', 'chu ky', 'signature', 'ecdsa', 'vi', 'wallet', 'public', 'private', 'merkle', 'khóa', 'khoa'],
    question: { vi: 'Module RSA dạy điều gì?', en: 'What does the RSA module teach?' },
    answer: {
      vi: 'Module RSA có hai phần: mã hóa RSA với khóa công khai/riêng (minh họa ý tưởng encrypt/decrypt) và phần Chữ ký & Merkle: sinh ví ECDSA P-256 ngay trong trình duyệt, ký giao dịch, verify chữ ký, cùng cây Merkle với chứng minh SPV (kèm demo CVE-2012-2459 về nhân đôi nút lẻ).',
      en: 'The RSA module has two parts: RSA encryption with a public/private key pair (illustrating encrypt/decrypt) and the Signature & Merkle part: generate an ECDSA P-256 wallet right in the browser, sign a transaction, verify it, plus a Merkle tree with SPV proofs (including the CVE-2012-2459 odd-node duplication demo).',
    },
    tab: 'rsa',
  },
  {
    id: 'rsa-use',
    keywords: ['ví', 'vi', 'wallet', 'ky', 'sign', 'chữ ký', 'chu ky', 'tao', 'generate', 'ecdsa', 'address', 'địa chỉ', 'dia chi'],
    question: { vi: 'Tạo ví và ký giao dịch thế nào?', en: 'How do I create a wallet and sign a transaction?' },
    answer: {
      vi: 'Ở module RSA → phần "Wallet keypair": bấm "Generate wallet" để sinh khóa ECDSA P-256 và địa chỉ ví; nhập ví nhận và số tiền rồi bấm "Ký giao dịch"; cuối cùng bấm "Verify signature" để kiểm tra chữ ký. Private key chỉ nằm trong bộ nhớ trình duyệt của bạn.',
      en: 'In the RSA module → "Wallet keypair": click "Generate wallet" to create a P-256 ECDSA key pair and address; enter receiver and amount, then click "Sign transaction"; finally click "Verify signature" to check it. The private key only lives in your browser memory.',
    },
    tab: 'rsa',
  },
  {
    id: 'flashcards-what',
    keywords: ['flashcard', 'the', 'hoc', 'on tap', 'de thuong', 'trac nghiem', 'card', 'review', '116'],
    question: { vi: 'Flashcards hoạt động ra sao?', en: 'How do the Flashcards work?' },
    answer: {
      vi: 'Flashcards là bộ 116 thẻ câu hỏi–đáp án về blockchain, chia theo chủ đề (Mật mã học, Cấu trúc Block, Ethereum & DApp, Đồng thuận PoS, Merkle & Mining, Tài sản số...) và 3 cấp độ. Bạn bấm xem đáp án rồi tự đánh giá "Cần học lại" hoặc "Đã thuộc"; hệ thống Leitner 3 hộp sẽ ưu tiên thẻ yếu, kèm huy hiệu và mục tiêu mỗi ngày.',
      en: 'Flashcards is a deck of 116 blockchain Q&A cards grouped by topic (Cryptography, Block structure, Ethereum & DApps, PoS consensus, Merkle & Mining, Digital assets...) and 3 levels. Reveal the answer, then rate "Need review" or "Got it"; a 3-box Leitner system prioritizes weak cards, with badges and a daily goal.',
    },
    tab: 'flashcards',
  },
  {
    id: 'project-what',
    keywords: ['du an', 'project', 'muc tieu', 'goals', 'kien truc', 'architecture', 'công nghệ', 'cong nghe', 'tech'],
    question: { vi: 'Phần Dự án nói về gì?', en: 'What is the Project section about?' },
    answer: {
      vi: 'Phần Dự án trình bày mục tiêu học tập, kiến trúc của Chainlab (React + Vite, Web Worker, WebCrypto, mô phỏng cục bộ) và công nghệ sử dụng. Nó giải thích vì sao web là mô phỏng giáo dục, không phải blockchain thật.',
      en: 'The Project section covers the learning goals, Chainlab\'s architecture (React + Vite, Web Worker, WebCrypto, local simulation) and the tech stack. It explains why the web is an educational simulation, not a real blockchain.',
    },
    tab: 'project',
  },
  {
    id: 'team-what',
    keywords: ['nhom', 'team', 'giang vien', 'giao vien', 'sv', 'sinh vien', 'member', 'ai lam', 'who', 'web'],
    question: { vi: 'Ai đã làm ra web này?', en: 'Who built this web?' },
    answer: {
      vi: 'Phần Nhóm giới thiệu giảng viên hướng dẫn và các thành viên nhóm HUB (Khoa Khoa học dữ liệu trong kinh doanh) thực hiện Chainlab.',
      en: 'The Team section introduces the faculty advisor and the HUB group members (Faculty of Data Science in Business) who built Chainlab.',
    },
    tab: 'team',
  },
  {
    id: 'reality-check',
    keywords: ['khac', 'thuc te', 'thật', 'reality', 'giong', 'khong giong', 'gii thieu', 'mo phong', 'simulation', 'khác gì'],
    question: { vi: 'Web này khác gì blockchain thật?', en: 'How is this web different from a real blockchain?' },
    answer: {
      vi: 'Cuộn xuống cuối các trang, mục "Khác gì so với thực tế?" liệt kê từng điểm mô phỏng: SHA-256 một lần thay vì double-SHA256, độ khó cố định, không phí giao dịch, không phần thưởng halving, một trình duyệt thay vì mạng P2P thật, validator không cần 32 ETH, EVM đơn giản hóa... Đây là điểm mình khuyên đọc để không hiểu nhầm.',
      en: 'At the bottom of most pages, the "Reality check" section lists every simplification: single SHA-256 instead of double-SHA256, fixed difficulty, no transaction fees, no halving, one browser instead of a real P2P network, validators without 32 ETH, a simplified EVM... Worth reading so you don\'t get the wrong idea.',
    },
  },
  {
    id: 'language-theme',
    keywords: ['ngon ngu', 'language', 'tieng anh', 'tieng viet', 'doi', 'switch', 'sang', 'toi', 'theme', 'dark', 'light', 'giao dien'],
    question: { vi: 'Đổi ngôn ngữ và giao diện sáng/tối ở đâu?', en: 'Where do I switch language and light/dark theme?' },
    answer: {
      vi: 'Góc trên bên phải có nút VN/EN để đổi ngôn ngữ (chọn VN thì toàn tiếng Việt, chọn EN thì toàn tiếng Anh) và nút mặt trời/mặt trăng để chuyển giao diện sáng/tối. Cả hai đều được nhớ trên máy bạn.',
      en: 'Top-right corner: the VN/EN buttons switch language (VN shows only Vietnamese, EN only English) and the sun/moon button toggles the light/dark theme. Both preferences are remembered on your device.',
    },
  },
]

const CARD_FILES = ['flashcards.json', 'flashcards-extra-1.json', 'flashcards-extra-2.json', 'flashcards-extra-3.json', 'flashcards-extra-4.json', 'flashcards-extra-5.json', 'flashcards-extra-6.json']

function isChipCardList(value: unknown): value is ChipCard[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    const card = item as Partial<ChipCard>
    return typeof card.id === 'number' && typeof card.question === 'string' && typeof card.answer === 'string'
  })
}

export async function loadChipCards(): Promise<ChipEntry[]> {
  const base = typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/'
  const responses = await Promise.allSettled(CARD_FILES.map((file) => fetch(`${base}${file}`)))
  const cards: ChipEntry[] = []
  for (const result of responses) {
    if (result.status !== 'fulfilled' || !result.value.ok) continue
    let data: unknown
    try {
      data = await result.value.json()
    } catch {
      continue
    }
    if (!isChipCardList(data)) continue
    for (const card of data) {
      cards.push({
        id: `card-${card.id}`,
        keywords: [card.category],
        question: { vi: card.question, en: card.question },
        answer: { vi: card.answer, en: card.answer },
      })
    }
  }
  return cards
}
