import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import BossImage from './BossImage'

const TOTAL_HP = 15        // 3 players × ~5 presses each
const WRONG_CD_MS = 1000   // penalty cooldown after a wrong-order press
const GRACE_MS = 600       // ignore touches briefly after mount (stray scan events)

type Pad = { n: 1 | 2 | 3; color: string; glow: string; label: string }

const PADS: Pad[] = [
  { n: 1, color: '#38bdf8', glow: 'rgba(56,189,248,0.7)',  label: '一號' },
  { n: 2, color: '#f472b6', glow: 'rgba(244,114,182,0.7)', label: '二號' },
  { n: 3, color: '#a78bfa', glow: 'rgba(167,139,250,0.7)', label: '三號' },
]

interface Props {
  bossId: number
  bossEmoji: string
  bossName: string
  onVictory: () => Promise<void>
  onClose: () => void
}

export default function TapBattle({ bossId, bossEmoji, bossName, onVictory, onClose }: Props) {
  const [phase, setPhase]        = useState<'briefing' | 'battle'>('briefing')
  const [hp, setHp]             = useState(TOTAL_HP)
  const [expected, setExpected] = useState<1 | 2 | 3>(1)
  const [hitCount, setHitCount] = useState(0)
  const [cooldown, setCooldown] = useState(false)
  const [wrongPad, setWrongPad] = useState<number | null>(null)
  const [won, setWon]           = useState(false)
  const [ready, setReady]       = useState(false)

  const hpRef       = useRef(TOTAL_HP)
  const expectedRef = useRef<1 | 2 | 3>(1)
  const cdRef       = useRef(false)
  const winFired    = useRef(false)
  const cdTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Grace period only starts once battle phase begins
  useEffect(() => {
    if (phase !== 'battle') return
    const t = setTimeout(() => setReady(true), GRACE_MS)
    return () => {
      clearTimeout(t)
      if (cdTimer.current) clearTimeout(cdTimer.current)
    }
  }, [phase])

  const press = useCallback(async (n: 1 | 2 | 3) => {
    if (!ready || cdRef.current || hpRef.current <= 0) return

    if (n !== expectedRef.current) {
      cdRef.current = true
      setCooldown(true)
      setWrongPad(n)
      if (cdTimer.current) clearTimeout(cdTimer.current)
      cdTimer.current = setTimeout(() => {
        cdRef.current = false
        setCooldown(false)
        setWrongPad(null)
      }, WRONG_CD_MS)
      return
    }

    const newHp = Math.max(0, hpRef.current - 1)
    hpRef.current = newHp
    setHp(newHp)
    setHitCount(c => c + 1)

    const next = (expectedRef.current === 3 ? 1 : expectedRef.current + 1) as 1 | 2 | 3
    expectedRef.current = next
    setExpected(next)

    if (newHp <= 0 && !winFired.current) {
      winFired.current = true
      setWon(true)
      try {
        await onVictory()
      } catch (err) {
        console.error('defeatBoss failed:', err)
      }
      setTimeout(onClose, 2200)
    }
  }, [ready, onVictory, onClose])

  const pct = (hp / TOTAL_HP) * 100
  const hpColor = pct > 50 ? '#22c55e' : pct > 25 ? '#eab308' : '#ef4444'

  // ── Briefing screen ─────────────────────────────────────────────────────────
  if (phase === 'briefing') {
    return (
      <div
        className="fixed inset-0 z-50 overflow-hidden select-none flex flex-col"
        style={{ background: 'radial-gradient(ellipse at 50% 15%, #3b0a0a 0%, #0c0c14 65%)', touchAction: 'none' }}
      >
        {/* Header row: close + ready button */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3 gap-3">
          <button className="text-white/25 hover:text-white/60 p-2" onClick={onClose}>
            <X size={20} />
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setPhase('battle')}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-lg shadow-lg shadow-red-500/30"
          >
            準備好了！⚔️
          </motion.button>
        </div>

        {/* Boss */}
        <div className="shrink-0 flex flex-col items-center pt-2 pb-4 px-6 pointer-events-none">
          <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-3">⚔️ 挑戰 {bossName}</p>
          <div className="w-48 h-48">
            <BossImage bossId={bossId} emoji={bossEmoji} className="w-full h-full" />
          </div>
        </div>

        {/* Instructions */}
        <div className="shrink-0 px-8 text-center">
          <p className="text-white/80 text-base font-bold leading-relaxed">
            三個小隊員每人把一隻手指<br />放在自己的攻擊按鈕上
          </p>
          <p className="text-white/40 text-sm mt-2">
            準備好後，請小隊長按上方「準備好了」開始！
          </p>
          <p className="text-white/30 text-xs mt-1">
            順序：一號 → 二號 → 三號 → 重複
          </p>
        </div>

        {/* Pads (visual only — no interaction) */}
        <div className="flex-1 flex items-center justify-between px-6 pb-10">
          {PADS.map(pad => (
            <div key={pad.n} className="flex flex-col items-center gap-2">
              <div
                className="rounded-full flex items-center justify-center font-black text-white opacity-60"
                style={{
                  width: 'clamp(110px, 30vw, 170px)',
                  height: 'clamp(110px, 30vw, 170px)',
                  background: pad.color,
                }}
              >
                <span className="text-5xl drop-shadow">{pad.n}</span>
              </div>
              <span className="text-white/50 text-xs font-bold">{pad.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Battle screen ────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden select-none flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 50% 15%, #3b0a0a 0%, #0c0c14 65%)',
        touchAction: 'none',
      }}
    >
      {/* Close button */}
      {!won && (
        <button
          className="absolute top-4 left-4 z-30 text-white/25 hover:text-white/60 p-2"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      )}

      {/* Top: boss display */}
      <div className="shrink-0 flex flex-col items-center pt-6 px-6 gap-3 pointer-events-none">
        <p className="text-white/40 text-xs font-bold tracking-widest uppercase">⚔️ 挑戰 {bossName}</p>

        <motion.div
          key={hitCount}
          className="w-48 h-48"
          animate={hitCount > 0 && !won ? { x: [-8, 8, -5, 5, 0], rotate: [-4, 4, -2, 2, 0] } : {}}
          transition={{ duration: 0.28 }}
        >
          {!won && <BossImage bossId={bossId} emoji={bossEmoji} className="w-full h-full" />}
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
              transition={{ duration: 0.12 }}
            />
          </div>
        </div>
      </div>

      {/* Middle: instructions / status */}
      {!won && (
        <div className="shrink-0 text-center px-6 mt-3 h-14 flex items-center justify-center">
          {!ready ? (
            <motion.p
              className="text-brand-yellow/70 text-2xl font-black"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              準備！
            </motion.p>
          ) : cooldown ? (
            <motion.p
              key="cd"
              className="text-red-400 text-xl font-black"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1, x: [-6, 6, -4, 4, 0] }}
              transition={{ duration: 0.4 }}
            >
              ❌ 按錯順序了！稍等一下…
            </motion.p>
          ) : (
            <div>
              <p className="text-white/80 text-lg font-black">
                輪到 <span style={{ color: PADS[expected - 1].color }}>{PADS[expected - 1].label}</span> 按！
              </p>
              <p className="text-white/30 text-sm mt-0.5">順序：1 → 2 → 3 → 1 → 2 → 3</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom: three pads — spread to edges */}
      {!won && (
        <div className="flex-1 flex items-center justify-between px-6 pb-10">
          {PADS.map(pad => {
            const isTurn  = ready && !cooldown && expected === pad.n
            const isWrong = wrongPad === pad.n
            return (
              <div key={pad.n} className="flex flex-col items-center gap-2">
                <motion.button
                  onPointerDown={e => { e.preventDefault(); press(pad.n) }}
                  disabled={!ready}
                  className="rounded-full flex items-center justify-center font-black text-white"
                  style={{
                    width: 'clamp(90px, 28vw, 140px)',
                    height: 'clamp(90px, 28vw, 140px)',
                    background: isWrong ? '#ef4444' : pad.color,
                    opacity: isTurn ? 1 : 0.4,
                    boxShadow: isTurn ? `0 0 40px 8px ${pad.glow}` : 'none',
                    touchAction: 'none',
                  }}
                  animate={
                    isWrong
                      ? { x: [-8, 8, -6, 6, 0] }
                      : isTurn
                        ? { scale: [1, 1.08, 1] }
                        : { scale: 1 }
                  }
                  transition={isTurn && !isWrong ? { repeat: Infinity, duration: 0.9 } : { duration: 0.35 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="text-5xl drop-shadow">{pad.n}</span>
                </motion.button>
                <span className="text-white/50 text-xs font-bold">{pad.label}</span>
              </div>
            )
          })}
        </div>
      )}

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
