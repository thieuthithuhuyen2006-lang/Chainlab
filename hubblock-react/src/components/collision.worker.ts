import CryptoJS from 'crypto-js'

export type CollisionWorkerRequest =
  | { type: 'start'; truncatedBits: number }
  | { type: 'cancel' }

export type CollisionWorkerResponse =
  | { type: 'progress'; attempts: number; elapsedMs: number }
  | { type: 'found'; input1: string; input2: string; hash: string; attempts: number; elapsedMs: number }
  | { type: 'cancelled' }
  | { type: 'not-found'; attempts: number; elapsedMs: number; maxAttempts: number }
  | { type: 'error'; message: string }

type WorkerScope = {
  onmessage: ((event: MessageEvent<CollisionWorkerRequest>) => void) | null
  postMessage: (message: CollisionWorkerResponse) => void
}

const workerScope = self as unknown as WorkerScope
let activeRun = 0

workerScope.onmessage = (event) => {
  if (event.data.type === 'cancel') {
    activeRun += 1
    return
  }

  const runId = ++activeRun
  void search(event.data, runId)
}

async function search(message: Extract<CollisionWorkerRequest, { type: 'start' }>, runId: number) {
  const startedAt = performance.now()
  let attempts = 0
  const hashMap = new Map<string, string>()
  const maxAttempts = 5_000_000

  try {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    
    function* generateInputs(): Generator<string> {
      let counter = 0
      while (true) {
        // Generate short strings of varying lengths
        const len = 1 + (counter % 6)
        let input = ''
        let temp = counter
        for (let i = 0; i < len; i++) {
          input += charset[temp % charset.length]
          temp = Math.floor(temp / charset.length)
        }
        counter++
        yield input
      }
    }

    for (const input of generateInputs()) {
      if (runId !== activeRun) {
        workerScope.postMessage({ type: 'cancelled' })
        return
      }

      const fullHash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex)
      const truncatedHash = fullHash.slice(0, message.truncatedBits / 4)

      if (hashMap.has(truncatedHash)) {
        const existingInput = hashMap.get(truncatedHash)!
        if (existingInput !== input) {
          workerScope.postMessage({
            type: 'found',
            input1: existingInput,
            input2: input,
            hash: truncatedHash,
            attempts,
            elapsedMs: performance.now() - startedAt,
          })
          return
        }
      } else {
        hashMap.set(truncatedHash, input)
      }

      attempts += 1

      if (attempts % 50000 === 0) {
        workerScope.postMessage({ type: 'progress', attempts, elapsedMs: performance.now() - startedAt })
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      if (attempts >= maxAttempts) {
        workerScope.postMessage({ type: 'not-found', attempts, elapsedMs: performance.now() - startedAt, maxAttempts })
        return
      }
    }
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Collision worker failed.',
    })
  }
}