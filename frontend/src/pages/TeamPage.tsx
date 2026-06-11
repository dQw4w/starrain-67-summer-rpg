import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import type { TeamState } from '../types'
import { api } from '../api'
import BossCard from '../components/BossCard'
import PuzzleBoard from '../components/PuzzleBoard'
import DifficultyModal from '../components/DifficultyModal'

const LONG_PRESS_MS = 1500

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const id = Number(teamId) || 1

  const [state, setState] = useState<TeamState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDifficulty, setShowDifficulty] = useState(false)

  // Long-press on team name to open difficulty selector
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressCount = useRef(0)

  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      pressCount.current += 1
      if (pressCount.current >= 1) {
        setShowDifficulty(true)
        pressCount.current = 0
      }
    }, LONG_PRESS_MS)
  }
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const load = useCallback(async () => {
    try {
      const data = await api.getTeam(id)
      setState(data)
      setError(null)
    } catch {
      setError('無法連線，請確認網路後重試')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Poll every 15 seconds
  useEffect(() => {
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  const handleQuestSubmit = async (questId: number, answerIndex?: number): Promise<boolean> => {
    const res = await api.completeQuest(id, questId, answerIndex)
    if (res.correct) await load()
    return res.correct
  }

  const handleDefeat = async (bossId: number) => {
    await api.defeatBoss(id, bossId)
    await load()
  }

  const handleDifficulty = async (d: string) => {
    await api.setDifficulty(id, d)
    await load()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="text-5xl"
      >
        🦆
      </motion.div>
    </div>
  )

  if (error || !state) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <p className="text-red-400 font-bold text-center">{error || '找不到小隊'}</p>
      <button onClick={load} className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-full text-white">
        <RefreshCw size={18} /> 重試
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#0d1b4b] to-[#0a1628] px-4 py-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div
          className="select-none cursor-default"
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
        >
          <motion.div className="text-4xl mb-1 animate-float">🦆</motion.div>
          <h1 className="text-2xl font-black text-white">{state.name}</h1>
          <p className="text-white/40 text-xs">好棒鴨探險隊</p>
        </div>

        <button
          onClick={load}
          className="text-white/40 hover:text-white transition-colors p-2"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Puzzle progress */}
      <div className="mb-6">
        <PuzzleBoard
          pieces={state.puzzle_pieces}
          total={state.total_bosses}
          victory={state.victory}
        />
      </div>

      {/* Boss cards */}
      {!state.victory && (
        <div className="space-y-4">
          {state.bosses.map((boss, i) => (
            <motion.div
              key={boss.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <BossCard
                boss={boss}
                onQuestSubmit={handleQuestSubmit}
                onDefeat={handleDefeat}
              />
            </motion.div>
          ))}
        </div>
      )}

      {state.victory && (
        <motion.div
          className="text-center py-12 space-y-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-8xl animate-float">🎉</div>
          <p className="text-brand-yellow font-black text-3xl">任務完成！</p>
          <p className="text-white/60 text-lg">好棒鴨探險隊萬歲！</p>
        </motion.div>
      )}

      {showDifficulty && (
        <DifficultyModal
          current={state.difficulty}
          onSelect={handleDifficulty}
          onClose={() => setShowDifficulty(false)}
        />
      )}
    </div>
  )
}
