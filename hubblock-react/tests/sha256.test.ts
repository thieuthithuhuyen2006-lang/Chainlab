import assert from 'node:assert/strict'
import test from 'node:test'
import { countDifferentBits, formatHash, sha256 } from '../src/lib/sha256.ts'

test('sha256 matches the standard empty and abc vectors', async () => {
  assert.equal(await sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('counts differing bits in hexadecimal digests', () => {
  assert.equal(countDifferentBits('00ff', '01fe'), 2)
})

test('formats hashes into groups of eight characters', () => {
  assert.deepEqual(formatHash('1234567890abcdef'), ['12345678', '90abcdef'])
})