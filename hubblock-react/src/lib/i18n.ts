export type TranslationKey =
  | 'appTitle'
  | 'appSubtitle'
  | 'exploreBlockchain'
  | 'throughExperiments'
  | 'interactiveLab'
  | 'understandData'
  | 'cryptography'
  | 'consensusMechanism'
  | 'currentModule'
  | 'activeModules'
  | 'hashStandard'
  | 'consensus'
  | 'network'
  | 'interactiveLabs'
  | 'bitDigest'
  | 'ethereumModel'
  | 'simulationOnly'
  | 'simulationMode'
  | 'educationalSimulation'
  | 'noRealAssets'
  | 'hubbLab'
  | 'testnet'
  | 'tabHome'
  | 'tabHash'
  | 'tabMining'
  | 'tabRsa'
  | 'tabFlashcards'
  | 'tabProject'
  | 'tabTeam'
  | 'homeMining'
  | 'homeRsa'
  | 'homeFlashcards'
  | 'homeProject'
  | 'homeTeam'
  | 'teamTitle'
  | 'teamSubtitle'
  | 'facultySupervisor'
  | 'groupExecution'
  | 'projectTeam'
  | 'projectOverview'
  | 'learningPillars'
  | 'teamSection'
  | 'projectSection'
  | 'projectSubtitle'
  | 'advisorName'
  | 'studentGroup'
  | 'bankUniversity'
  | 'hubBlockchainLab'
  | 'academicProject'
  | 'dataScienceBusiness'
  | 'sixStudents'
  | 'studentsAdvisor'
  | 'learningSimulator'
  | 'noRealConnection'
  | 'footerLab'
  | 'projectInfoTitle'
  | 'projectInfoDesc'
  | 'unit'
  | 'advisor'
  | 'leader'
  | 'members'
  | 'close'
  | 'open'
  | 'projectInfo'
  | 'projectName'
  | 'miningConsensusWorkbench'
  | 'sharedChain'
  | 'howToUse'
  | 'stepLabel'
  | 'backLabel'
  | 'nextLabel'
  | 'stepBlockStructure'
  | 'stepTamperTest'
  | 'stepMultiWalletMining'
  | 'stepP2PNetwork'
  | 'stepEthereumPoS'
  | 'stepExpansion'
  | 'stepBlockObjective'
  | 'stepTamperObjective'
  | 'stepMultiWalletObjective'
  | 'stepP2PObjective'
  | 'stepPoSObjective'
  | 'stepExpansionObjective'
  | 'stepBlockHow1'
  | 'stepBlockHow2'
  | 'stepBlockHow3'
  | 'stepTamperHow1'
  | 'stepTamperHow2'
  | 'stepTamperHow3'
  | 'stepTamperHow4'
  | 'stepMultiWalletHow1'
  | 'stepMultiWalletHow2'
  | 'stepMultiWalletHow3'
  | 'stepP2PHow1'
  | 'stepP2PHow2'
  | 'stepP2PHow3'
  | 'stepPoSHow1'
  | 'stepPoSHow2'
  | 'stepPoSHow3'
  | 'stepExpansionHow1'
  | 'stepExpansionHow2'
  | 'stepExpansionHow3'
  | 'activeBlock'
  | 'blockVersionSelect'
  | 'blockV1Label'
  | 'blockV2Label'
  | 'blockHashFormula'
  | 'hashTypes'
  | 'blockVersions'
  | 'property'
  | 'v1Basic'
  | 'v2Metadata'
  | 'tamperTest'
  | 'validateLabel'
  | 'undoLabel'
  | 'resetChainLabel'

