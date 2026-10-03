import { createInitialChain, type Block, type Transaction } from './chain'

type Listener = () => void

let chain = createInitialChain()
const listeners = new Set<Listener>()
const history: Block[][] = []

function emit() {
  listeners.forEach((listener) => listener())
}

export function getChainSnapshot(): Block[] {
  return chain
}

export function subscribeToChain(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function replaceChain(next: Block[]) {
  commit(next)
}

export function updateTransaction(blockIndex: number, transactionId: string, update: Partial<Pick<Transaction, 'from' | 'to' | 'amount'>>) {
  commit(chain.map((block) => block.index !== blockIndex ? block : {
    ...block,
    transactions: block.transactions.map((transaction) => transaction.id !== transactionId ? transaction : { ...transaction, ...update, signatureStatus: 'unsigned' }),
  }))
}

export function setBlockTimestamp(blockIndex: number, timestamp: string) {
  commit(chain.map((block) => block.index === blockIndex ? { ...block, timestamp } : block))
}

export function setChainDifficulty(difficulty: number) {
  commit(chain.map((block) => ({ ...block, difficulty })))
}

export function appendMinedBlock(block: Block) {
  commit([...chain.slice(0, block.index), block])
}

export function resetChain(difficulty = 3) {
  history.length = 0
  chain = createInitialChain(difficulty)
  emit()
}

export function addTransaction(blockIndex: number) {
  commit(chain.map((block) => block.index !== blockIndex ? block : {
    ...block,
    transactions: [...block.transactions, {
      id: `tx-${crypto.randomUUID()}`,
      from: block.transactions[0]?.to ?? '',
      to: block.transactions[0]?.from ?? '',
      amount: '1',
      signatureStatus: 'unsigned' as const,
    }],
  }))
}

export function removeTransaction(blockIndex: number, transactionId: string) {
  commit(chain.map((block) => block.index !== blockIndex ? block : {
    ...block,
    transactions: block.transactions.filter((transaction) => transaction.id !== transactionId),
  }))
}

export function undoChainChange() {
  const previous = history.pop()
  if (!previous) return false
  chain = previous
  emit()
  return true
}

function commit(next: Block[]) {
  history.push(chain)
  chain = next
  emit()
}

export function canUndoChainChange() {
  return history.length > 0
}