import { hashBlock } from '../lib/chain'

export type MiningStartMessage = {
  type: 'start'
  workerId: string
  walletName: string
  validatorAddress: string
  index: number
  timestamp: string
  previousHash: string
  merkleRoot: string
  nonceStart: number
  nonceStride: number
  difficulty: number
  hashPower: 25 | 50 | 100
  slowMode: boolean
}

export type MiningWorkerRequest = MiningStartMessage | { type: 'cancel' }
export type MiningWorkerResponse =
  | { type: 'progress' | 'cancelled'; workerId: string; nonce: number; attempts: number; latestHash: string; hashesPerSecond: number; elapsedMs: number }
  | { type: 'found'; workerId: string; walletName: string; validatorAddress: string; nonce: number; hash: string; attempts: number; hashesPerSecond: number; elapsedMs: number }
  | { type: 'error'; workerId: string; message: string }

type WorkerScope = { onmessage: ((event: MessageEvent<MiningWorkerRequest>) => void) | null; postMessage: (message: MiningWorkerResponse) => void }
const workerScope = self as unknown as WorkerScope
let activeRun = 0

workerScope.onmessage = (event) => {
  if (event.data.type === 'cancel') {
    activeRun += 1
    return
  }
  void mine(event.data, ++activeRun)
}

async function mine(message: MiningStartMessage, runId: number) {
  const startedAt = performance.now()
  const prefix = '0'.repeat(message.difficulty)
  const workBatch = Math.max(1, Math.round(message.hashPower / 2))
  let attempts = 0
  let batchAttempts = 0
  let nonce = message.nonceStart
  let latestHash = ''
  let nextUpdateAt = startedAt + 100

  const report = (type: 'progress' | 'cancelled') => {
    const elapsedMs = performance.now() - startedAt
    workerScope.postMessage({ type, workerId: message.workerId, nonce, attempts, latestHash, hashesPerSecond: elapsedMs > 0 ? attempts / elapsedMs * 1000 : 0, elapsedMs })
  }

  try {
    while (runId === activeRun) {
      latestHash = hashBlock({ index: message.index, timestamp: message.timestamp, previousHash: message.previousHash, merkleRoot: message.merkleRoot, nonce, validator: message.validatorAddress })
      attempts += 1
      batchAttempts += 1
      if (latestHash.startsWith(prefix)) {
        const elapsedMs = performance.now() - startedAt
        workerScope.postMessage({ type: 'found', workerId: message.workerId, walletName: message.walletName, validatorAddress: message.validatorAddress, nonce, hash: latestHash, attempts, hashesPerSecond: elapsedMs > 0 ? attempts / elapsedMs * 1000 : 0, elapsedMs })
        return
      }
      nonce += message.nonceStride
      const now = performance.now()
      if (now >= nextUpdateAt) {
        report('progress')
        nextUpdateAt = now + 100
      }
      if (batchAttempts >= workBatch) {
        batchAttempts = 0
        await new Promise((resolve) => setTimeout(resolve, message.slowMode ? 100 : 0))
      }
    }
    report('cancelled')
  } catch (error) {
    workerScope.postMessage({ type: 'error', workerId: message.workerId, message: error instanceof Error ? error.message : 'Mining worker failed.' })
  }
}