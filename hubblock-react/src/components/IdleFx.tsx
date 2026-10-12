import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { onBurst, type Burst } from '../lib/effects'
import { useLanguage } from '../lib/useLanguage'

const IDLE_MS = 10000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
const PARTICLES = 10

const TONES: Record<Burst['kind'], string[]> = {
  success: ['#86efac', '#a78bfa', '#f0abfc'],
  verified: ['#6ee7b7', '#34d399', '#a78bfa'],
  mined: ['#fcd34d', '#fbbf24', '#f0abfc'],
  transaction: ['#7dd3fc', '#a78bfa', '#e9d5ff'],
  error: ['#fb7185', '#f43f5e', '#fda4af'],
}

function BurstFx({ burst }: { burst: Burst }) {
  const colors = TONES[burst.kind]
  const particles = useMemo(() => Array.from({ length: PARTICLES }, (_, index) => {
    const angle = (Math.PI * 2 * index) / PARTICLES + Math.random() * 0.4
    const distance = 26 + Math.random() * 34
    return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance, color: colors[index % colors.length], size: 3 + Math.random() * 4 }
  }), [burst.id])
  return (
    <span className="pointer-events-none fixed z-[60]" style={{ left: burst.x, top: burst.y }} aria-hidden="true">
      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full"
          style={{ width: particle.size, height: particle.size, backgroundColor: particle.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{ x: particle.dx, y: particle.dy, opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}

function IdleAura() {
  const language = useLanguage()
  const orbs = useMemo(() => Array.from({ length: 6 }, (_, index) => ({
    size: 140 + index * 46,
    left: `${(index * 17 + 6) % 88}%`,
    top: `${(index * 27 + 10) % 74}%`,
    hue: ['rgba(168,85,247,0.16)', 'rgba(56,189,248,0.13)', 'rgba(244,114,182,0.12)', 'rgba(110,231,183,0.12)'][index % 4],
    duration: 9 + index * 2,
  })), [])
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
      aria-hidden="true"
    >
      {orbs.map((orb, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full blur-3xl"
          style={{ width: orb.size, height: orb.size, left: orb.left, top: orb.top, background: `radial-gradient(circle, ${orb.hue}, transparent 70%)` }}
          animate={{ x: [0, 34, -22, 0], y: [0, -26, 18, 0], scale: [1, 1.14, 0.94, 1] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <motion.span
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(168,85,247,0.14), transparent 60%)' }}
        animate={{ opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-6 flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <span className="rounded-full border border-violet-300/25 bg-slate-900/80 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-violet-200 backdrop-blur-md">
          {language === 'VN' ? 'Chíp đang chờ bạn quay lại…' : 'Chíp is waiting for you…'}
        </span>
      </motion.div>
    </motion.div>
  )
}

export default function IdleFx() {
  const reducedMotion = useReducedMotion()
  const [idle, setIdle] = useState(false)
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    if (reducedMotion) return
    return onBurst((burst) => {
      setBursts((current) => [...current, burst])
      window.setTimeout(() => setBursts((current) => current.filter((item) => item.id !== burst.id)), 900)
    })
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS)
    const wake = () => {
      window.clearTimeout(timer)
      setIdle(false)
      timer = window.setTimeout(() => setIdle(true), IDLE_MS)
    }
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, wake, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, wake)
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <>
      <AnimatePresence>{idle && <IdleAura key="idle-aura" />}</AnimatePresence>
      {bursts.map((burst) => <BurstFx key={burst.id} burst={burst} />)}
    </>
  )
}
