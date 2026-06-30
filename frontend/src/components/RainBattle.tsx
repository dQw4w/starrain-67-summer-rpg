import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, SkipForward } from 'lucide-react'
import BossImage from './BossImage'

// ── Shared ────────────────────────────────────────────────────────────────────

const PADS = [
  { n: 1 as const, color: '#38bdf8', glow: 'rgba(56,189,248,0.7)',  label: '一號' },
  { n: 2 as const, color: '#f472b6', glow: 'rgba(244,114,182,0.7)', label: '二號' },
  { n: 3 as const, color: '#a78bfa', glow: 'rgba(167,139,250,0.7)', label: '三號' },
]

const DEFENSE_SEQ = [3, 2, 1] as const   // 粉怪 defense order
const GRACE_MS   = 600
const WRONG_CD_MS = 1000

// ── Boss 1 (米怪) — Sequential attack ────────────────────────────────────────
// Easy/Normal: fixed 1→2→3.  Hard: random pad (can repeat).
const SEQ_HITS_PER_WAVE: Record<string, number> = { easy: 12, normal: 16, hard: 20 }

// ── Boss 2 (粉怪) — Synchronized attack ──────────────────────────────────────
// Countdown 3-2-1 → "齊！" → all 3 tap within window → HP-1.
// Miss = retry (no penalty, auto-restarts).
interface SyncCfg { stepMs: number; goMs: number; hitsPerWave: number }
const SYNC_CFG: Record<string, SyncCfg> = {
  easy:   { stepMs: 900, goMs: 2500, hitsPerWave: 4 },
  normal: { stepMs: 750, goMs: 1500, hitsPerWave: 6 },
  hard:   { stepMs: 600, goMs: 1000, hitsPerWave: 8 },
}

// ── Questions ─────────────────────────────────────────────────────────────────

interface Question { emoji: string; text: string; hint: string; type: 'discussion'|'action' }

const QUESTIONS: Record<number, Record<string, [Question, Question]>> = {
  1: {
    easy: [
      { emoji: '🐒', type: 'discussion',
        text: '你今天最喜歡哪個動物？每個探險隊員輪流說說看！',
        hint: '請確認每位成員都有說到，說完才算過關！' },
      { emoji: '🎭', type: 'action',
        text: '全隊一起用動作模仿你們最喜歡的動物！',
        hint: '三人一起演，讓哥姐猜猜是什麼動物！' },
    ],
    normal: [
      { emoji: '🐒', type: 'discussion',
        text: '今天動物園之行，說出你最難忘的一件事！每個隊員至少說一件，不可以重複！',
        hint: '可以提示隊員回想動物、有趣行為等' },
      { emoji: '🎭', type: 'action',
        text: '全隊合力，用身體拼出一隻今天看到的動物！哥姐來猜！',
        hint: '三人討論好再一起擺動作，哥姐猜動物名稱' },
    ],
    hard: [
      { emoji: '🤔', type: 'discussion',
        text: '你覺得動物園應不應該存在？說出你的理由！大家輪流分享，不能重複。',
        hint: '引導隊員說出「因為…」，鼓勵深入思考' },
      { emoji: '🎭', type: 'action',
        text: '每個隊員輪流說：「如果我是動物，我想當___，因為___。」',
        hint: '要有完整的理由，鼓勵說得越詳細越好！' },
    ],
  },
  2: {
    easy: [
      { emoji: '⭐', type: 'discussion',
        text: '今天最難忘的事情是什麼？每個探險隊員輪流說說看！',
        hint: '每位成員說一件就算過關，任何事都可以！' },
      { emoji: '🎭', type: 'action',
        text: '全隊一起用動作演出今天最好玩的一件事！哥姐來猜！',
        hint: '三人先討論要演哪件事，再一起表演' },
    ],
    normal: [
      { emoji: '⭐', type: 'discussion',
        text: '今天你學到了什麼新東西？每個隊員說一件，不能重複別人說的！',
        hint: '可以提示隊員回想動物知識、地點、活動等' },
      { emoji: '🤝', type: 'action',
        text: '全隊合力，用身體排出一個英文字母！哥姐來猜是哪個字母！',
        hint: '三人討論好再同時擺出來，哥姐猜字母' },
    ],
    hard: [
      { emoji: '💡', type: 'discussion',
        text: '今天的活動中，你覺得哪件事最有意義？為什麼？每人輪流說，不能重複！',
        hint: '引導隊員說出「因為它讓我…」' },
      { emoji: '🌟', type: 'action',
        text: '全小隊一起創作「好棒鴨探險隊」的超級招牌動作，然後表演給哥姐看！',
        hint: '給隊員約30秒討論，再一起表演！越有創意越好！' },
    ],
  },
}

