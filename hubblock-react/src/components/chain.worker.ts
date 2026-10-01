import { hashTransaction, merkleRoot, mineBlock, type Block } from '../lib/chain'

type Request = { type: 'remine'; chain: Block[]; startIndex: number; difficulty: number } | { type: 'cancel' }
type Response =
  | { type: 'block'; index: number; attempts: number; elapsedMs: number }
  | { type: 'done'; chain: Block[] }
  | { type: 'error'; message: string }

const worker = self as unknown as { onmessage: ((event: MessageEvent<Request>) => void) | null; postMessage: (message: Response) => void }
let activeJob = 0

worker.onmessage = (event) => {
  if (event.data.type === 'cancel') {
    activeJob += 1
    return
  }
  const job = ++activeJob
  void run(event.data, job)
}

async function run(request: Extract<Request, { type: 'remine' }>, job: number) {
  try {
    const chain = request.chain.slice(0, request.startIndex)
    let previousHash = request.startIndex === 0 ? '0'.repeat(64) : chain[request.startIndex - 1].hash
    for (let index = request.startIndex; index < request.chain.length; index += 1) {
      if (job !== activeJob) return
      const source = request.chain[index]
      const candidate: Block = {
        ...source,
        previousHash,
        merkleRoot: merkleRoot(source.transactions.map(hashTransaction)),
        difficulty: request.difficulty,
        nonce: index === 0 ? 0 : 1,
        hash: '',
      }
      const mined = mineBlock(candidate, request.difficulty)!
      chain.push(mined.block)
      previousHash = mined.block.hash
      worker.postMessage({ type: 'block', index, attempts: mined.attempts, elapsedMs: mined.elapsedMs })
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    if (job === activeJob) worker.postMessage({ type: 'done', chain })
  } catch (error) {
    if (job === activeJob) worker.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Block mining failed.' })
  }
}