import assert from 'node:assert/strict'
import test from 'node:test'
import { attackSuccessProbability, difficultyRetarget, feeRate, sortByFeeRate, selectForBlock, selectUtxos, poissonProbability } from '../src/lib/advanced.ts'

test('poissonProbability matches known values', () => {
  assert.ok(Math.abs(poissonProbability(1, 0) - Math.exp(-1)) < 1e-10)
  assert.ok(Math.abs(poissonProbability(2, 1) - 2 * Math.exp(-2)) < 1e-10)
  assert.ok(Math.abs(poissonProbability(0, 0) - 1) < 1e-10)
})

test('attackSuccessProbability follows Bitcoin whitepaper', () => {
  assert.ok(attackSuccessProbability(0.1, 0) > 0.9)
  assert.ok(attackSuccessProbability(0.1, 1) > attackSuccessProbability(0.1, 6))
  assert.ok(attackSuccessProbability(0.1, 6) < 0.001)
  assert.ok(attackSuccessProbability(0.45, 10) > attackSuccessProbability(0.1, 10))
  assert.equal(attackSuccessProbability(0, 5), 0)
  assert.equal(attackSuccessProbability(1, 5), 1)
})

test('difficultyRetarget adjusts toward target time', () => {
  assert.ok(Math.abs(difficultyRetarget(100, 1209600) - 100) < 1e-9)
  assert.ok(Math.abs(difficultyRetarget(100, 2419200) - 50) < 1e-9)
  assert.ok(Math.abs(difficultyRetarget(100, 604800) - 200) < 1e-9)
})

test('difficultyRetarget clamps adjustment to 4x', () => {
  assert.ok(Math.abs(difficultyRetarget(100, 1209600 * 8) - 25) < 1e-9)
  assert.ok(Math.abs(difficultyRetarget(100, 1209600 / 8) - 400) < 1e-9)
})

test('feeRate computes satoshi per virtual byte', () => {
  assert.ok(Math.abs(feeRate({ id: 'a', fee: 1000, vbytes: 250 }) - 4) < 1e-9)
  assert.equal(feeRate({ id: 'b', fee: 100, vbytes: 0 }), 0)
})

test('sortByFeeRate orders descending and does not mutate input', () => {
  const input = [
    { id: 'low', fee: 100, vbytes: 200 },
    { id: 'high', fee: 300, vbytes: 100 },
    { id: 'mid', fee: 200, vbytes: 200 },
  ]
  const sorted = sortByFeeRate(input)
  assert.deepEqual(sorted.map((tx) => tx.id), ['high', 'mid', 'low'])
  assert.deepEqual(input.map((tx) => tx.id), ['low', 'high', 'mid'])
})

test('selectForBlock picks highest fee-rate transactions within block limit', () => {
  const txs = [
    { id: 'a', fee: 100, vbytes: 100 },
    { id: 'b', fee: 400, vbytes: 100 },
    { id: 'c', fee: 150, vbytes: 100 },
  ]
  const result = selectForBlock(txs, 200)
  assert.deepEqual(result.selected.map((tx) => tx.id), ['b', 'c'])
  assert.equal(result.totalFee, 550)
  assert.equal(result.usedVbytes, 200)
})

test('selectUtxos uses greedy largest-first selection', () => {
  const utxos = [
    { txId: 'a', amount: 1 },
    { txId: 'b', amount: 5 },
    { txId: 'c', amount: 3 },
  ]
  const result = selectUtxos(utxos, 6)
  assert.deepEqual(result.selected.map((u) => u.txId), ['b', 'c'])
  assert.equal(result.total, 8)
  assert.equal(result.change, 2)
})

test('selectUtxos returns empty when target is zero', () => {
  const result = selectUtxos([{ txId: 'a', amount: 1 }], 0)
  assert.deepEqual(result.selected, [])
  assert.equal(result.total, 0)
  assert.equal(result.change, 0)
})
