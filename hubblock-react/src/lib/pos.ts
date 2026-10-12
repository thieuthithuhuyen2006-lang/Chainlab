import CryptoJS from 'crypto-js'
import type { Block } from './chain.ts'
import { hashBlock, hashTransaction, merkleRoot } from './chain.ts'

export type Validator = {
  id: string
  name: string
  address: string
  stake: number
  rewards: number
  slashedAmount: number
  locked: boolean
  offline?: boolean
}

export type Attestation = {
  validatorId: string
  slot: number
  blockHash: string
  signature: string
}

export type SlashingEvidence = {
  validatorId: string
  slot: number
  blockHash1: string
  blockHash2: string
  signature1: string
  signature2: string
}

export type PoSConfig = {
  proposerReward: number
  attesterReward: number
  epochLength: number
  slotDurationMs: number
  attestationThreshold: number
}

export const DEFAULT_POS_CONFIG: PoSConfig = {
  proposerReward: 0.02,
  attesterReward: 0.005,
  epochLength: 32,
  slotDurationMs: 12_000,
  attestationThreshold: 2 / 3,
}

export function getActiveValidators(validators: Validator[]): Validator[] {
  return validators.filter((v) => v.stake > 0 && !v.locked && !v.offline)
}

export function getTotalStake(validators: Validator[]): number {
  return getActiveValidators(validators).reduce((sum, v) => sum + v.stake, 0)
}

export function getValidatorChance(validator: Validator, totalStake: number): number {
  if (validator.locked || validator.offline || validator.stake <= 0) return 0
  return totalStake > 0 ? (validator.stake / totalStake) * 100 : 0
}

export async function chooseProposer(validators: Validator[], randaoMix: string, slot: number): Promise<Validator | null> {
  const eligible = getActiveValidators(validators)
  const totalStakeUnits = eligible.reduce((sum, v) => sum + Math.round(v.stake * 1000), 0)
  if (totalStakeUnits === 0) return null

  const encoder = new TextEncoder()
  const data = encoder.encode(`${randaoMix}${slot}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  const randomValue = hashHex.slice(0, 16)
  let draw = Number(BigInt(`0x${randomValue}`) % BigInt(totalStakeUnits))

  for (const validator of eligible) {
    draw -= Math.round(validator.stake * 1000)
    if (draw < 0) return validator
  }
  return eligible[eligible.length - 1]
}

export function calculateAttestationWeight(validators: Validator[], attestedIds: string[]): { weight: number; percentage: number } {
  const active = getActiveValidators(validators)
  const totalStake = getTotalStake(validators)
  const attestedStake = active
    .filter((v) => attestedIds.includes(v.id))
    .reduce((sum, v) => sum + v.stake, 0)
  return {
    weight: attestedStake,
    percentage: totalStake > 0 ? (attestedStake / totalStake) * 100 : 0,
  }
}

export function isAttestationSufficient(validators: Validator[], attestedIds: string[], threshold = 2 / 3): boolean {
  const { percentage } = calculateAttestationWeight(validators, attestedIds)
  return percentage >= threshold * 100
}

export function applyRewards(
  validators: Validator[],
  proposerId: string | null,
  attestedIds: string[],
  config: PoSConfig = DEFAULT_POS_CONFIG
): Validator[] {
  return validators.map((v) => {
    if (v.id === proposerId) return { ...v, rewards: v.rewards + config.proposerReward }
    if (attestedIds.includes(v.id)) return { ...v, rewards: v.rewards + config.attesterReward }
    return v
  })
}

export function createPoSBlock(
  chain: Block[],
  proposer: Validator,
  difficulty: number
): Block {
  const latest = chain.at(-1)!
  const block: Block = {
    index: chain.length,
    timestamp: new Date().toISOString(),
    previousHash: latest.hash,
    transactions: latest.transactions,
    merkleRoot: merkleRoot(latest.transactions.map(hashTransaction)),
    difficulty,
    validator: proposer.address,
    nonce: 0,
    hash: '',
    consensus: 'pos',
  }
  block.hash = hashBlock(block)
  return block
}

export function applySlashing(
  validators: Validator[],
  slashedValidatorId: string,
  slashPercentage: number = 0.5
): { validators: Validator[]; confiscatedStake: number } {
  const target = validators.find((v) => v.id === slashedValidatorId)
  if (!target) return { validators, confiscatedStake: 0 }

  const confiscatedStake = target.stake * slashPercentage
  const newValidators = validators.map((v) =>
    v.id === slashedValidatorId
      ? { ...v, stake: Math.max(0, v.stake - confiscatedStake), slashedAmount: v.slashedAmount + confiscatedStake, locked: true }
      : v
  )
  return { validators: newValidators, confiscatedStake }
}

export function detectDoubleSign(
  evidence: SlashingEvidence,
  validators: Validator[]
): boolean {
  const validator = validators.find((v) => v.id === evidence.validatorId)
  if (!validator) return false
  return evidence.blockHash1 !== evidence.blockHash2 &&
         evidence.slot === evidence.slot &&
         evidence.signature1 !== evidence.signature2
}

export function getSlotInfo(slot: number, epochLength: number): { slotInEpoch: number; epoch: number } {
  if (slot === 0) return { slotInEpoch: 0, epoch: 1 }
  const slotInEpoch = ((slot - 1) % epochLength) + 1
  const epoch = Math.floor((slot - 1) / epochLength) + 1
  return { slotInEpoch, epoch }
}

export function formatEth(value: number): string {
  return `${value.toFixed(3)} ETH`
}

export function generateRandaoReveal(): string {
  const entropy = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(entropy)
  } else {
    for (let i = 0; i < entropy.length; i++) {
      entropy[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function updateRandaoMix(currentMix: string, slot: number, reveal: string): string {
  return CryptoJS.SHA256(`${currentMix}${slot}${reveal}`).toString(CryptoJS.enc.Hex)
}