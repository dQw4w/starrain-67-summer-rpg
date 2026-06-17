import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import BossImage from './BossImage'

const TOTAL_HP = 60
const GRACE_MS = 600  // ignore all touches for this long after mount

type Hit = { id: number; x: number; y: number }

interface Props {
  bossId: number
  bossEmoji: string
  bossName: string
  onVictory: () => Promise<void>
  onClose: () => void
}

export default function TapBattle({ bossId, bossEmoji, bossName, onVictory, onClose }: Props) {
  const [hp, setHp] = useState(TOTAL_HP)
  const [hits, setHits] = useState<Hit[]>([])
  const [hitCount, setHitCount] = useState(0)
  const [won, setWon] = useState(false)
  const [ready, setReady] = useState(false)
  const hpRef = useRef(TOTAL_HP)
  const nextId = useRef(0)
  const winFired = useRef(false)

  // Grace period: swallow any stray pointer events left over from the QR scan phase
  useEffect(() => {
    const t = setTimeout(() => setReady(true), GRACE_MS)
    return () => clearTimeout(t)
  }, [])

  const handleTap = useCallback(async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready) return
    e.preventDefault()
    if (hpRef.current <= 0) return

    const newHp = Math.max(0, hpRef.current - 1)
    hpRef.current = newHp
    setHp(newHp)
    setHitCount(n => n + 1)

    const id = nextId.current++
    const x = e.clientX
    const y = e.clientY
    setHits(prev => [...prev.slice(-12), { id, x, y }])
    setTimeout(() => setHits(prev => prev.filter(h => h.id !== id)), 650)

    if (newHp <= 0 && !winFired.current) {
      winFired.current = true
      setWon(true)
      try {
        await onVictory()
      } catch (err) {
        // Don't let a failed API call blank the screen; victory UI still shows
        console.error('defeatBoss failed:', err)
      }
      setTimeout(onClose, 2200)
    }
  }, [ready, onVictory, onClose])

  const pct = (hp / TOTAL_HP) * 100
  const hpColor =
    pct > 50 ? '#22c55e' :
    pct > 25 ? '#eab308' :
    '#ef4444'

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #3b0a0a 0%, #0c0c14 65%)',
        touchAction: 'none',
      }}
      onPointerDown={handleTap}
    >
      {/* Close button – stops propagation so it doesn't count as a hit */}
      {!won && (
        <button
          className="absolute top-4 left-4 z-20 text-white/25 hover:text-white/60 p-2"
          onClick={e => { e.stopPropagation(); onClose() }}
        >
          <X size={20} />
        </button>
      )}

      {/* Top: boss display */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-8 px-6 gap-4 pointer-events-none">
        <p className="text-white/40 text-xs font-bold tracking-widest uppercase">⚔️ 挑戰 {bossName}</p>

        {/* Boss image – shakes on each hit */}
        <motion.div
          key={hitCount}
          className="w-28 h-28"
          animate={hitCount > 0 && !won
            ? { x: [-8, 8, -5, 5, 0], rotate: [-4, 4, -2, 2, 0] }
            : {}}
          transition={{ duration: 0.28 }}
        >
          {won
            ? <span className="text-[90px] leading-none flex items-center justify-center w-full h-full">💀</span>
            : <BossImage bossId={bossId} emoji={bossEmoji} className="w-full h-full" />}
        </motion.div>

        {/* HP bar */}
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-white/40 mb-1.5">
            <span>HP</span>
            <span>{Math.max(0, hp)} / {TOTAL_HP}</span>
          </div>
          <div className="h-5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${pct}%`, backgroundColor: hpColor }}
              transition={{ duration: 0.08 }}
            />
          </div>
        </div>
      </div>

      {/* Tap prompt – only shown when not won */}
      {!won && (
        <div className="absolute inset-0 top-[280px] flex items-center justify-center pointer-events-none">
          {ready ? (
            <motion.div
              className="text-center"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
            >
              <p className="text-white/20 text-3xl font-black">點擊攻擊！</p>
              <p className="text-white/10 text-base mt-1">大家一起連續點擊！</p>
            </motion.div>
          ) : (
            <motion.p
              className="text-brand-yellow/60 text-2xl font-black"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              準備！
            </motion.p>
          )}
        </div>
      )}

      {/* Floating hit numbers */}
      <AnimatePresence>
        {hits.map(hit => (
          <motion.div
            key={hit.id}
            className="fixed font-black text-brand-yellow text-xl pointer-events-none"
            style={{ left: hit.x - 14, top: hit.y - 14 }}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -70, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            -1
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Victory overlay */}
      <AnimatePresence>
        {won && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className="text-center"
            >
              <div className="text-7xl mb-3">🎉</div>
              <p className="text-white font-black text-3xl">{bossName} 被擊敗了！</p>
              <p className="text-white/50 mt-2">太厲害了，好棒鴨探險隊！</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
