import CryptoJS from 'crypto-js'

export type PreimageWorkerRequest =
  | { type: 'start'; targetHash: string; maxLength: number; charset: string }
  | { type: 'cancel' }

export type PreimageWorkerResponse =
  | { type: 'progress'; attempts: number; elapsedMs: number }
  | { type: 'found'; input: string; attempts: number; elapsedMs: number }
  | { type: 'not-found'; attempts: number; elapsedMs: number; maxAttempts: number }
  | { type: 'error'; message: string }

type WorkerScope = {
  onmessage: ((event: MessageEvent<PreimageWorkerRequest>) => void) | null
  postMessage: (message: PreimageWorkerResponse) => void
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

function generateCandidates(charset: string, maxLength: number): Generator<string> {
  function* recurse(current: string): Generator<string> {
    if (current.length > 0) yield current
    if (current.length >= maxLength) return
    for (const char of charset) {
      yield* recurse(current + char)
    }
  }
  return recurse('')
}

async function search(message: PreimageWorkerRequest['start'], runId: number) {
  const startedAt = performance.now()
  let attempts = 0
  const maxAttempts = 10_000_000
  const charset = message.charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  try {
    for (const candidate of generateCandidates(charset, message.maxLength)) {
      if (runId !== activeRun) {
        workerScope.postMessage({ type: 'cancelled' as const })
        return
      }

      const hash = CryptoJS.SHA256(candidate).toString(CryptoJS.enc.Hex)
      attempts += 1

      if (hash === message.targetHash) {
        workerScope.postMessage({
          type: 'found',
          input: candidate,
          attempts,
          elapsedMs: performance.now() - startedAt,
        })
        return
      }

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
      message: error instanceof Error ? error.message : 'Pre-image worker failed.',
    })
  }
}