import type { Transaction } from './chain'

export type MerkleProofNode = { hash: string; side: 'left' | 'right' }

export async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function canonicalTransaction(tx: Pick<Transaction, 'from' | 'to' | 'amount'>): string {
  const value = Number(tx.amount)
  const amount = Number.isFinite(value) ? value.toString() : String(tx.amount).trim()
  return JSON.stringify([tx.from.trim().normalize('NFC').toLowerCase(), tx.to.trim().normalize('NFC').toLowerCase(), amount])
}

export async function hashTransaction(tx: Pick<Transaction, 'from' | 'to' | 'amount'>): Promise<string> {
  return sha256(canonicalTransaction(tx))
}

export async function buildMerkleTree(txs: Transaction[]): Promise<{ levels: string[][]; root: string; proofs: MerkleProofNode[][] }> {
  if (!txs.length) return { levels: [[await sha256('')]], root: await sha256(''), proofs: [] }

  const levels: string[][] = []
  const proofs: MerkleProofNode[][] = txs.map(() => [])
  let indices = txs.map((_, i) => i)

  levels[0] = await Promise.all(txs.map((tx) => hashTransaction(tx)))

  while (levels.at(-1)!.length > 1) {
    const current = levels.at(-1)!
    const next: string[] = []
    for (let i = 0; i < current.length; i += 2) {
      const rightIndex = i + 1 < current.length ? i + 1 : i
      next.push(await sha256(current[i] + current[rightIndex]))
      for (let j = 0; j < indices.length; j++) {
        if (indices[j] === i || indices[j] === rightIndex) {
          proofs[j].push({ hash: current[indices[j] === i ? rightIndex : i], side: indices[j] === i ? 'right' : 'left' })
        }
      }
    }
    for (let j = 0; j < indices.length; j++) {
      indices[j] = Math.floor(indices[j] / 2)
    }
    levels.push(next)
  }

  return { levels, root: levels.at(-1)![0], proofs }
}

export async function verifyProof(txHash: string, proof: MerkleProofNode[], root: string): Promise<boolean> {
  let current = txHash
  for (const step of proof) {
    const combined = step.side === 'left' ? step.hash + current : current + step.hash
    current = await sha256(combined)
  }
  return current === root
}
