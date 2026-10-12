import type { SoundKind } from './sound'

export type Burst = { id: number; x: number; y: number; kind: SuccessKind }
export type SuccessKind = 'success' | 'verified' | 'mined' | 'transaction' | 'error'

const BURST_KINDS: SoundKind[] = ['success', 'verified', 'mined', 'transaction', 'error']
const listenerSet = new Set<(burst: Burst) => void>()
let nextId = 1
let pointer = { x: 0, y: 0 }

if (typeof window !== 'undefined') {
  const remember = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY } }
  window.addEventListener('pointerdown', remember, { passive: true })
}

function isBurstKind(kind: SoundKind): kind is SuccessKind {
  return BURST_KINDS.includes(kind)
}

export function announceAction(kind: SoundKind) {
  if (!isBurstKind(kind)) return
  const burst = { id: nextId++, x: pointer.x, y: pointer.y, kind }
  listenerSet.forEach((listener) => listener(burst))
}

export function onBurst(listener: (burst: Burst) => void) {
  listenerSet.add(listener)
  return () => { listenerSet.delete(listener) }
}
