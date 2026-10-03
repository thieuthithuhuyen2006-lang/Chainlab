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