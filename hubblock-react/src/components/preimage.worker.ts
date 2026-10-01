export type PreimageWorkerRequest =
  | { type: 'start'; targetPrefix: string; maxLength: number; charset: string }
  | { type: 'cancel' }

export type PreimageWorkerResponse =
  | { type: 'progress'; attempts: number; elapsedMs: number; latest: string }
  | { type: 'found'; input: string; attempts: number; elapsedMs: number }
  | { type: 'not-found'; attempts: number; elapsedMs: number; maxAttempts: number }
  | { type: 'cancelled' }
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

async function search(message: Extract<PreimageWorkerRequest, { type: 'start' }>, runId: number) {
  const startedAt = performance.now()
  let attempts = 0
  const maxAttempts = 5_000_000
  const charset = message.charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const encoder = new TextEncoder()

  try {
    for (const candidate of generateCandidates(charset, message.maxLength)) {
      if (runId !== activeRun) {
        workerScope.postMessage({ type: 'cancelled' })
        return
      }

      const digest = await crypto.subtle.digest('SHA-256', encoder.encode(candidate))
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
      attempts += 1

      if (hash.startsWith(message.targetPrefix.toLowerCase())) {
        workerScope.postMessage({
          type: 'found',
          input: candidate,
          attempts,
          elapsedMs: performance.now() - startedAt,
        })
        return
      }

      if (attempts % 256 === 0) {
        workerScope.postMessage({ type: 'progress', attempts, elapsedMs: performance.now() - startedAt, latest: candidate })
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