export const translations = {
  VN: {
    appTitle: 'Khám phá blockchain',
    appSubtitle: 'qua thực nghiệm.',
    exploreBlockchain: 'Khám phá blockchain',
    throughExperiments: 'qua thực nghiệm.',
    interactiveLab: 'Một phòng lab tương tác để hiểu cấu trúc dữ liệu, mật mã và cơ chế đồng thuận phía sau blockchain.',
    understandData: 'hiểu cấu trúc dữ liệu',
    cryptography: 'mật mã',
    consensusMechanism: 'cơ chế đồng thuận',
    currentModule: 'Mô-đun hiện tại',
    activeModules: 'MÔ-ĐUN HOẠT ĐỘNG',
    hashStandard: 'CHUẨN HASH',
    consensus: 'ĐỒNG THUẬN',
    network: 'MẠNG',
    interactiveLabs: 'Phòng lab tương tác',
    bitDigest: 'SHA-256',
    ethereumModel: 'Proof of Stake',
    simulationOnly: 'Mô phỏng cục bộ',
    simulationMode: 'CHẾ ĐỘ MÔ PHỎNG',
    educationalSimulation: 'Mô phỏng học tập',
    noRealAssets: 'Không có tài sản thật',
    hubbLab: 'HUB BLOCKCHAIN LAB',
    testnet: 'TESTNET',
    tabHome: 'Trang chủ',
    tabHash: 'Băm',
    tabMining: 'Đào',
    tabRsa: 'RSA',
    tabFlashcards: 'Flashcards',
    tabProject: 'Dự án',
    tabTeam: 'Nhóm',
    homeMining: 'Đào & Đồng thuận',
    homeRsa: 'Mã hóa RSA',
    homeFlashcards: 'Quiz / Flashcards',
    homeProject: 'Dự án',
    homeTeam: 'Nhóm',
    homeHashDesc: 'SHA-256 input, digest và 4 tính chất.',
    homeMiningDesc: 'Blockchain V2, worker mining, P2P và PoS.',
    homeRsaDesc: 'Mã hóa, chữ ký số, ví ECDSA và Merkle.',
    homeFlashcardsDesc: 'Ôn tập 26 câu hỏi theo chủ đề.',
    homeProjectDesc: 'Mục tiêu, kiến trúc và công nghệ.',
    homeTeamDesc: 'Giảng viên hướng dẫn và nhóm HUB.',
    teamTitle: 'Khoa Khoa học dữ liệu trong kinh doanh · HUB',
    teamSubtitle: 'Giảng viên hướng dẫn và nhóm thực hiện dự án.',
    facultySupervisor: 'Giảng viên hướng dẫn',
    groupExecution: 'Nhóm thực hiện',
    projectTeam: 'Nhóm dự án',
    projectOverview: 'Tổng quan dự án',
    learningPillars: 'Trụ cột học tập',
    teamSection: 'Đội ngũ',
    projectSection: 'Dự án',
    projectSubtitle: 'Phòng lab tương tác giúp người học quan sát cách hash, cấu trúc block, khóa công khai, đồng thuận và tài sản số phối hợp trong một hệ thống blockchain.',
    advisorName: 'TS. Nguyễn Hoài Đức',
    studentGroup: '6 sinh viên · Khoa Khoa học dữ liệu trong kinh doanh',
    bankUniversity: 'Đại Học Ngân Hàng TP.HCM',
    hubBlockchainLab: 'HUB Blockchain Lab',
    academicProject: 'Dự án học tập',
    dataScienceBusiness: 'Khoa Khoa học dữ liệu trong kinh doanh',
    sixStudents: '6 sinh viên',
    studentsAdvisor: '6 sinh viên + 1 giảng viên hướng dẫn',
    learningSimulator: 'HUB · Blockchain learning simulator',
    noRealConnection: 'Mọi khóa, giao dịch, mining, consensus và asset ở đây là mô phỏng cục bộ; không kết nối ví hoặc mạng mainnet.',
    footerLab: 'HUBBLOCK · LAB',
    projectInfoTitle: 'Thông tin dự án',
    projectInfoDesc: 'HUB Blockchain & PoS Explorer Simulator',
    unit: 'Đơn vị',
    advisor: 'Giảng viên hướng dẫn',
    leader: 'Trưởng nhóm',
    members: 'Thành viên',
    close: 'Đóng',
    open: 'Mở',
    projectInfo: 'Thông tin dự án',
    projectName: 'HUB Blockchain Lab',
    miningConsensusWorkbench: 'Mining & consensus workbench',
    sharedChain: 'Một chain dùng chung',
    howToUse: 'Cách sử dụng (How to use)',
    stepLabel: 'Bước',
    backLabel: 'Quay lại',
    nextLabel: 'Tiếp theo',
    stepBlockStructure: 'Cấu trúc Block',
    stepTamperTest: 'Sửa dữ liệu',
    stepMultiWalletMining: 'Khai thác nhiều ví',
    stepP2PNetwork: 'Mạng P2P',
    stepEthereumPoS: 'Ethereum PoS',
    stepExpansion: 'Mở rộng',
    stepBlockObjective: 'Nhận biết các trường block và cách hash/Merkle root liên kết dữ liệu.',
    stepTamperObjective: 'Quan sát thay đổi dữ liệu làm hỏng hash và liên kết các block sau.',
    stepMultiWalletObjective: 'So sánh nhiều ví đang tìm nonce hợp lệ song song.',
    stepP2PObjective: 'Quan sát transaction và block lan qua các node với độ trễ khác nhau.',
    stepPoSObjective: 'Theo dõi proposer, attestation và finalization theo stake.',
    stepExpansionObjective: 'Thử mô phỏng token, smart contract và tài sản số trên cùng phòng lab.',
    stepBlockHow1: 'Chọn block V1 hoặc V2.',
    stepBlockHow2: 'Chọn trường để highlight nó trong công thức.',
    stepBlockHow3: 'Sửa giao dịch, chọn một leaf và theo đường lên Merkle root.',
    stepTamperHow1: 'Sửa một giao dịch ở block bất kỳ.',
    stepTamperHow2: 'Xem hash tính lại và checklist trạng thái đổi.',
    stepTamperHow3: 'Kiểm tra block sau báo lỗi PreviousHash.',
    stepTamperHow4: 'Bấm Re-mine để đào lại block này đến cuối chain.',
    stepMultiWalletHow1: 'Đặt số 0 difficulty trong bước 2.',
    stepMultiWalletHow2: 'Bắt đầu khai thác bốn ví.',
    stepMultiWalletHow3: 'So sánh số lần thử và block winner.',
    stepP2PHow1: 'Đặt độ trễ mạng.',
    stepP2PHow2: 'Broadcast giao dịch tới các peer.',
    stepP2PHow3: 'Đồng bộ block và xem trạng thái từng node.',
    stepPoSHow1: 'Tạo slot để chọn proposer.',
    stepPoSHow2: 'Gửi attestation từ các validator.',
    stepPoSHow3: 'Quan sát block finalized và thay đổi stake/reward.',
    stepExpansionHow1: 'Thử transfer, mint hoặc burn LAB.',
    stepExpansionHow2: 'Theo dõi thay đổi số dư và total supply.',
    stepExpansionHow3: 'Tạo hoặc chuyển NFT trong sandbox.',
    activeBlock: 'Block trung tâm (Active block)',
    blockVersionSelect: 'Phiên bản cấu trúc block',
    blockV1Label: 'Block V1 (cơ bản)',
    blockV2Label: 'Block V2 (có metadata)',
    blockHashFormula: 'Công thức hash của block (Block hash formula)',
    hashTypes: 'Các loại hash (Hash types)',
    blockVersions: 'So sánh cấu trúc (Block versions)',
    property: 'Thuộc tính',
    v1Basic: 'V1 · cơ bản',
    v2Metadata: 'V2 · metadata',
    tamperTest: 'Sửa dữ liệu (Tamper test)',
    validateLabel: 'Kiểm tra lại (Validate)',
    undoLabel: 'Hoàn tác',
    resetChainLabel: 'Reset chain',
  },
  EN: {
    appTitle: 'Explore blockchain',
    appSubtitle: 'through experiments.',
    exploreBlockchain: 'Explore blockchain',
    throughExperiments: 'through experiments.',
    interactiveLab: 'An interactive lab to understand data structures, cryptography and consensus mechanisms behind blockchain.',
    understandData: 'understand data structures',
    cryptography: 'cryptography',
    consensusMechanism: 'consensus mechanisms',
    currentModule: 'Current module',
    activeModules: 'ACTIVE MODULES',
    hashStandard: 'HASH STANDARD',
    consensus: 'CONSENSUS',
    network: 'NETWORK',
    interactiveLabs: 'Interactive labs',
    bitDigest: 'SHA-256',
    ethereumModel: 'Proof of Stake',
    simulationOnly: 'Local simulation',
    simulationMode: 'SIMULATION MODE',
    educationalSimulation: 'Educational simulation',
    noRealAssets: 'No real assets',
    hubbLab: 'HUB BLOCKCHAIN LAB',
    testnet: 'TESTNET',
    tabHome: 'Home',
    tabHash: 'Hash',
    tabMining: 'Mining',
    tabRsa: 'RSA',
    tabFlashcards: 'Flashcards',
    tabProject: 'Project',
    tabTeam: 'Team',
    homeMining: 'Mining & Consensus',
    homeRsa: 'RSA Crypto',
    homeFlashcards: 'Quiz / Flashcards',
    homeProject: 'Project',
    homeTeam: 'Team',
    homeHashDesc: 'SHA-256 input, digest and 4 core properties.',
    homeMiningDesc: 'Blockchain V2, worker mining, P2P and PoS.',
    homeRsaDesc: 'Encryption, digital signatures, ECDSA wallet and Merkle.',
    homeFlashcardsDesc: 'Review 26 questions by topic.',
    homeProjectDesc: 'Goals, architecture and technology.',
    homeTeamDesc: 'Faculty advisor and HUB group.',
    teamTitle: 'Data Science in Business Faculty · HUB',
    teamSubtitle: 'Faculty advisor and project team.',
    facultySupervisor: 'Faculty Supervisor / Advisor',
    groupExecution: 'Project team',
    projectTeam: 'Project team',
    projectOverview: 'Project overview',
    learningPillars: 'Learning pillars',
    teamSection: 'Team',
    projectSection: 'Project',
    projectSubtitle: 'An interactive lab to observe how hashing, block structure, public-key cryptography, consensus and digital assets work together in a blockchain system.',
    advisorName: 'TS. Nguyễn Hoài Đức',
    studentGroup: '6 students · Data Science in Business Faculty',
    bankUniversity: 'HCMC Banking University',
    hubBlockchainLab: 'HUB Blockchain Lab',
    academicProject: 'Academic project',
    dataScienceBusiness: 'Data Science in Business',
    sixStudents: '6 students',
    studentsAdvisor: '6 students + 1 faculty advisor',
    learningSimulator: 'HUB · Blockchain learning simulator',
    noRealConnection: 'All keys, transactions, mining, consensus and assets here are local simulations; no wallet or mainnet connection.',
    footerLab: 'HUBBLOCK · LAB',
    projectInfoTitle: 'Project information',
    projectInfoDesc: 'HUB Blockchain & PoS Explorer Simulator',
    unit: 'Institution',
    advisor: 'Faculty Supervisor',
    leader: 'Team Lead',
    members: 'Members',
    close: 'Close',
    open: 'Open',
    projectInfo: 'Project info',
    projectName: 'HUB Blockchain Lab',
    miningConsensusWorkbench: 'Mining & consensus workbench',
    sharedChain: 'One shared chain',
    howToUse: 'How to use',
    stepLabel: 'Step',
    backLabel: 'Back',
    nextLabel: 'Next',
    stepBlockStructure: 'Block structure',
    stepTamperTest: 'Tamper test',
    stepMultiWalletMining: 'Multi-wallet mining',
    stepP2PNetwork: 'P2P network',
    stepEthereumPoS: 'Ethereum proof of stake',
    stepExpansion: 'Expansion',
    stepBlockObjective: 'Identify block fields and how hash/Merkle root commits data.',
    stepTamperObjective: 'Watch data tampering break hash and chain links.',
    stepMultiWalletObjective: 'Compare multiple wallets racing for a valid nonce in parallel.',
    stepP2PObjective: 'Observe transactions and blocks propagate across nodes with different delays.',
    stepPoSObjective: 'Track proposer, attestation and finalization by stake.',
    stepExpansionObjective: 'Try token, smart contract and digital asset simulations in the same lab.',
    stepBlockHow1: 'Select block V1 or V2.',
    stepBlockHow2: 'Select a field to highlight it in the formula.',
    stepBlockHow3: 'Edit a transaction, pick a leaf, then follow it up to Merkle root.',
    stepTamperHow1: 'Edit any transaction in any block.',
    stepTamperHow2: 'Watch recalculated hash and checklist status change.',
    stepTamperHow3: 'Check that the next block flags a PreviousHash error.',
    stepTamperHow4: 'Press Re-mine to re-mine this block through the end of the chain.',
    stepMultiWalletHow1: 'Set difficulty to 0 in step 2.',
    stepMultiWalletHow2: 'Start mining for four wallets.',
    stepMultiWalletHow3: 'Compare attempt counts and the block winner.',
    stepP2PHow1: 'Set network delay.',
    stepP2PHow2: 'Broadcast a transaction to peers.',
    stepP2PHow3: 'Sync blocks and watch each node status.',
    stepPoSHow1: 'Create a slot to select a proposer.',
    stepPoSHow2: 'Submit attestations from validators.',
    stepPoSHow3: 'Watch finalized blocks and stake/reward changes.',
    stepExpansionHow1: 'Try transfer, mint or burn LAB.',
    stepExpansionHow2: 'Track balance and total supply changes.',
    stepExpansionHow3: 'Create or transfer an NFT in the sandbox.',
    activeBlock: 'Active block',
    blockVersionSelect: 'Block version',
    blockV1Label: 'Block V1 (basic)',
    blockV2Label: 'Block V2 (with metadata)',
    blockHashFormula: 'Block hash formula',
    hashTypes: 'Hash types',
    blockVersions: 'Block versions',
    property: 'Property',
    v1Basic: 'V1 · basic',
    v2Metadata: 'V2 · metadata',
    tamperTest: 'Tamper test',
    validateLabel: 'Validate',
    undoLabel: 'Undo',
    resetChainLabel: 'Reset chain',
  },
}