const FALLBACK_Q: [Question, Question] = [
  { emoji: '💬', type: 'discussion', text: '【TODO：請在這裡填入問題】', hint: '（待補充）' },
  { emoji: '🎭', type: 'action',     text: '【TODO：請在這裡填入互動挑戰】', hint: '（待補充）' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'briefing' | 'attack' | 'defense' | 'question' | 'victory'

interface Props {
  bossId: number
  bossName: string
  bossEmoji: string
  difficulty: string
  onVictory: () => Promise<void>
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RainBattle({ bossId, bossName, bossEmoji, difficulty, onVictory, onClose }: Props) {
  const isSyncAttack      = bossId === 2
  const isSequenceDefense = bossId === 2

  const syncCfg      = SYNC_CFG[difficulty] ?? SYNC_CFG.normal
  const hitsPerWave  = isSyncAttack ? syncCfg.hitsPerWave : (SEQ_HITS_PER_WAVE[difficulty] ?? 16)
  const totalHp      = hitsPerWave * 3

  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<Phase>('briefing')
  const [wave,  setWave]            = useState(1)
  const [questionIdx, setQuestionIdx] = useState(0)

  // `attackKey` increments every time we (re-)enter the attack phase.
  // Both sequential-grace and sync-countdown effects depend on it.
  const [attackKey, setAttackKey] = useState(0)

  // ── Common HP state ────────────────────────────────────────────────────────
  const [hp, setHp]           = useState(totalHp)
  const [hitCount, setHitCount] = useState(0)

  // ── Sequential attack state (米怪) ─────────────────────────────────────────
  const [seqExpected, setSeqExpected] = useState<1|2|3>(1)
  const [seqCooldown, setSeqCooldown] = useState(false)
  const [seqWrongPad, setSeqWrongPad] = useState<number|null>(null)
  const [seqReady,    setSeqReady]    = useState(false)

  // ── Sync attack state (粉怪) ───────────────────────────────────────────────
  const [syncPhase,    setSyncPhase]    = useState<'counting'|'go'|'result'>('counting')
  const [syncCountNum, setSyncCountNum] = useState<3|2|1>(3)
  const [syncTapped,   setSyncTapped]   = useState<Set<number>>(new Set())
  const [syncSuccess,  setSyncSuccess]  = useState<boolean|null>(null)

  // ── Defense state ──────────────────────────────────────────────────────────
  const [shieldTapped,   setShieldTapped]   = useState<Set<number>>(new Set())
  const [defSeqStep,     setDefSeqStep]     = useState(0)
  const [defWrongPad,    setDefWrongPad]    = useState<number|null>(null)
  const [defenseBlocked, setDefenseBlocked] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const hpRef              = useRef(totalHp)
  const hitsThisWaveRef    = useRef(0)
  const seqExpectedRef     = useRef<1|2|3>(1)
  const seqCdRef           = useRef(false)
  const winFiredRef        = useRef(false)
  const defenseResolvingRef = useRef(false)
  const defSeqStepRef      = useRef(0)
  const waveRef            = useRef(1)
  const hitsPerWaveRef     = useRef(hitsPerWave)
  const onVictoryRef       = useRef(onVictory)
  const onCloseRef         = useRef(onClose)
  const syncTappedRef      = useRef<Set<number>>(new Set())
  const seqCdTimer         = useRef<ReturnType<typeof setTimeout>|null>(null)
  const defWrongTimer      = useRef<ReturnType<typeof setTimeout>|null>(null)

  // Keep callback refs fresh
  useEffect(() => { onVictoryRef.current = onVictory }, [onVictory])
  useEffect(() => { onCloseRef.current  = onClose  }, [onClose])

  // ── Enter attack phase helper ───────────────────────────────────────────────
  const enterAttack = useCallback((nextWave: number) => {
    hitsThisWaveRef.current  = 0
    seqExpectedRef.current   = 1
    seqCdRef.current         = false
    waveRef.current          = nextWave
    setWave(nextWave)
    setSeqExpected(1)
    setSeqCooldown(false)
    setSeqWrongPad(null)
    setAttackKey(k => k + 1)
    setPhase('attack')
  }, [])

  // ── Sequential (米怪): grace period ────────────────────────────────────────
  useEffect(() => {
    if (isSyncAttack) return
    setSeqReady(false)
    const t = setTimeout(() => setSeqReady(true), GRACE_MS)
    return () => {
      clearTimeout(t)
      if (seqCdTimer.current) clearTimeout(seqCdTimer.current)
    }
  }, [attackKey, isSyncAttack])

  // ── Sync (粉怪): countdown cycle ───────────────────────────────────────────
  useEffect(() => {
    if (!isSyncAttack || phase !== 'attack') return

    const cfg = SYNC_CFG[difficulty] ?? SYNC_CFG.normal
    const fresh: Set<number> = new Set()
    syncTappedRef.current = fresh
    setSyncTapped(new Set())
    setSyncSuccess(null)
    setSyncPhase('counting')
    setSyncCountNum(3)

    const ts: ReturnType<typeof setTimeout>[] = []
    ts.push(setTimeout(() => setSyncCountNum(2), cfg.stepMs))
    ts.push(setTimeout(() => setSyncCountNum(1), cfg.stepMs * 2))
    ts.push(setTimeout(() => {
      setSyncPhase('go')

      ts.push(setTimeout(() => {
        setSyncPhase('result')
        const tapped = syncTappedRef.current
        const hit = tapped.size >= 3

        setSyncSuccess(hit)

        if (hit && hpRef.current > 0) {
          const newHp = Math.max(0, hpRef.current - 1)
          hpRef.current = newHp
          setHp(newHp)
          setHitCount(c => c + 1)
          hitsThisWaveRef.current++

          if (hitsThisWaveRef.current >= hitsPerWaveRef.current && waveRef.current < 3) {
            ts.push(setTimeout(() => {
              hitsThisWaveRef.current = 0
              setPhase('defense')
            }, 1200))
            return
          }
          if (newHp <= 0 && !winFiredRef.current) {
            winFiredRef.current = true
            ts.push(setTimeout(() => {
              setPhase('victory')
              onVictoryRef.current().catch(console.error)
              setTimeout(() => onCloseRef.current(), 2500)
            }, 1200))
            return
          }
        }

        // restart cycle (success w/ no wave boundary, or miss)
        ts.push(setTimeout(() => setAttackKey(k => k + 1), 1300))
      }, cfg.goMs))
    }, cfg.stepMs * 3))

    return () => ts.forEach(clearTimeout)
  }, [attackKey, isSyncAttack, phase, difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Defense: reset on entry ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'defense') return
    defenseResolvingRef.current = false
    defSeqStepRef.current = 0
    setDefenseBlocked(false)
    setShieldTapped(new Set())
    setDefSeqStep(0)
    setDefWrongPad(null)
  }, [phase, wave])

  // ── Sequential press (米怪) ────────────────────────────────────────────────
  const seqPress = useCallback(async (n: 1|2|3) => {
    if (!seqReady || seqCdRef.current || hpRef.current <= 0) return

    if (n !== seqExpectedRef.current) {
      seqCdRef.current = true
      setSeqCooldown(true)
      setSeqWrongPad(n)
      if (seqCdTimer.current) clearTimeout(seqCdTimer.current)
      seqCdTimer.current = setTimeout(() => {
        seqCdRef.current = false
        setSeqCooldown(false)
        setSeqWrongPad(null)
      }, WRONG_CD_MS)
      return
    }

    const newHp = Math.max(0, hpRef.current - 1)
    hpRef.current = newHp
    setHp(newHp)
    setHitCount(c => c + 1)
    hitsThisWaveRef.current++

    // Next expected pad
    let next: 1|2|3
    if (difficulty === 'hard') {
      // Random from the other two pads
      const others = ([1, 2, 3] as const).filter(x => x !== seqExpectedRef.current)
      next = others[Math.floor(Math.random() * others.length)]
    } else {
      next = (seqExpectedRef.current === 3 ? 1 : seqExpectedRef.current + 1) as 1|2|3
    }
    seqExpectedRef.current = next
    setSeqExpected(next)

    if (hitsThisWaveRef.current >= hitsPerWave && waveRef.current < 3) {
      seqCdRef.current = true
      if (seqCdTimer.current) clearTimeout(seqCdTimer.current)
      setSeqCooldown(false)
      setSeqWrongPad(null)
      setPhase('defense')
      return
    }

    if (newHp <= 0 && !winFiredRef.current) {
      winFiredRef.current = true
      setPhase('victory')
      try { await onVictoryRef.current() } catch (e) { console.error(e) }
      setTimeout(() => onCloseRef.current(), 2500)
    }
  }, [seqReady, difficulty, hitsPerWave])

  // ── Sync pad tap (粉怪, during GO window) ─────────────────────────────────
  const tapSyncPad = useCallback((n: number) => {
    if (syncPhase !== 'go') return
    const next = new Set(syncTappedRef.current)
    next.add(n)
    syncTappedRef.current = next
    setSyncTapped(new Set(next))
  }, [syncPhase])

  // ── Defense: any-order (米怪) ──────────────────────────────────────────────
  const triggerDefenseResolved = useCallback(() => {
    if (defenseResolvingRef.current) return
    defenseResolvingRef.current = true
    setDefenseBlocked(true)
    setTimeout(() => { setDefenseBlocked(false); setPhase('question') }, 1500)
  }, [])

  const tapShieldAny = useCallback((n: number) => {
    setShieldTapped(prev => {
      if (prev.has(n)) return prev
      const next = new Set(prev); next.add(n)
      if (next.size === 3) setTimeout(triggerDefenseResolved, 200)
      return next
    })
  }, [triggerDefenseResolved])

  // ── Defense: sequence (粉怪) 3→2→1 ────────────────────────────────────────
  const tapShieldSeq = useCallback((n: number) => {
    if (defenseResolvingRef.current) return
    const expected = DEFENSE_SEQ[defSeqStepRef.current]
    if (n !== expected) {
      setDefWrongPad(n)
      if (defWrongTimer.current) clearTimeout(defWrongTimer.current)
      defWrongTimer.current = setTimeout(() => setDefWrongPad(null), 900)
      return
    }
    const nextStep = defSeqStepRef.current + 1
    defSeqStepRef.current = nextStep
    setDefSeqStep(nextStep)
    setShieldTapped(prev => { const s = new Set(prev); s.add(n); return s })
    if (nextStep >= DEFENSE_SEQ.length) setTimeout(triggerDefenseResolved, 200)
  }, [triggerDefenseResolved])

  // ── Advance from question ──────────────────────────────────────────────────
  const advanceFromQuestion = useCallback(() => {
    setQuestionIdx(qi => qi + 1)
    enterAttack(waveRef.current + 1)
  }, [enterAttack])

  // ── Computed ───────────────────────────────────────────────────────────────
  const pct     = (hp / totalHp) * 100
  const hpColor = pct > 60 ? '#22c55e' : pct > 30 ? '#eab308' : '#ef4444'
  const questions       = QUESTIONS[bossId]?.[difficulty] ?? FALLBACK_Q
  const currentQuestion = questions[Math.min(questionIdx, 1)]

  // ── BRIEFING ───────────────────────────────────────────────────────────────
  if (phase === 'briefing') return (
    <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0a1a3b 0%, #0c0c14 65%)', touchAction: 'none' }}>
      <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-3">
        <button className="text-white/25 hover:text-white/60 p-2" onClick={onClose}><X size={20} /></button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => enterAttack(1)}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-lg shadow-lg shadow-red-500/30">
          準備好了！⚔️
        </motion.button>
      </div>

      <div className="shrink-0 flex flex-col items-center pt-2 pb-3 px-6 pointer-events-none">
        <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-3">☔ 雨天挑戰 · {bossName}</p>
        <div className="w-44 h-44"><BossImage bossId={bossId} emoji={bossEmoji} className="w-full h-full" /></div>
      </div>

      <div className="shrink-0 px-8 text-center space-y-3">
        {isSyncAttack ? (
          <>
            <p className="text-white/85 text-base font-bold leading-relaxed">
              倒數結束出現「齊！」時，<br />三個人同時按下自己的按鈕！
            </p>
            <p className="text-white/50 text-sm">準備好了再按下開始</p>
            <p className="text-purple-300/60 text-xs">⚠️ 反擊時要接龍防禦：三號 → 二號 → 一號！</p>
          </>
        ) : (
          <>
            <p className="text-white/85 text-base font-bold leading-relaxed">
              {difficulty === 'hard'
                ? '每次隨機亮起一個按鈕，亮到誰就輪誰按！'
                : '三個人輪流按，順序是一號 → 二號 → 三號！'}
            </p>
            <p className="text-white/50 text-sm">準備好了再按下開始</p>
            <p className="text-blue-300/60 text-xs">⚠️ 反擊時三個人一起舉盾！</p>
          </>
        )}
      </div>

      <div className="flex-1 flex items-center justify-between px-8 pb-10 pointer-events-none">
        {PADS.map(pad => (
          <div key={pad.n} className="flex flex-col items-center gap-2">
            <div className="rounded-full flex items-center justify-center font-black text-white opacity-50"
              style={{ width: 'clamp(88px,26vw,126px)', height: 'clamp(88px,26vw,126px)', background: pad.color }}>
              <span className="text-4xl drop-shadow">{pad.n}</span>
            </div>
            <span className="text-white/40 text-xs font-bold">{pad.label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── ATTACK: sequential (米怪) ──────────────────────────────────────────────
  if (phase === 'attack' && !isSyncAttack) return (
    <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 15%, #3b0a0a 0%, #0c0c14 65%)', touchAction: 'none' }}>
      <button className="absolute top-4 left-4 z-30 text-white/25 hover:text-white/60 p-2" onClick={onClose}><X size={20} /></button>

      <div className="shrink-0 flex flex-col items-center pt-6 px-6 gap-3 pointer-events-none">
        <p className="text-white/40 text-xs font-bold tracking-widest uppercase">⚔️ 第 {wave} 波 · {bossName}</p>
        <motion.div key={hitCount} className="w-40 h-40"
          animate={hitCount > 0 ? { x: [-7,7,-4,4,0], rotate: [-3,3,-2,2,0] } : {}} transition={{ duration: 0.25 }}>
          <BossImage bossId={bossId} emoji={bossEmoji} className="w-full h-full" />
        </motion.div>
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-white/40 mb-1.5"><span>HP</span><span>{hp} / {totalHp}</span></div>
          <div className="h-5 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full"
              animate={{ width: `${pct}%`, backgroundColor: hpColor }} transition={{ duration: 0.12 }} />
          </div>
        </div>
      </div>

      <div className="shrink-0 text-center px-6 mt-3 h-14 flex items-center justify-center">
        {!seqReady ? (
          <motion.p className="text-brand-yellow/70 text-2xl font-black"
            animate={{ opacity: [0.4,1,0.4] }} transition={{ repeat: Infinity, duration: 0.6 }}>準備！</motion.p>
        ) : seqCooldown ? (
          <motion.p key="cd" className="text-red-400 text-xl font-black"
            initial={{ scale: 1.2 }} animate={{ scale: 1, x: [-6,6,-4,4,0] }} transition={{ duration: 0.4 }}>
            ❌ 按錯了！稍等…
          </motion.p>
        ) : (
          <div>
            <p className="text-white/80 text-lg font-black">
              輪到 <span style={{ color: PADS[seqExpected-1].color }}>{PADS[seqExpected-1].label}</span> 按！
            </p>
            <p className="text-white/30 text-sm mt-0.5">
              {difficulty === 'hard' ? '注意看亮哪個！' : '順序：1 → 2 → 3 → 1 → …'}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-between px-6 pb-10">
        {PADS.map(pad => {
          const isTurn  = seqReady && !seqCooldown && seqExpected === pad.n
          const isWrong = seqWrongPad === pad.n
          return (
            <div key={pad.n} className="flex flex-col items-center gap-2">
              <motion.button
                onPointerDown={e => { e.preventDefault(); seqPress(pad.n) }}
                disabled={!seqReady}
                className="rounded-full flex items-center justify-center font-black text-white"
                style={{
                  width: 'clamp(88px,26vw,126px)', height: 'clamp(88px,26vw,126px)',
                  background: isWrong ? '#ef4444' : pad.color,
                  opacity: isTurn ? 1 : 0.35,
                  boxShadow: isTurn ? `0 0 36px 8px ${pad.glow}` : 'none',
                  touchAction: 'none',
                }}
                animate={isWrong ? { x:[-8,8,-6,6,0] } : isTurn ? { scale:[1,1.1,1] } : { scale:1 }}
                transition={isTurn&&!isWrong ? { repeat:Infinity, duration:0.9 } : { duration:0.35 }}
                whileTap={{ scale: 0.9 }}>
                <span className="text-4xl drop-shadow">{pad.n}</span>
              </motion.button>
              <span className="text-white/50 text-xs font-bold">{pad.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── ATTACK: synchronized (粉怪) ────────────────────────────────────────────
  if (phase === 'attack' && isSyncAttack) {
    const isGo      = syncPhase === 'go'
    const isResult  = syncPhase === 'result'
    const isCounting = syncPhase === 'counting'

    return (
      <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 15%, #0a0a3b 0%, #0c0c14 65%)', touchAction: 'none' }}>
        <button className="absolute top-4 left-4 z-30 text-white/25 hover:text-white/60 p-2" onClick={onClose}><X size={20} /></button>

        <div className="shrink-0 flex flex-col items-center pt-6 px-6 gap-3 pointer-events-none">
          <p className="text-white/40 text-xs font-bold tracking-widest uppercase">⚔️ 第 {wave} 波 · {bossName}</p>
          <motion.div key={hitCount} className="w-40 h-40"
            animate={hitCount > 0 ? { x: [-7,7,-4,4,0], rotate: [-3,3,-2,2,0] } : {}} transition={{ duration: 0.25 }}>
            <BossImage bossId={bossId} emoji={bossEmoji} className="w-full h-full" />
          </motion.div>
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs text-white/40 mb-1.5"><span>HP</span><span>{hp} / {totalHp}</span></div>
            <div className="h-5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                animate={{ width: `${pct}%`, backgroundColor: hpColor }} transition={{ duration: 0.12 }} />
            </div>
          </div>
        </div>

        {/* Countdown / GO / Result display */}
        <div className="shrink-0 flex flex-col items-center justify-center mt-2 h-24">
          <AnimatePresence mode="wait">
            {isCounting && (
              <motion.p key={syncCountNum}
                className="text-white font-black"
                style={{ fontSize: 'clamp(56px,14vw,80px)', lineHeight: 1 }}
                initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.25 }}>
                {syncCountNum}
              </motion.p>
            )}
            {isGo && (
              <motion.p key="go"
                className="font-black text-brand-yellow"
                style={{ fontSize: 'clamp(52px,13vw,74px)', lineHeight: 1 }}
                initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}>
                齊！
              </motion.p>
            )}
            {isResult && (
              <motion.div key="result" className="text-center"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                {syncSuccess ? (
                  <p className="text-green-400 font-black text-3xl">✅ 命中！</p>
                ) : (
                  <>
                    <p className="text-red-400 font-black text-2xl">差一點！</p>
                    <p className="text-white/40 text-sm mt-1">{syncTapped.size} / 3 人齊了</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sync pads */}
        <div className="flex-1 flex items-center justify-between px-6 pb-10">
          {PADS.map(pad => {
            const tapped  = syncTapped.has(pad.n)
            const active  = isGo && !tapped
            return (
              <div key={pad.n} className="flex flex-col items-center gap-2">
                <motion.button
                  onPointerDown={e => { e.preventDefault(); tapSyncPad(pad.n) }}
                  className="rounded-full flex items-center justify-center font-black text-white"
                  style={{
                    width: 'clamp(88px,26vw,126px)', height: 'clamp(88px,26vw,126px)',
                    background: tapped ? '#22c55e' : pad.color,
                    opacity: isGo ? 1 : 0.25,
                    boxShadow: active ? `0 0 36px 8px ${pad.glow}` : tapped ? '0 0 28px 8px rgba(34,197,94,0.6)' : 'none',
                    touchAction: 'none',
                  }}
                  animate={
                    tapped   ? { scale: [1.12, 1] } :
                    isGo     ? { scale: [1, 1.06, 1] } :
                               { scale: 1 }
                  }
                  transition={isGo && !tapped ? { repeat: Infinity, duration: 0.7 } : { duration: 0.3 }}
                  whileTap={{ scale: 0.9 }}>
                  <span className="text-4xl">{tapped ? '✅' : pad.n}</span>
                </motion.button>
                <span className="text-white/50 text-xs font-bold">{pad.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── DEFENSE ────────────────────────────────────────────────────────────────
  if (phase === 'defense') {
    const seqExpectedPad = DEFENSE_SEQ[defSeqStep]
    const tapShield = isSequenceDefense ? tapShieldSeq : tapShieldAny

    return (
      <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 25%, #3b0a20 0%, #0c0c14 70%)', touchAction: 'none' }}>

        <div className="shrink-0 flex flex-col items-center pt-8 pb-3 px-6 pointer-events-none">
          <motion.p className="text-red-400 text-base font-black tracking-widest uppercase mb-4"
            animate={{ opacity: [0.6,1,0.6] }} transition={{ repeat: Infinity, duration: 0.7 }}>
            ⚠️ {bossName} 反擊了！
          </motion.p>
          <motion.div className="w-40 h-40"
            animate={{ x:[-5,5,-5,5,0], scale:[1,1.08,1,1.08,1] }}
            transition={{ repeat: Infinity, duration: 0.55 }}>
            <BossImage bossId={bossId} emoji={bossEmoji} className="w-full h-full" />
          </motion.div>
          {isSequenceDefense ? (
            <><p className="text-white/85 font-black text-xl mt-4">接龍防禦！</p>
              <p className="text-white/45 text-sm mt-1">順序：三號 → 二號 → 一號</p></>
          ) : (
            <><p className="text-white/85 font-black text-xl mt-4">快舉盾防禦！</p>
              <p className="text-white/45 text-sm mt-1">三個人一起按下自己的盾！</p></>
          )}
        </div>

        <AnimatePresence>
          {defenseBlocked ? (
            <motion.div className="flex-1 flex flex-col items-center justify-center gap-3"
              initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}>
              <div className="text-7xl">🛡️</div>
              <p className="text-brand-yellow font-black text-3xl">防禦成功！</p>
            </motion.div>
          ) : (
            <motion.div className="flex-1 flex flex-col" exit={{ opacity:0 }}>
              <div className="h-8 flex items-center justify-center">
                <AnimatePresence>
                  {defWrongPad !== null && (
                    <motion.p key={defWrongPad} className="text-red-400 text-sm font-bold"
                      initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                      先讓 {PADS[seqExpectedPad-1]?.label} 來！
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 flex items-center justify-between px-6 pb-4">
                {PADS.map(pad => {
                  const tapped  = shieldTapped.has(pad.n)
                  const isNext  = isSequenceDefense
                    ? !tapped && pad.n === seqExpectedPad
                    : !tapped
                  const isWrong = defWrongPad === pad.n

                  return (
                    <div key={pad.n} className="flex flex-col items-center gap-2">
                      <motion.button
                        onPointerDown={e => { e.preventDefault(); if (!tapped) tapShield(pad.n) }}
                        className="rounded-full flex items-center justify-center text-white"
                        style={{
                          width: 'clamp(88px,26vw,126px)', height: 'clamp(88px,26vw,126px)',
                          background: tapped ? '#22c55e' : isWrong ? '#ef4444' : pad.color,
                          opacity: tapped ? 1 : isNext ? 1 : 0.3,
                          boxShadow: tapped ? '0 0 30px 8px rgba(34,197,94,0.55)'
                            : isNext ? `0 0 28px 6px ${pad.glow}` : 'none',
                          touchAction: 'none',
                        }}
                        animate={
                          isWrong ? { x:[-8,8,-6,6,0] } :
                          tapped  ? { scale:[1.12,1] } :
                          isNext  ? { scale:[1,1.07,1] } : { scale:1 }
                        }
                        transition={
                          isNext && !tapped && !isWrong
                            ? { repeat:Infinity, duration:0.9 }
                            : { duration:0.35 }
                        }
                        whileTap={{ scale: 0.88 }}>
                        <span className="text-4xl">{tapped ? '✅' : '🛡️'}</span>
                      </motion.button>
                      <span className="text-white/50 text-xs font-bold">{pad.label}</span>
                    </div>
                  )
                })}
              </div>

              <div className="shrink-0 pb-6 flex justify-center">
                <button onClick={triggerDefenseResolved}
                  className="text-white/20 text-xs flex items-center gap-1.5 py-2 px-4">
                  <SkipForward size={12} /> 跳過防禦
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── QUESTION ───────────────────────────────────────────────────────────────
  if (phase === 'question') return (
    <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0a2a18 0%, #0c0c14 70%)', touchAction: 'none' }}>
      <button className="absolute top-4 left-4 z-30 text-white/25 hover:text-white/60 p-2" onClick={onClose}><X size={20} /></button>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5 overflow-y-auto py-12">
        <motion.div className="text-7xl"
          initial={{ scale:0, rotate:-20 }} animate={{ scale:1, rotate:0 }}
          transition={{ type:'spring', stiffness:300, damping:14 }}>
          {currentQuestion.emoji}
        </motion.div>
        <motion.div className="space-y-3"
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
          <p className="text-brand-yellow text-xs font-bold tracking-widest uppercase">
            {currentQuestion.type === 'action' ? '⚡ 互動挑戰' : '💬 小隊討論'}
          </p>
          <p className="text-white font-black text-2xl leading-snug">{currentQuestion.text}</p>
          <p className="text-white/40 text-sm leading-relaxed">{currentQuestion.hint}</p>
        </motion.div>
      </div>

      <div className="shrink-0 px-6 pb-10 space-y-3">
        <motion.button whileTap={{ scale:0.97 }} onClick={advanceFromQuestion}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-lg">
          完成！繼續戰鬥 ⚔️
        </motion.button>
        <button onClick={advanceFromQuestion}
          className="w-full py-2 text-white/30 text-sm flex items-center justify-center gap-2">
          <SkipForward size={14} /> 跳過這題
        </button>
      </div>
    </div>
  )

  // ── VICTORY ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #0a3b14 0%, #0c0c14 70%)' }}>
      <motion.div className="text-center px-8 space-y-4"
        initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring' }}>
        <div className="text-7xl">🎉</div>
        <p className="text-white font-black text-3xl">{bossName} 被擊敗了！</p>
        <p className="text-white/50 text-lg">太厲害了，好棒鴨探險隊！</p>
      </motion.div>
    </div>
  )
}
