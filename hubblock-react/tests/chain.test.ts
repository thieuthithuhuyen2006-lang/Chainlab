import assert from 'node:assert/strict'
import test from 'node:test'
import { createInitialChain, hashBlock, hashTransaction, merkleRoot, mineBlock, validateChain, blockHashPreimage, verifyMerkleProof, merkleTree } from '../src/lib/chain.ts'

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
  // Verify preimage format with "|" separators
  const preimage = blockHashPreimage(block)
  assert.ok(preimage.includes('|'))
  assert.equal(preimage.split('|').length, 6)
})

test('hashTransaction includes nonce in hash (default 0)', () => {
  const tx = { from: 'alice', to: 'bob', amount: '1.5' }
  const hashNoNonce = hashTransaction(tx)
  const hashWithNonce0 = hashTransaction(tx, 0)
  const hashWithNonce1 = hashTransaction(tx, 1)
  assert.equal(hashNoNonce, hashWithNonce0)
  assert.notEqual(hashNoNonce, hashWithNonce1)
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

test('verifyMerkleProof validates correct proofs', () => {
  const hashes = makeHashes(4)
  const { root, proofs } = merkleTree(hashes)
  
  for (let i = 0; i < hashes.length; i++) {
    assert.ok(verifyMerkleProof(hashes[i], proofs[i], root), `Proof ${i} should be valid`)
  }
})

test('verifyMerkleProof rejects tampered leaf', () => {
  const hashes = makeHashes(4)
  const { root, proofs } = merkleTree(hashes)
  const tamperedLeaf = 'f'.repeat(64)
  
  assert.ok(!verifyMerkleProof(tamperedLeaf, proofs[0], root), 'Tampered leaf should fail')
})

test('verifyMerkleProof rejects tampered proof', () => {
  const hashes = makeHashes(4)
  const { root, proofs } = merkleTree(hashes)
  const badProof = [...proofs[0]]
  badProof[0] = { ...badProof[0], hash: 'f'.repeat(64) }
  
  assert.ok(!verifyMerkleProof(hashes[0], badProof, root), 'Tampered proof should fail')
})

test('verifyMerkleProof rejects wrong root', () => {
  const hashes = makeHashes(4)
  const { proofs } = merkleTree(hashes)
  const wrongRoot = 'f'.repeat(64)
  
  assert.ok(!verifyMerkleProof(hashes[0], proofs[0], wrongRoot), 'Wrong root should fail')
})

test('verifyMerkleProof works with odd number of leaves (duplicated last)', () => {
  const hashes = makeHashes(3)
  const { root, proofs } = merkleTree(hashes)
  
  for (let i = 0; i < hashes.length; i++) {
    assert.ok(verifyMerkleProof(hashes[i], proofs[i], root), `Proof ${i} should be valid for 3 leaves`)
  }
})

test('merkleRoot duplicated last node: [A,B,C] and [A,B,C,C] produce same root', () => {
  const three = makeHashes(3)
  const four = [...three, three[2]]
  
  const root3 = merkleRoot(three)
  const root4 = merkleRoot(four)
  
  assert.equal(root3, root4, 'Duplicating last node produces same root (Bitcoin CVE-2012-2459)')
})