import CryptoJS from 'crypto-js'

export type Transaction = {
  id: string
  from: string
  to: string
  amount: string
  signatureStatus: 'unsigned' | 'signed'
}

export type Block = {
  index: number
  timestamp: string
  previousHash: string
  transactions: Transaction[]
  merkleRoot: string
  difficulty: number
  validator: string
  nonce: number
  hash: string
  consensus?: 'pow' | 'pos'
}

export type MerkleProofNode = { hash: string; side: 'left' | 'right' }
export type ChainChecks = { hash: boolean; merkle: boolean; previous: boolean; proofOfWork: boolean; reasons: string[]; valid: boolean }

export function sha256(value: string): string {
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex)
}

function canonicalAmount(amount: string | number): string {
  const value = Number(amount)
  return Number.isFinite(value) ? value.toString() : String(amount).trim()
}

export function canonicalTransaction(transaction: Pick<Transaction, 'from' | 'to' | 'amount'>): string {
  return JSON.stringify([
    transaction.from.trim().normalize('NFC').toLowerCase(),
    transaction.to.trim().normalize('NFC').toLowerCase(),
    canonicalAmount(transaction.amount),
  ])
}

export function hashTransaction(transaction: Pick<Transaction, 'from' | 'to' | 'amount'>): string {
  return sha256(canonicalTransaction(transaction))
}

export function merkleTree(txHashes: string[]): { levels: string[][]; root: string; proofs: MerkleProofNode[][] } {
  if (!txHashes.length) return { levels: [[sha256('')]], root: sha256(''), proofs: [] }
  const levels = [txHashes.map((hash) => hash.toLowerCase())]
  const positions = txHashes.map((_, index) => ({ index, proof: [] as MerkleProofNode[] }))

  while (levels.at(-1)!.length > 1) {
    const current = levels.at(-1)!
    const next: string[] = []
    for (let index = 0; index < current.length; index += 2) {
      const rightIndex = index + 1 < current.length ? index + 1 : index
      next.push(sha256(current[index] + current[rightIndex]))
      for (const position of positions) {
        if (position.index === index || position.index === rightIndex) {
          position.proof.push({ hash: current[position.index === index ? rightIndex : index], side: position.index === index ? 'right' : 'left' })
        }
      }
    }
    positions.forEach((position) => { position.index = Math.floor(position.index / 2) })
    levels.push(next)
  }

  return { levels, root: levels.at(-1)![0], proofs: positions.map(({ proof }) => proof) }
}

export function merkleRoot(txHashes: string[]): string {
  return merkleTree(txHashes).root
}

export function hashBlock(block: Pick<Block, 'index' | 'timestamp' | 'previousHash' | 'merkleRoot' | 'nonce' | 'validator'>): string {
  return sha256(`${block.index}${block.timestamp}${block.previousHash}${block.merkleRoot}${block.nonce}${block.validator}`)
}

export function validateChain(chain: Block[], difficulty = chain[0]?.difficulty ?? 3): ChainChecks[] {
  const calculatedHashes = chain.map((block) => hashBlock({ ...block, merkleRoot: merkleRoot(block.transactions.map(hashTransaction)) }))
  return chain.map((block, index) => {
    const hash = block.hash === calculatedHashes[index]
    const merkle = block.merkleRoot === merkleRoot(block.transactions.map(hashTransaction))
    const previous = block.previousHash === (index === 0 ? '0'.repeat(64) : calculatedHashes[index - 1])
    const proofOfWork = index === 0 || block.consensus === 'pos' || (block.nonce > 0 && block.hash.startsWith('0'.repeat(difficulty)))
    const reasons = [
      !hash && 'Hash tính lại không khớp hash đã lưu.',
      !merkle && 'Merkle root không khớp danh sách giao dịch.',
      !previous && 'Previous hash không khớp block trước.',
      !proofOfWork && `Nonce/hash chưa đạt difficulty ${difficulty}.`,
    ].filter((reason): reason is string => Boolean(reason))
    return { hash, merkle, previous, proofOfWork, reasons, valid: reasons.length === 0 }
  })
}

export function mineBlock(block: Block, difficulty: number, maxAttempts = Number.MAX_SAFE_INTEGER): { block: Block; attempts: number; elapsedMs: number } | null {
  const started = performance.now()
  if (block.consensus === 'pos') {
    const candidate = { ...block, hash: hashBlock(block) }
    return { block: candidate, attempts: 1, elapsedMs: performance.now() - started }
  }
  const target = '0'.repeat(difficulty)
  const firstNonce = block.index === 0 ? 0 : Math.max(1, block.nonce)
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = { ...block, nonce: firstNonce + offset }
    candidate.hash = hashBlock(candidate)
    if (block.index === 0 || candidate.hash.startsWith(target)) {
      return { block: candidate, attempts: offset + 1, elapsedMs: performance.now() - started }
    }
  }
  return null
}

export function remineChainFrom(chain: Block[], startIndex: number, difficulty: number, onBlockMined?: (index: number, attempts: number, elapsedMs: number) => void): Block[] {
  const updated = chain.slice(0, startIndex)
  let previousHash = startIndex === 0 ? '0'.repeat(64) : updated[startIndex - 1].hash
  for (let index = startIndex; index < chain.length; index += 1) {
    const source = chain[index]
    const block: Block = {
      ...source,
      previousHash,
      merkleRoot: merkleRoot(source.transactions.map(hashTransaction)),
      difficulty,
      nonce: index === 0 ? 0 : 1,
      hash: '',
    }
    const result = mineBlock(block, difficulty)!
    updated.push(result.block)
    previousHash = result.block.hash
    onBlockMined?.(index, result.attempts, result.elapsedMs)
  }
  return updated
}

function createTransaction(id: string, from: string, to: string, amount: string): Transaction {
  return { id, from, to, amount, signatureStatus: 'unsigned' }
}

export function createInitialChain(difficulty = 3): Block[] {
  const alice = `0x${sha256('ChainLab Alice').slice(-40)}`
  const bob = `0x${sha256('ChainLab Bob').slice(-40)}`
  const carol = `0x${sha256('ChainLab Carol').slice(-40)}`
  const transactions = [
    [createTransaction('tx-1', alice, bob, '2.5')],
    [createTransaction('tx-2', bob, carol, '0.8'), createTransaction('tx-3', carol, alice, '1.2')],
    [createTransaction('tx-4', alice, carol, '0.4'), createTransaction('tx-5', bob, alice, '0.25')],
  ]
  let previousHash = '0'.repeat(64)
  return transactions.map((items, index) => {
    const timestamp = new Date(Date.now() + index * 12_000).toISOString()
    const block: Block = {
      index,
      timestamp,
      previousHash,
      transactions: items,
      merkleRoot: merkleRoot(items.map(hashTransaction)),
      difficulty,
      validator: `0x${sha256(`ChainLab validator ${index}`).slice(-40)}`,
      nonce: 0,
      hash: '',
    }
    const result = mineBlock(block, difficulty)!
    previousHash = result.block.hash
    return result.block
  })
}