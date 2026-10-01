import assert from 'node:assert/strict'
import test from 'node:test'
import { createInitialChain, hashBlock, hashTransaction, merkleRoot, mineBlock, validateChain } from '../src/lib/chain.ts'

const makeHashes = (count: number) => Array.from({ length: count }, (_, index) => hashTransaction({ from: `A${index}`, to: `B${index}`, amount: String(index + 1) }))

test('Merkle root supports one through five transaction hashes', () => {
  for (let count = 1; count <= 5; count += 1) {
    const hashes = makeHashes(count)
    assert.match(merkleRoot(hashes), /^[a-f\d]{64}$/)
    assert.equal(merkleRoot(hashes), merkleRoot([...hashes]))
  }
  assert.notEqual(merkleRoot(makeHashes(3)), merkleRoot(makeHashes(4)))
})

test('block hash is deterministic and follows the current V2 serialization', () => {
  const block = createInitialChain(0)[1]
  assert.equal(hashBlock(block), hashBlock({ ...block }))
  assert.equal(block.hash, hashBlock(block))
})

test('chain validation reports stored hash, Merkle, previous hash and PoW errors independently', () => {
  const makeChain = () => createInitialChain(0)

  const badHash = makeChain()
  badHash[1] = { ...badHash[1], hash: 'f'.repeat(64) }
  assert.deepEqual(validateChain(badHash, 0)[1].reasons, ['Hash tính lại không khớp hash đã lưu.'])

  const badMerkle = makeChain()
  badMerkle[0] = { ...badMerkle[0], merkleRoot: 'f'.repeat(64) }
  badMerkle[0].hash = hashBlock({ ...badMerkle[0], merkleRoot: merkleRoot(badMerkle[0].transactions.map(hashTransaction)) })
  assert.deepEqual(validateChain(badMerkle, 0)[0].reasons, ['Merkle root không khớp danh sách giao dịch.'])

  const badPrevious = makeChain()
  badPrevious[1] = { ...badPrevious[1], previousHash: 'f'.repeat(64) }
  badPrevious[1].hash = hashBlock(badPrevious[1])
  assert.deepEqual(validateChain(badPrevious, 0)[1].reasons, ['Previous hash không khớp block trước.'])

  const badPow = makeChain()
  badPow[1] = { ...badPow[1], nonce: 0 }
  badPow[1].hash = hashBlock(badPow[1])
  assert.deepEqual(validateChain(badPow, 0)[1].reasons, ['Nonce/hash chưa đạt difficulty 0.'])
})

test('mineBlock finds a nonce that meets the requested difficulty', () => {
  const block = createInitialChain(0)[1]
  const mined = mineBlock({ ...block, nonce: 1, hash: '' }, 3)
  assert.ok(mined)
  assert.ok(mined.attempts >= 1)
  assert.ok(mined.block.nonce > 0)
  assert.ok(mined.block.hash.startsWith('000'))
  assert.equal(hashBlock(mined.block), mined.block.hash)
})