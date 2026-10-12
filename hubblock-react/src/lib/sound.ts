import { announceAction } from './effects'

export type SoundKind = 'click' | 'transaction' | 'success' | 'error' | 'verified' | 'mined' | 'chirp' | 'undo'

const STORAGE_KEY = 'hubblock-sound'
const MASTER_GAIN = 0.16

type Tone = { freq: number; start: number; duration: number; type?: OscillatorType; gain?: number; slideTo?: number }

const SCORES: Record<SoundKind, Tone[]> = {
  click: [{ freq: 1180, start: 0, duration: 0.045, gain: 0.5 }],
  transaction: [{ freq: 760, start: 0, duration: 0.07 }, { freq: 1140, start: 0.07, duration: 0.09 }],
  success: [{ freq: 660, start: 0, duration: 0.09 }, { freq: 990, start: 0.09, duration: 0.14 }],
  error: [{ freq: 300, start: 0, duration: 0.13, type: 'triangle', slideTo: 190 }, { freq: 220, start: 0.13, duration: 0.2, type: 'triangle', slideTo: 150 }],
  verified: [{ freq: 523, start: 0, duration: 0.08 }, { freq: 659, start: 0.08, duration: 0.08 }, { freq: 784, start: 0.16, duration: 0.16 }],
  mined: [{ freq: 392, start: 0, duration: 0.1 }, { freq: 523, start: 0.1, duration: 0.1 }, { freq: 659, start: 0.2, duration: 0.1 }, { freq: 784, start: 0.3, duration: 0.24 }],
  chirp: [{ freq: 1500, start: 0, duration: 0.05, type: 'sine', gain: 0.7, slideTo: 2400 }, { freq: 1600, start: 0.09, duration: 0.05, type: 'sine', gain: 0.7, slideTo: 2500 }],
  undo: [{ freq: 520, start: 0, duration: 0.07, gain: 0.6 }, { freq: 400, start: 0.07, duration: 0.1, gain: 0.6 }],
}

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  if (context.state === 'suspended') void context.resume()
  return context
}

export function isSoundMuted(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'off'
}

export function setSoundMuted(muted: boolean) {
  localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on')
}

export function playSound(kind: SoundKind) {
  announceAction(kind)
  if (isSoundMuted()) return
  const audio = getContext()
  if (!audio) return
  const now = audio.currentTime
  for (const tone of SCORES[kind]) {
    const oscillator = audio.createOscillator()
    const envelope = audio.createGain()
    oscillator.type = tone.type ?? 'sine'
    oscillator.frequency.setValueAtTime(tone.freq, now + tone.start)
    if (tone.slideTo) oscillator.frequency.exponentialRampToValueAtTime(tone.slideTo, now + tone.start + tone.duration)
    const peak = MASTER_GAIN * (tone.gain ?? 1)
    envelope.gain.setValueAtTime(0.0001, now + tone.start)
    envelope.gain.exponentialRampToValueAtTime(peak, now + tone.start + 0.012)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration)
    oscillator.connect(envelope).connect(audio.destination)
    oscillator.start(now + tone.start)
    oscillator.stop(now + tone.start + tone.duration + 0.02)
  }
}
