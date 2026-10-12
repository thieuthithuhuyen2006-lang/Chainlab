import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getActiveValidators,
  getTotalStake,
  getValidatorChance,
  chooseProposer,
  calculateAttestationWeight,
  isAttestationSufficient,
  applyRewards,
  applySlashing,
  detectDoubleSign,
  getSlotInfo,
  formatEth,
  generateRandaoReveal,
  updateRandaoMix,
  type Validator,
  DEFAULT_POS_CONFIG,
} from '../src/lib/pos.ts'

const mockValidators: Validator[] = [
  { id: 'alice', name: 'Alice Chen', address: '0xalice', stake: 32, rewards: 0, slashedAmount: 0, locked: false, offline: false },
  { id: 'bruno', name: 'Bruno Silva', address: '0xbruno', stake: 24, rewards: 0, slashedAmount: 0, locked: false, offline: false },
  { id: 'chika', name: 'Chika Mori', address: '0xchika', stake: 16, rewards: 0, slashedAmount: 0, locked: false, offline: false },
  { id: 'dara', name: 'Dara Nguyen', address: '0xdara', stake: 12, rewards: 0, slashedAmount: 0, locked: false, offline: false },
  { id: 'emil', name: 'Emil Fischer', address: '0xemil', stake: 8, rewards: 0, slashedAmount: 0, locked: false, offline: false },
]

test('getActiveValidators filters locked and offline validators', () => {
  const withLocked = [...mockValidators]
  withLocked[0] = { ...withLocked[0], locked: true }
  withLocked[1] = { ...withLocked[1], offline: true }
  withLocked[2] = { ...withLocked[2], stake: 0 }

  const active = getActiveValidators(withLocked)
  assert.equal(active.length, 2)
  assert.ok(active.every((v) => v.id === 'dara' || v.id === 'emil'))
})

test('getTotalStake sums only active validators', () => {
  const total = getTotalStake(mockValidators)
  assert.equal(total, 92)
})

test('getValidatorChance calculates percentage correctly', () => {
  const totalStake = 92
  const alice = mockValidators[0]
  const chance = getValidatorChance(alice, totalStake)
  assert.ok(Math.abs(chance - (32 / 92 * 100)) < 0.01)

  const lockedValidator = { ...alice, locked: true }
  assert.equal(getValidatorChance(lockedValidator, totalStake), 0)
})

test('chooseProposer selects validator weighted by stake', async () => {
  const randaoMix = '0xabc123'
  const proposer = await chooseProposer(mockValidators, randaoMix, 1)
  assert.ok(proposer !== null)
  assert.ok(['alice', 'bruno', 'chika', 'dara', 'emil'].includes(proposer!.id))
})

test('chooseProposer returns null when no eligible validators', async () => {
  const allLocked = mockValidators.map((v) => ({ ...v, locked: true }))
  const proposer = await chooseProposer(allLocked, 'mix', 1)
  assert.equal(proposer, null)
})

test('calculateAttestationWeight computes correct weight and percentage', () => {
  const attestedIds = ['alice', 'bruno']
  const { weight, percentage } = calculateAttestationWeight(mockValidators, attestedIds)
  assert.equal(weight, 56)
  assert.ok(Math.abs(percentage - (56 / 92 * 100)) < 0.01)
})

test('isAttestationSufficient returns true when threshold met', () => {
  const attestedIds = ['alice', 'bruno', 'chika'] // 72/92 = 78% > 66.7%
  assert.equal(isAttestationSufficient(mockValidators, attestedIds), true)
})

test('isAttestationSufficient returns false when threshold not met', () => {
  const attestedIds = ['alice'] // 32/92 = 35% < 66.7%
  assert.equal(isAttestationSufficient(mockValidators, attestedIds), false)
})

test('isAttestationSufficient uses custom threshold', () => {
  const attestedIds = ['alice', 'bruno'] // 56/92 = 61%
  assert.equal(isAttestationSufficient(mockValidators, attestedIds, 0.5), true)
  assert.equal(isAttestationSufficient(mockValidators, attestedIds, 0.7), false)
})

