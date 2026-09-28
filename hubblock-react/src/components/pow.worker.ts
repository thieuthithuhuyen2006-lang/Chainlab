import CryptoJS from 'crypto-js'

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
}

export type MiningWorkerRequest = MiningStartMessage | { type: 'cancel' }

export type MiningWorkerResponse =
  | { type: 'progress'; workerId: string; attempts: number; latestHash: string }
  | { type: 'found'; workerId: string; walletName: string; validatorAddress: string; nonce: number; hash: string; attempts: number; elapsedMs: number }
  | { type: 'cancelled'; workerId: string }
  | { type: 'error'; workerId: string; message: string }

type WorkerScope = {
  onmessage: ((event: MessageEvent<MiningWorkerRequest>) => void) | null
  postMessage: (message: MiningWorkerResponse) => void
}

const workerScope = self as unknown as WorkerScope
let activeRun = 0

workerScope.onmessage = (event) => {
  if (event.data.type === 'cancel') {
    activeRun += 1
    return
  }

  const runId = ++activeRun
  void mine(event.data, runId)
}

async function mine(message: MiningStartMessage, runId: number) {
  const startedAt = performance.now()
  const requiredPrefix = '0'.repeat(message.difficulty)
  let attempts = 0
  let nonce = message.nonceStart
  let latestHash = ''

  try {
    while (runId === activeRun) {
      latestHash = CryptoJS.SHA256(
        `${message.index}${message.timestamp}${message.previousHash}${message.merkleRoot}${nonce}${message.validatorAddress}`,
      ).toString(CryptoJS.enc.Hex)
      attempts += 1

      if (latestHash.startsWith(requiredPrefix)) {
        workerScope.postMessage({
          type: 'found',
          workerId: message.workerId,
          walletName: message.walletName,
          validatorAddress: message.validatorAddress,
          nonce,
          hash: latestHash,
          attempts,
          elapsedMs: performance.now() - startedAt,
        })
        return
      }

      nonce += message.nonceStride
      if (attempts % 4096 === 0) {
        workerScope.postMessage({ type: 'progress', workerId: message.workerId, attempts, latestHash })
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }

    workerScope.postMessage({ type: 'cancelled', workerId: message.workerId })
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      workerId: message.workerId,
      message: error instanceof Error ? error.message : 'Mining worker failed.',
    })
  }
}