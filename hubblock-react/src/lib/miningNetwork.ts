import { hashTransaction, merkleRoot, validateChain, type Block, type Transaction } from './chain.ts'
import { parseUnits, DECIMAL_BASE } from './units.ts'

export type BalanceAccount = { address: string; balance: number; nonce: number }
export type PeerBlockValidation = { valid: boolean; reason: string }

export function nonceForWorker(workerIndex: number, workerCount: number, attempt: number): number {
  const firstNonce = workerIndex === 0 ? workerCount : workerIndex
  return firstNonce + workerCount * attempt
}

export function selectLongestChain<T>(chains: T[][]): T[] {
  return chains.reduce((longest, candidate) => candidate.length > longest.length ? candidate : longest, chains[0] ?? [])
}

export function selectHeaviestChain(chains: Block[][]): Block[] {
  function chainWeight(chain: Block[]): number {
    return chain.reduce((weight, block) => {
      if (block.index === 0) return weight
      if (block.consensus === 'pos') return weight
      return weight + 16 ** block.difficulty
    }, 0)
  }
  return chains.reduce((heaviest, candidate) => {
    if (!heaviest.length) return candidate
    return chainWeight(candidate) > chainWeight(heaviest) ? candidate : heaviest
  }, [] as Block[])
}

export function canCoverTransactions(accounts: BalanceAccount[], transactions: Pick<Transaction, 'from' | 'to' | 'amount'>[]): { valid: boolean; reason: string } {
  const balances = new Map<string, number>()
  for (const account of accounts) {
    balances.set(account.address.toLowerCase(), Math.round(account.balance * DECIMAL_BASE))
  }
  for (const transaction of transactions) {
    const sender = transaction.from.toLowerCase()
    const recipient = transaction.to.toLowerCase()
    let amountUnits: number
    try {
      amountUnits = parseUnits(transaction.amount)
    } catch {
      return { valid: false, reason: 'Invalid amount format.' }
    }
    if (amountUnits <= 0) return { valid: false, reason: 'Amount must be greater than zero.' }
    if (sender === recipient) return { valid: false, reason: 'Sender and recipient must be different.' }
    const senderBalance = balances.get(sender)
    if (senderBalance === undefined || !balances.has(recipient)) return { valid: false, reason: 'Unknown wallet address.' }
    if (senderBalance < amountUnits) return { valid: false, reason: 'Insufficient balance.' }
    balances.set(sender, senderBalance - amountUnits)
    balances.set(recipient, (balances.get(recipient) ?? 0) + amountUnits)
  }
  return { valid: true, reason: '' }
}

export function validatePeerBlock(block: Block, chain: Block[], difficulty: number, validTransactions: boolean): PeerBlockValidation {
  if (!validTransactions) return { valid: false, reason: 'Transaction signature, nonce or balance is invalid.' }
  if (block.index !== chain.length) return { valid: false, reason: 'Unexpected block index.' }
  if (block.previousHash !== (chain.at(-1)?.hash ?? '0'.repeat(64))) return { valid: false, reason: 'Previous hash does not match the local tip.' }
  if (block.merkleRoot !== merkleRoot(block.transactions.map(hashTransaction))) return { valid: false, reason: 'Merkle root does not match transactions.' }
  
  // Timestamp validation
  if (block.index > 0) {
    const prevTimestamp = new Date(chain.at(-1)!.timestamp).getTime()
    const currTimestamp = new Date(block.timestamp).getTime()
    const now = Date.now()
    const twoHoursMs = 2 * 60 * 60 * 1000
    if (currTimestamp < prevTimestamp) return { valid: false, reason: 'Block timestamp is earlier than previous block.' }
    if (currTimestamp > now + twoHoursMs) return { valid: false, reason: 'Block timestamp is more than 2 hours in the future.' }
  }
  
  const checks = validateChain([...chain, block], difficulty).at(-1)!
  if (!checks.hash) return { valid: false, reason: 'Block hash is invalid.' }
  if (!checks.proofOfWork) return { valid: false, reason: 'Proof of work does not meet difficulty.' }
  return { valid: true, reason: '' }
}