import { hashTransaction, merkleRoot, validateChain, type Block, type Transaction } from './chain.ts'

export type BalanceAccount = { address: string; balance: number; nonce: number }
export type PeerBlockValidation = { valid: boolean; reason: string }

export function nonceForWorker(workerIndex: number, workerCount: number, attempt: number): number {
  const firstNonce = workerIndex === 0 ? workerCount : workerIndex
  return firstNonce + workerCount * attempt
}

export function selectLongestChain<T>(chains: T[][]): T[] {
  return chains.reduce((longest, candidate) => candidate.length > longest.length ? candidate : longest, chains[0] ?? [])
}

export function canCoverTransactions(accounts: BalanceAccount[], transactions: Pick<Transaction, 'from' | 'to' | 'amount'>[]): { valid: boolean; reason: string } {
  const balances = new Map(accounts.map((account) => [account.address.toLowerCase(), account.balance]))
  for (const transaction of transactions) {
    const sender = transaction.from.toLowerCase()
    const recipient = transaction.to.toLowerCase()
    const amount = Number(transaction.amount)
    if (!Number.isFinite(amount) || amount <= 0) return { valid: false, reason: 'Amount must be greater than zero.' }
    if (sender === recipient) return { valid: false, reason: 'Sender and recipient must be different.' }
    const balance = balances.get(sender)
    if (balance === undefined || !balances.has(recipient)) return { valid: false, reason: 'Unknown wallet address.' }
    if (balance < amount) return { valid: false, reason: 'Insufficient balance.' }
    balances.set(sender, balance - amount)
    balances.set(recipient, (balances.get(recipient) ?? 0) + amount)
  }
  return { valid: true, reason: '' }
}

export function validatePeerBlock(block: Block, chain: Block[], difficulty: number, validTransactions: boolean): PeerBlockValidation {
  if (!validTransactions) return { valid: false, reason: 'Transaction signature, nonce or balance is invalid.' }
  if (block.index !== chain.length) return { valid: false, reason: 'Unexpected block index.' }
  if (block.previousHash !== (chain.at(-1)?.hash ?? '0'.repeat(64))) return { valid: false, reason: 'Previous hash does not match the local tip.' }
  if (block.merkleRoot !== merkleRoot(block.transactions.map(hashTransaction))) return { valid: false, reason: 'Merkle root does not match transactions.' }
  const checks = validateChain([...chain, block], difficulty).at(-1)!
  if (!checks.hash) return { valid: false, reason: 'Block hash is invalid.' }
  if (!checks.proofOfWork) return { valid: false, reason: 'Proof of work does not meet difficulty.' }
  return { valid: true, reason: '' }
}