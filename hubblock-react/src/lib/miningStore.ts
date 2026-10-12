import { useSyncExternalStore } from 'react'
import { canonicalTransactionWithNonce, sha256, type Transaction } from './chain'
import { canCoverTransactions, type BalanceAccount } from './miningNetwork'
import { parseUnits, formatUnits, DECIMAL_BASE, addUnits, subUnits } from './units'

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
  return { id: `mining-wallet-${index + 1}`, name, address: `0x${sha256(name).slice(-40)}`, balance: 100 * DECIMAL_BASE, nonce: 0, hashPower: 100 }
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

export async function createSignedTransaction(fromId: string, toAddress: string, amountInput: string, locale: 'vn' | 'en' = 'vn'): Promise<{ transaction?: SignedMiningTransaction; error?: string }> {
  const from = snapshot.wallets.find((wallet) => wallet.id === fromId)
  const to = snapshot.wallets.find((wallet) => wallet.address.toLowerCase() === toAddress.toLowerCase())
  let amountUnits: number
  try {
    amountUnits = parseUnits(amountInput)
  } catch {
    return { error: locale === 'vn' ? 'Số tiền không hợp lệ (tối đa 8 chữ số thập phân).' : 'Invalid amount (at most 8 decimal places).' }
  }
  if (!from || !to) return { error: locale === 'vn' ? 'Chọn ví gửi và ví nhận trong danh sách.' : 'Select a sender and a receiver from the list.' }
  if (from.address === to.address) return { error: locale === 'vn' ? 'Ví gửi và ví nhận phải khác nhau.' : 'Sender and receiver must be different.' }
  if (amountUnits <= 0) return { error: locale === 'vn' ? 'Amount phải lớn hơn 0.' : 'Amount must be greater than 0.' }
  if (!from.privateKey || !from.publicKey) return { error: locale === 'vn' ? 'Ví đang khởi tạo khóa chữ ký.' : 'The wallet is still initializing its signing keys.' }

  const reserved = snapshot.mempool.filter((transaction) => transaction.from === from.address).reduce((sum, transaction) => {
    try { return sum + parseUnits(transaction.amount) } catch { return sum }
  }, 0)
  if (from.balance - reserved < amountUnits) return { error: locale === 'vn' ? 'Số dư không đủ cho giao dịch và các giao dịch đang chờ.' : 'Insufficient balance for this transaction and the pending ones.' }
  const nonce = from.nonce + snapshot.mempool.filter((transaction) => transaction.from === from.address).length
  const payload = { id: `mempool-${crypto.randomUUID()}`, from: from.address, to: to.address, amount: formatUnits(amountUnits), nonce, signatureStatus: 'signed' as const }
  const signedBytes = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, from.privateKey, new TextEncoder().encode(`${canonicalTransactionWithNonce(payload, nonce)}`))
  const transaction = { ...payload, signature: Array.from(new Uint8Array(signedBytes), (byte) => byte.toString(16).padStart(2, '0')).join('') }
  commit({ ...snapshot, mempool: [...snapshot.mempool, transaction] })
  return { transaction }
}

export async function verifyMiningTransaction(transaction: SignedMiningTransaction, accounts: MiningWallet[] = snapshot.wallets, pending: SignedMiningTransaction[] = snapshot.mempool, locale: 'vn' | 'en' = 'vn'): Promise<{ valid: boolean; reason: string }> {
  const sender = accounts.find((wallet) => wallet.address.toLowerCase() === transaction.from.toLowerCase())
  const receiver = accounts.find((wallet) => wallet.address.toLowerCase() === transaction.to.toLowerCase())
  if (!sender?.publicKey || !receiver) return { valid: false, reason: locale === 'vn' ? 'Không tìm thấy ví hoặc public key của người gửi.' : 'Sender wallet or public key not found.' }
  const expectedNonce = sender.nonce + pending.filter((item) => item.from.toLowerCase() === sender.address.toLowerCase()).length
  if (transaction.nonce !== expectedNonce) return { valid: false, reason: locale === 'vn' ? `Nonce không hợp lệ: cần ${expectedNonce}.` : `Invalid nonce: expected ${expectedNonce}.` }
  const balances = accounts.map((wallet) => ({ address: wallet.address, balance: wallet.balance, nonce: wallet.nonce }))
  const balanceCheck = canCoverTransactions(balances, [...pending, transaction], locale)
  if (!balanceCheck.valid) return balanceCheck
  try {
    const signature = Uint8Array.from(transaction.signature.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, sender.publicKey, signature, new TextEncoder().encode(`${canonicalTransactionWithNonce(transaction, transaction.nonce)}`))
    return valid ? { valid: true, reason: '' } : { valid: false, reason: locale === 'vn' ? 'Chữ ký ECDSA không hợp lệ.' : 'Invalid ECDSA signature.' }
  } catch {
    return { valid: false, reason: locale === 'vn' ? 'Không thể xác minh chữ ký.' : 'Could not verify the signature.' }
  }
}

export function settleMinedTransactions(transactions: SignedMiningTransaction[], winnerId: string, reward = 0.01) {
  const included = new Set(transactions.map((transaction) => transaction.id))
  const wallets = snapshot.wallets.map((wallet) => ({ ...wallet }))
  const rewardUnits = Math.round(reward * DECIMAL_BASE)
  for (const transaction of transactions) {
    const sender = wallets.find((wallet) => wallet.address === transaction.from)
    const receiver = wallets.find((wallet) => wallet.address === transaction.to)
    if (!sender || !receiver) continue
    let amountUnits: number
    try {
      amountUnits = parseUnits(transaction.amount)
    } catch {
      continue
    }
    sender.balance = subUnits(sender.balance, amountUnits)
    sender.nonce += 1
    receiver.balance = addUnits(receiver.balance, amountUnits)
  }
  const winner = wallets.find((wallet) => wallet.id === winnerId)
  if (winner) winner.balance = addUnits(winner.balance, rewardUnits)
  commit({ wallets, mempool: snapshot.mempool.filter((transaction) => !included.has(transaction.id)) })
}

export function useMiningStore() {
  return useSyncExternalStore(subscribeToMining, () => snapshot, () => snapshot)
}