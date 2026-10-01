import { useSyncExternalStore } from 'react'
import { canonicalTransaction, sha256, type Transaction } from './chain'
import { canCoverTransactions, type BalanceAccount } from './miningNetwork'

export type MiningWallet = BalanceAccount & { id: string; name: string; hashPower: 25 | 50 | 100; publicKey?: CryptoKey; privateKey?: CryptoKey }
export type SignedMiningTransaction = Transaction & { nonce: number; signature: string }
export type MiningSnapshot = { wallets: MiningWallet[]; mempool: SignedMiningTransaction[] }
type Listener = () => void

const names = ['Alice', 'Bruno', 'Chika', 'Dara', 'Emil', 'Farah', 'Gia', 'Huy']
let snapshot: MiningSnapshot = {
  wallets: names.slice(0, 4).map((name, index) => createWallet(index, name)),
  mempool: [],
}
const listeners = new Set<Listener>()

function createWallet(index: number, name: string): MiningWallet {
  return { id: `mining-wallet-${index + 1}`, name, address: `0x${sha256(name).slice(-40)}`, balance: 100, nonce: 0, hashPower: 100 }
}

function commit(next: MiningSnapshot) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

export function getMiningSnapshot() {
  return snapshot
}

export function subscribeToMining(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function ensureMiningWalletKeys() {
  const missing = snapshot.wallets.filter((wallet) => !wallet.privateKey || !wallet.publicKey)
  const generated = await Promise.all(missing.map(async (wallet) => ({
    id: wallet.id,
    pair: await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']),
  })))
  if (!generated.length) return
  const byId = new Map(generated.map(({ id, pair }) => [id, pair]))
  commit({
    ...snapshot,
    wallets: snapshot.wallets.map((wallet) => {
      const pair = byId.get(wallet.id)
      return pair ? { ...wallet, publicKey: pair.publicKey, privateKey: pair.privateKey } : wallet
    }),
  })
}

export function configureMiningWallets(count: number, configuration: { id: string; name: string; hashPower: 25 | 50 | 100 }[]) {
  const wallets = Array.from({ length: Math.max(2, Math.min(8, count)) }, (_, index) => {
    const existing = snapshot.wallets.find((wallet) => wallet.id === configuration[index]?.id)
    const config = configuration[index]
    if (!config) return snapshot.wallets[index] ?? createWallet(index, names[index])
    return {
      ...(existing ?? createWallet(index, config.name)),
      id: config.id,
      name: config.name.trim() || `Wallet ${index + 1}`,
      address: `0x${sha256(config.name.trim() || `Wallet ${index + 1}`).slice(-40)}`,
      hashPower: config.hashPower,
    }
  })
  commit({ wallets, mempool: snapshot.mempool.filter((transaction) => wallets.some((wallet) => wallet.address === transaction.from || wallet.address === transaction.to)) })
  void ensureMiningWalletKeys()
}

export async function createSignedTransaction(fromId: string, toAddress: string, amountInput: string): Promise<{ transaction?: SignedMiningTransaction; error?: string }> {
  const from = snapshot.wallets.find((wallet) => wallet.id === fromId)
  const to = snapshot.wallets.find((wallet) => wallet.address.toLowerCase() === toAddress.toLowerCase())
  const amount = Number(amountInput)
  if (!from || !to) return { error: 'Chọn ví gửi và ví nhận trong danh sách.' }
  if (from.address === to.address) return { error: 'Ví gửi và ví nhận phải khác nhau.' }
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount phải lớn hơn 0.' }
  if (!from.privateKey || !from.publicKey) return { error: 'Ví đang khởi tạo khóa chữ ký.' }

  const reserved = snapshot.mempool.filter((transaction) => transaction.from === from.address).reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  if (from.balance - reserved < amount) return { error: 'Số dư không đủ cho giao dịch và các giao dịch đang chờ.' }
  const nonce = from.nonce + snapshot.mempool.filter((transaction) => transaction.from === from.address).length
  const payload = { id: `mempool-${crypto.randomUUID()}`, from: from.address, to: to.address, amount: String(amount), nonce, signatureStatus: 'signed' as const }
  const signedBytes = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, from.privateKey, new TextEncoder().encode(`${canonicalTransaction(payload)}|${nonce}`))
  const transaction = { ...payload, signature: Array.from(new Uint8Array(signedBytes), (byte) => byte.toString(16).padStart(2, '0')).join('') }
  commit({ ...snapshot, mempool: [...snapshot.mempool, transaction] })
  return { transaction }
}

export async function verifyMiningTransaction(transaction: SignedMiningTransaction, accounts: MiningWallet[] = snapshot.wallets, pending: SignedMiningTransaction[] = snapshot.mempool): Promise<{ valid: boolean; reason: string }> {
  const sender = accounts.find((wallet) => wallet.address.toLowerCase() === transaction.from.toLowerCase())
  const receiver = accounts.find((wallet) => wallet.address.toLowerCase() === transaction.to.toLowerCase())
  if (!sender?.publicKey || !receiver) return { valid: false, reason: 'Không tìm thấy ví hoặc public key của người gửi.' }
  const expectedNonce = sender.nonce + pending.filter((item) => item.from.toLowerCase() === sender.address.toLowerCase()).length
  if (transaction.nonce !== expectedNonce) return { valid: false, reason: `Nonce không hợp lệ: cần ${expectedNonce}.` }
  const balances = accounts.map((wallet) => ({ address: wallet.address, balance: wallet.balance, nonce: wallet.nonce }))
  const balanceCheck = canCoverTransactions(balances, [...pending, transaction])
  if (!balanceCheck.valid) return balanceCheck
  try {
    const signature = Uint8Array.from(transaction.signature.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, sender.publicKey, signature, new TextEncoder().encode(`${canonicalTransaction(transaction)}|${transaction.nonce}`))
    return valid ? { valid: true, reason: '' } : { valid: false, reason: 'Chữ ký ECDSA không hợp lệ.' }
  } catch {
    return { valid: false, reason: 'Không thể xác minh chữ ký.' }
  }
}

export function settleMinedTransactions(transactions: SignedMiningTransaction[], winnerId: string, reward = 0.01) {
  const included = new Set(transactions.map((transaction) => transaction.id))
  const wallets = snapshot.wallets.map((wallet) => ({ ...wallet }))
  for (const transaction of transactions) {
    const sender = wallets.find((wallet) => wallet.address === transaction.from)
    const receiver = wallets.find((wallet) => wallet.address === transaction.to)
    if (!sender || !receiver) continue
    const amount = Number(transaction.amount)
    sender.balance -= amount
    sender.nonce += 1
    receiver.balance += amount
  }
  const winner = wallets.find((wallet) => wallet.id === winnerId)
  if (winner) winner.balance += reward
  commit({ wallets, mempool: snapshot.mempool.filter((transaction) => !included.has(transaction.id)) })
}

export function useMiningStore() {
  return useSyncExternalStore(subscribeToMining, () => snapshot, () => snapshot)
}