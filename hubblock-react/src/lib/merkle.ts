export type Transaction = {
  from: string
  to: string
  amount: string
}

export type MerkleProofNode = { hash: string; position: 'left' | 'right' }

export async function sha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) khong kha dung trong moi truong nay.')
  }
  const data = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function hashTransaction(tx: Pick<Transaction, 'from' | 'to' | 'amount'>): string {
  return `${tx.from.trim().toLowerCase()}→${tx.to.trim().toLowerCase()}:${tx.amount.trim()}`
}

export async function buildMerkleTree(txs: Transaction[]): Promise<{ levels: string[][]; root: string }> {
  if (!txs.length) return { levels: [[await sha256('')]], root: await sha256('') }

  const levels: string[][] = []
  levels[0] = await Promise.all(txs.map((tx) => sha256(hashTransaction(tx))))

  let current = levels[0]
  while (current.length > 1) {
    const next: string[] = []
    for (let i = 0; i < current.length; i += 2) {
      const rightIndex = i + 1 < current.length ? i + 1 : i
      next.push(await sha256(current[i] + current[rightIndex]))
    }
    levels.push(next)
    current = next
  }

  return { levels, root: levels.at(-1)![0] }
}

export function getMerkleProof(levels: string[][], leafIndex: number): MerkleProofNode[] {
  const proof: MerkleProofNode[] = []
  if (levels.length <= 1) return proof

  for (let level = 0; level < levels.length - 1; level++) {
    const current = levels[level]
    const isRight = leafIndex % 2 === 1
    const siblingIndex = isRight ? leafIndex - 1 : leafIndex + 1
    const siblingHash = current[siblingIndex] ?? current[leafIndex]
    proof.push({ hash: siblingHash, position: isRight ? 'left' : 'right' })
    leafIndex = Math.floor(leafIndex / 2)
  }

  return proof
}

export async function verifyProof(leafHash: string, proof: MerkleProofNode[], root: string): Promise<boolean> {
  let current = leafHash
  for (const step of proof) {
    const combined = step.position === 'left' ? step.hash + current : current + step.hash
    current = await sha256(combined)
  }
  return current === root
}
