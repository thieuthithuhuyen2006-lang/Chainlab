export function poissonProbability(lambda: number, k: number): number {
  let factorial = 1
  for (let i = 2; i <= k; i += 1) factorial *= i
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial
}

export function attackSuccessProbability(attackerRatio: number, confirmations: number): number {
  if (attackerRatio <= 0) return 0
  if (attackerRatio >= 1) return 1
  if (confirmations < 0) return 1
  const honestRatio = 1 - attackerRatio
  const lambda = (confirmations * attackerRatio) / honestRatio
  let sum = 0
  for (let k = 0; k <= confirmations; k += 1) {
    sum += poissonProbability(lambda, k) * (1 - Math.pow(attackerRatio / honestRatio, confirmations - k))
  }
  return 1 - sum
}

export function difficultyRetarget(currentDifficulty: number, actualTimeSec: number, targetTimeSec = 1209600, maxAdjustment = 4): number {
  if (currentDifficulty <= 0 || actualTimeSec <= 0 || targetTimeSec <= 0) return currentDifficulty
  const ratio = targetTimeSec / actualTimeSec
  const clamped = Math.max(1 / maxAdjustment, Math.min(maxAdjustment, ratio))
  return currentDifficulty * clamped
}

export type MempoolTx = { id: string; fee: number; vbytes: number }

export function feeRate(tx: MempoolTx): number {
  return tx.vbytes > 0 ? tx.fee / tx.vbytes : 0
}

export function sortByFeeRate(transactions: MempoolTx[]): MempoolTx[] {
  return [...transactions].sort((a, b) => feeRate(b) - feeRate(a))
}

export function selectForBlock(transactions: MempoolTx[], maxVbytes: number): { selected: MempoolTx[]; totalFee: number; usedVbytes: number } {
  const selected: MempoolTx[] = []
  let usedVbytes = 0
  let totalFee = 0
  for (const tx of sortByFeeRate(transactions)) {
    if (usedVbytes + tx.vbytes <= maxVbytes) {
      selected.push(tx)
      usedVbytes += tx.vbytes
      totalFee += tx.fee
    }
  }
  return { selected, totalFee, usedVbytes }
}

export type Utxo = { txId: string; amount: number }

export function selectUtxos(utxos: Utxo[], targetAmount: number): { selected: Utxo[]; total: number; change: number } {
  const sorted = [...utxos].sort((a, b) => b.amount - a.amount)
  const selected: Utxo[] = []
  let total = 0
  for (const utxo of sorted) {
    if (total >= targetAmount) break
    selected.push(utxo)
    total += utxo.amount
  }
  return { selected, total, change: total - targetAmount }
}
