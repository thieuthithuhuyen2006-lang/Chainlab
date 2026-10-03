import assert from 'node:assert/strict'
import test from 'node:test'
import { sha256, hashTransaction, buildMerkleTree, getMerkleProof, verifyProof, type Transaction } from '../src/lib/merkle.ts'

function transactions(txs: Pick<Transaction, 'from' | 'to' | 'amount'>[]): Transaction[] {
  return txs.map((tx, index) => ({ id: `tx-${index + 1}`, from: tx.from, to: tx.to, amount: tx.amount }))
}

test('sha256 tra ve chuoi hex dung dinh dang va tuong tu', async () => {
  const digest = await sha256('abc')
  assert.equal(digest.length, 64)
  assert.ok(/^[0-9a-f]+$/.test(digest))
  assert.equal(digest, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('sha256 nem loi khi crypto.subtle khong ton tai', async () => {
  const original = (globalThis as any).crypto
  let threw = false
  try {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true })
    await sha256('abc')
  } catch {
    threw = true
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true, writable: true })
  }
  assert.equal(threw, true)
})

test('hashTransaction tao chuoi can hoc tuong doi', () => {
  assert.equal(hashTransaction({ from: 'Alice', to: 'Bob', amount: '1.5' }), 'alice→bob:1.5')
  assert.equal(hashTransaction({ from: ' Alice ', to: 'Bob ', amount: ' 1 ' }), 'alice→bob:1')
})

test('buildMerkleTree xu ly 0 giao dich', async () => {
  const tree = await buildMerkleTree([])
  assert.ok(tree.root)
  assert.equal(tree.levels.length, 1)
  assert.equal(tree.levels[0].length, 1)
})

test('buildMerkleTree xu ly 1 giao dich', async () => {
  const tree = await buildMerkleTree(transactions([{ from: 'alice', to: 'bob', amount: '1' }]))
  assert.equal(tree.levels.length, 1)
  assert.equal(tree.root, tree.levels[0][0])
})

test('buildMerkleTree xu ly 3 giao dich le', async () => {
  const txs = transactions([{ from: 'a', to: 'b', amount: '1' }, { from: 'b', to: 'c', amount: '2' }, { from: 'c', to: 'a', amount: '3' }])
  const tree = await buildMerkleTree(txs)
  assert.equal(tree.levels[0].length, 3)
  assert.equal(tree.levels[1].length, 2)
  assert.equal(tree.levels[2].length, 1)
  assert.ok(tree.root)
})

test('buildMerkleTree xu ly 4 giao dich', async () => {
  const txs = transactions([{ from: 'a', to: 'b', amount: '1' }, { from: 'b', to: 'c', amount: '2' }, { from: 'c', to: 'a', amount: '3' }, { from: 'a', to: 'c', amount: '4' }])
  const tree = await buildMerkleTree(txs)
  assert.equal(tree.levels[0].length, 4)
  assert.equal(tree.levels[1].length, 2)
  assert.equal(tree.levels[2].length, 1)
})

test('getMerkleProof tra ve proof dung cho 4 tx', async () => {
  const txs = transactions([{ from: 'a', to: 'b', amount: '1' }, { from: 'b', to: 'c', amount: '2' }, { from: 'c', to: 'a', amount: '3' }, { from: 'a', to: 'c', amount: '4' }])
  const tree = await buildMerkleTree(txs)

  const proof0 = getMerkleProof(tree.levels, 0)
  assert.equal(proof0.length, 2)
  assert.equal(proof0[0].position, 'right')
  assert.equal(proof0[0].hash, tree.levels[0][1])
  assert.equal(proof0[1].position, 'right')
  assert.equal(proof0[1].hash, tree.levels[1][1])

  const proof3 = getMerkleProof(tree.levels, 3)
  assert.equal(proof3.length, 2)
  assert.equal(proof3[0].position, 'left')
  assert.equal(proof3[0].hash, tree.levels[0][2])
  assert.equal(proof3[1].position, 'left')
  assert.equal(proof3[1].hash, tree.levels[1][0])
})

test('verifyProof tra ve true voi proof hop le', async () => {
  const txs = transactions([{ from: 'a', to: 'b', amount: '1' }, { from: 'b', to: 'c', amount: '2' }])
  const tree = await buildMerkleTree(txs)
  const leafHash = tree.levels[0][0]
  const proof = getMerkleProof(tree.levels, 0)
  assert.equal(await verifyProof(leafHash, proof, tree.root), true)
})

test('verifyProof tra ve false khi sua tx roi verify voi root cu', async () => {
  const txs = transactions([{ from: 'a', to: 'b', amount: '1' }, { from: 'b', to: 'c', amount: '2' }])
  const tree = await buildMerkleTree(txs)
  const leafHash = tree.levels[0][0]
  const proof = getMerkleProof(tree.levels, 0)

  const tamperedLeafHash = await sha256(hashTransaction({ from: 'a', to: 'b', amount: '9' }))
  assert.equal(await verifyProof(tamperedLeafHash, proof, tree.root), false)
})

test('verifyProof tra ve false voi proof rong', async () => {
  const txs = transactions([{ from: 'a', to: 'b', amount: '1' }, { from: 'b', to: 'c', amount: '2' }])
  const tree = await buildMerkleTree(txs)
  assert.equal(await verifyProof(tree.levels[0][0], [], tree.root), false)
})

test('buildMerkleTree + verifyProof dong bo voi 3 tx le', async () => {
  const txs = transactions([{ from: 'a', to: 'b', amount: '1' }, { from: 'b', to: 'c', amount: '2' }, { from: 'c', to: 'a', amount: '3' }])
  const tree = await buildMerkleTree(txs)
  const proof1 = getMerkleProof(tree.levels, 1)
  assert.equal(await verifyProof(tree.levels[0][1], proof1, tree.root), true)
})
