import CryptoJS from 'crypto-js'

export const sha256 = (value) => CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex)

export function makeBlockHash(block) {
  return sha256([
    block.index,
    block.timestamp,
    block.prevHash,
    block.merkleRoot,
    block.nonce,
    block.validator,
  ].join(''))
}

export function makeMerkleTree(items) {
  if (!items.length) return []
  const levels = [items.map((item) => sha256(item))]
  while (levels.at(-1).length > 1) {
    const current = levels.at(-1)
    const next = []
    for (let index = 0; index < current.length; index += 2) {
      next.push(sha256(current[index] + (current[index + 1] ?? current[index])))
    }
    levels.push(next)
  }
  return levels
}

export function makeMerkleRoot(transactions) {
  return makeMerkleTree(transactions).at(-1)?.[0] ?? sha256('')
}

export function makeInitialChain() {
  const now = Date.now()
  const entries = [
    {
      transactions: ['Genesis block · Chainlab network'],
      validator: `0x${'0'.repeat(40)}`,
    },
    {
      transactions: ['Alice → Bob · 12.50 CHAIN', 'Bob → Alice · 0.80 CHAIN'],
      validator: `0x${'7a3f'.padEnd(40, '1')}`,
    },
    {
      transactions: ['Carol → David · 4.20 CHAIN', 'David → Eve · 0.35 CHAIN'],
      validator: `0x${'2b8e'.padEnd(40, '2')}`,
    },
    {
      transactions: ['Eve → Finn · 1.75 CHAIN', 'Finn → Alice · 0.20 CHAIN'],
      validator: `0x${'91c2'.padEnd(40, '3')}`,
    },
  ]
  let previousHash = '0'.repeat(64)
  return entries.map((entry, index) => {
    const block = {
      index,
      timestamp: now + index * 12_000,
      prevHash: previousHash,
      transactions: entry.transactions,
      merkleRoot: makeMerkleRoot(entry.transactions),
      nonce: 0,
      validator: entry.validator,
    }
    block.hash = makeBlockHash(block)
    previousHash = block.hash
    return block
  })
}

export function getChainValidity(chain) {
  return chain.map((block, index) => {
    const expectedPrevious = index === 0 ? '0'.repeat(64) : makeBlockHash(chain[index - 1])
    return block.prevHash === expectedPrevious && block.hash === makeBlockHash(block)
  })
}

export function remineChain(chain) {
  let previousHash = '0'.repeat(64)
  return chain.map((block) => {
    const updated = {
      ...block,
      prevHash: previousHash,
      merkleRoot: makeMerkleRoot(block.transactions),
      nonce: block.nonce + 1,
    }
    updated.hash = makeBlockHash(updated)
    previousHash = updated.hash
    return updated
  })
}