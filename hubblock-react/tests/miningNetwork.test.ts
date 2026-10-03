import assert from 'node:assert/strict'
import test from 'node:test'
import { hashBlock, hashTransaction, merkleRoot, type Block, type Transaction } from '../src/lib/chain.ts'
import { canCoverTransactions, nonceForWorker, selectLongestChain, validatePeerBlock } from '../src/lib/miningNetwork.ts'
import { createInitialChain } from '../src/lib/chain.ts'

test('nonce partitions do not overlap and match the worker interleaving example', () => {
  for (let workers = 2; workers <= 8; workers += 1) {
    const values = Array.from({ length: workers }, (_, worker) => Array.from({ length: 120 }, (_, attempt) => nonceForWorker(worker, workers, attempt))).flat()
    assert.equal(new Set(values).size, values.length)
  }
  assert.equal(nonceForWorker(1, 4, 53), 213)
  assert.equal(nonceForWorker(0, 4, 0), 4)
})

test('fork resolution chooses the longest chain and keeps the first on ties', () => {
  const short = [1, 2]
  const long = [1, 2, 3]
  assert.equal(selectLongestChain([short, long]), long)
  assert.equal(selectLongestChain([long, [4, 5, 6]]), long)
})

test('peer validation rejects malformed blocks and invalid transaction signatures', () => {
  const chain = createInitialChain(0)
  const transaction: Transaction = { id: 'peer-tx', from: chain[0].transactions[0].from, to: chain[0].transactions[0].to, amount: '0.5', signatureStatus: 'signed' }
  const candidate: Block = {
    index: chain.length,
    timestamp: new Date(0).toISOString(),
    previousHash: chain.at(-1)!.hash,
    transactions: [transaction],
    merkleRoot: merkleRoot([hashTransaction(transaction)]),
    difficulty: 0,
    validator: '0xminer',
    nonce: 1,
    hash: '',
  }
  candidate.hash = hashBlock(candidate)
  assert.equal(validatePeerBlock(candidate, chain, 0, true).valid, true)
  assert.equal(validatePeerBlock(candidate, chain, 0, false).reason, 'Transaction signature, nonce or balance is invalid.')
  assert.equal(validatePeerBlock({ ...candidate, hash: 'f'.repeat(64) }, chain, 0, true).reason, 'Block hash is invalid.')
})

test('balance validation rejects spending beyond available funds', () => {
  const accounts = [
    { address: 'alice', balance: 1, nonce: 0 },
    { address: 'bob', balance: 0, nonce: 0 },
  ]
  assert.equal(canCoverTransactions(accounts, [{ from: 'alice', to: 'bob', amount: '0.7' }]).valid, true)
  assert.equal(canCoverTransactions(accounts, [{ from: 'alice', to: 'bob', amount: '0.7' }, { from: 'alice', to: 'bob', amount: '0.7' }]).reason, 'Insufficient balance.')
})

test('buildMerkleTree computes real SHA-256 hashes and odd-leaf duplication', async () => {
  const { buildMerkleTree, verifyProof } = await import('../src/lib/merkle.ts')
  const txs = [
    { id: 'tx-1', from: 'alice', to: 'bob', amount: '1', signatureStatus: 'unsigned' },
    { id: 'tx-2', from: 'bob', to: 'carol', amount: '0.5', signatureStatus: 'unsigned' },
    { id: 'tx-3', from: 'carol', to: 'alice', amount: '0.2', signatureStatus: 'unsigned' },
  ]
  const tree = await buildMerkleTree(txs)
  assert.equal(tree.levels.length, 3)
  assert.equal(tree.levels[0].length, 3)
  assert.equal(tree.levels[1].length, 2)
  assert.equal(tree.levels[2].length, 1)
  assert.equal(tree.root.length, 64)
  assert.ok(tree.root !== await import('../src/lib/chain.ts').then(m => m.sha256('')))
  assert.equal(tree.proofs.length, 3)
  assert.equal(tree.proofs[0].length, 2)
  assert.equal(tree.proofs[0][0].side, 'right')
  assert.equal(tree.proofs[0][1].side, 'right')
  assert.equal(tree.proofs[2].length, 2)
  assert.equal(tree.proofs[2][0].side, 'right')
  assert.equal(tree.proofs[2][1].side, 'left')
  assert.equal(await verifyProof(tree.levels[0][0], tree.proofs[0], tree.root), true)
  assert.equal(await verifyProof(tree.levels[0][2], tree.proofs[2], tree.root), true)
})

test('verifyProof validates valid proof and rejects tampered proof', async () => {
  const { buildMerkleTree, verifyProof } = await import('../src/lib/merkle.ts')
  const txs = [
    { id: 'tx-1', from: 'alice', to: 'bob', amount: '1', signatureStatus: 'unsigned' },
    { id: 'tx-2', from: 'bob', to: 'carol', amount: '0.5', signatureStatus: 'unsigned' },
  ]
  const tree = await buildMerkleTree(txs)
  const txHash = tree.levels[0][0]
  assert.equal(await verifyProof(txHash, tree.proofs[0], tree.root), true)
  assert.equal(await verifyProof(txHash, [], tree.root), false)
  assert.equal(await verifyProof('0'.repeat(64), tree.proofs[0], tree.root), false)
})

test('buildMerkleTree handles single transaction', async () => {
  const { buildMerkleTree } = await import('../src/lib/merkle.ts')
  const txs = [{ id: 'tx-1', from: 'alice', to: 'bob', amount: '1', signatureStatus: 'unsigned' }]
  const tree = await buildMerkleTree(txs)
  assert.equal(tree.levels.length, 1)
  assert.equal(tree.root, tree.levels[0][0])
  assert.equal(tree.proofs.length, 1)
  assert.equal(tree.proofs[0].length, 0)
})