test('applyRewards distributes proposer and attester rewards', () => {
  const updated = applyRewards(mockValidators, 'alice', ['bruno', 'chika'], DEFAULT_POS_CONFIG)
  const alice = updated.find((v) => v.id === 'alice')!
  const bruno = updated.find((v) => v.id === 'bruno')!
  const chika = updated.find((v) => v.id === 'chika')!
  const dara = updated.find((v) => v.id === 'dara')!

  assert.equal(alice.rewards, DEFAULT_POS_CONFIG.proposerReward)
  assert.equal(bruno.rewards, DEFAULT_POS_CONFIG.attesterReward)
  assert.equal(chika.rewards, DEFAULT_POS_CONFIG.attesterReward)
  assert.equal(dara.rewards, 0)
})

test('applySlashing confiscates stake and locks validator', () => {
  const { validators, confiscatedStake } = applySlashing(mockValidators, 'alice', 0.5)
  const alice = validators.find((v) => v.id === 'alice')!

  assert.equal(confiscatedStake, 16)
  assert.equal(alice.stake, 16)
  assert.equal(alice.slashedAmount, 16)
  assert.equal(alice.locked, true)
})

test('applySlashing with full confiscation', () => {
  const { validators, confiscatedStake } = applySlashing(mockValidators, 'bruno', 1.0)
  const bruno = validators.find((v) => v.id === 'bruno')!

  assert.equal(confiscatedStake, 24)
  assert.equal(bruno.stake, 0)
  assert.equal(bruno.locked, true)
})

test('detectDoubleSign identifies conflicting blocks same slot', () => {
  const evidence = {
    validatorId: 'alice',
    slot: 5,
    blockHash1: '0xaaa',
    blockHash2: '0xbbb',
    signature1: 'sig1',
    signature2: 'sig2',
  }
  assert.equal(detectDoubleSign(evidence, mockValidators), true)
})

test('detectDoubleSign returns false for same block hash', () => {
  const evidence = {
    validatorId: 'alice',
    slot: 5,
    blockHash1: '0xaaa',
    blockHash2: '0xaaa',
    signature1: 'sig1',
    signature2: 'sig2',
  }
  assert.equal(detectDoubleSign(evidence, mockValidators), false)
})

test('detectDoubleSign returns false for different signatures but same block', () => {
  const evidence = {
    validatorId: 'alice',
    slot: 5,
    blockHash1: '0xaaa',
    blockHash2: '0xaaa',
    signature1: 'sig1',
    signature2: 'sig2',
  }
  assert.equal(detectDoubleSign(evidence, mockValidators), false)
})

test('getSlotInfo computes epoch and slot correctly', () => {
  assert.deepEqual(getSlotInfo(0, 32), { slotInEpoch: 0, epoch: 1 })
  assert.deepEqual(getSlotInfo(1, 32), { slotInEpoch: 1, epoch: 1 })
  assert.deepEqual(getSlotInfo(32, 32), { slotInEpoch: 32, epoch: 1 })
  assert.deepEqual(getSlotInfo(33, 32), { slotInEpoch: 1, epoch: 2 })
  assert.deepEqual(getSlotInfo(64, 32), { slotInEpoch: 32, epoch: 2 })
  assert.deepEqual(getSlotInfo(65, 32), { slotInEpoch: 1, epoch: 3 })
})

test('formatEth formats with 3 decimals', () => {
  assert.equal(formatEth(0), '0.000 ETH')
  assert.equal(formatEth(1), '1.000 ETH')
  assert.equal(formatEth(0.5), '0.500 ETH')
  assert.equal(formatEth(1.2345), '1.234 ETH')
})

test('generateRandaoReveal produces 64-char hex string', () => {
  const reveal = generateRandaoReveal()
  assert.equal(reveal.length, 64)
  assert.ok(/^[0-9a-f]{64}$/.test(reveal))
})

test('updateRandaoMix is deterministic', () => {
  const mix1 = updateRandaoMix('initial', 1, 'reveal')
  const mix2 = updateRandaoMix('initial', 1, 'reveal')
  assert.equal(mix1, mix2)
  assert.equal(mix1.length, 64)
})

test('updateRandaoMix changes with different inputs', () => {
  const mix1 = updateRandaoMix('initial', 1, 'reveal')
  const mix2 = updateRandaoMix('initial', 2, 'reveal')
  const mix3 = updateRandaoMix('initial', 1, 'different')
  assert.notEqual(mix1, mix2)
  assert.notEqual(mix1, mix3)
})