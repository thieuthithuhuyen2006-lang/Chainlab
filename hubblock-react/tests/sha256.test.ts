import assert from 'node:assert/strict'
import test from 'node:test'
import { countDifferentBits, formatHash, sha256 } from '../src/lib/sha256.ts'
import { sha256 as sha256Sync } from '../src/lib/chain.ts'

const testVectors = [
  '',
  'abc',
  'Hello, World!',
  'Blockchain',
  '🚀',
  'Tiếng Việt có dấu',
  'Xin chào Việt Nam',
  '🇻🇳 Việt Nam',
  'A'.repeat(1000),
  '😀'.repeat(100),
  'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
  'Mixed: Hello 世界 123 🌍',
  'Newlines\nand\ttabs',
  'Trailing spaces   ',
  'Leading and trailing',
  'UPPERCASE and lowercase',
  'Numbers 1234567890',
  'JSON: {"key":"value","num":42}',
  'Very long string: ' + 'x'.repeat(5000),
  'Empty after trim:   ',
]

test('sha256 matches the standard empty and abc vectors', async () => {
  assert.equal(await sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('sha256 CryptoJS and WebCrypto produce identical results for various inputs', async () => {
  for (const input of testVectors) {
    const webCryptoHash = await sha256(input)
    const cryptoJsHash = sha256Sync(input)
    assert.equal(webCryptoHash, cryptoJsHash, `Mismatch for input: ${JSON.stringify(input).slice(0, 50)}`)
  }
})

test('counts differing bits in hexadecimal digests', () => {
  assert.equal(countDifferentBits('00ff', '01fe'), 2)
})

test('formats hashes into groups of eight characters', () => {
  assert.deepEqual(formatHash('1234567890abcdef'), ['12345678', '90abcdef'])
})