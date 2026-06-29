import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react'
import type { TeamState } from '../types'
import { api } from '../api'

const LEVELS = [
  { key: 'easy',   label: '簡單', emoji: '🌱', color: 'bg-green-600', ring: 'ring-green-400' },
  { key: 'normal', label: '普通', emoji: '⚡', color: 'bg-blue-600',  ring: 'ring-blue-400'  },
  { key: 'hard',   label: '困難', emoji: '🔥', color: 'bg-red-600',   ring: 'ring-red-400'   },
]

export default function TeamSettingsPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [state, setState] = useState<TeamState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getTeamByToken(token!)
      setState(data)
      setError(null)
    } catch {
      setError('找不到小隊，請確認連結是否正確')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleDifficulty = async (d: string) => {
    if (!state || saving) return
    setSaving(true)
    try {
      await api.setDifficulty(state.team_id, d)
      setState(prev => prev ? { ...prev, difficulty: d } : prev)
      setFeedback('難易度已更新！')
      setTimeout(() => setFeedback(null), 2000)
    } catch {
      setFeedback('更新失敗，請重試')
      setTimeout(() => setFeedback(null), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!token || saving) return
    setSaving(true)
    try {
      await api.resetTeamByToken(token)
      setResetDone(true)
      setConfirmReset(false)
      await load()
    } catch {
      setFeedback('重置失敗，請重試')
      setTimeout(() => setFeedback(null), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.img
        src="/goodduck.png"
        alt="好棒鴨"
        className="w-24 h-24 object-contain"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
      />
    </div>
  )

  if (error || !state) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <img src="/goodduck.png" alt="好棒鴨" className="w-20 h-20 object-contain opacity-40" />
      <p className="text-red-400 font-bold text-center">{error || '找不到小隊'}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#0d1b4b] to-[#0a1628] px-4 py-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(`/team/${token}`)}
          className="text-white/40 hover:text-white transition-colors p-2 -ml-2"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white leading-tight">{state.name}</h1>
          <p className="text-white/40 text-xs">進度設定</p>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <motion.div
          className="mb-4 text-center text-sm font-bold text-white bg-white/10 rounded-2xl py-2 px-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {feedback}
        </motion.div>
      )}

      {/* Reset success */}
      {resetDone && (
        <motion.div
          className="mb-6 text-center bg-green-900/40 border border-green-500/30 rounded-2xl py-4 px-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-green-300 font-bold">✅ 進度已重置！</p>
          <p className="text-green-400/70 text-xs mt-1">所有任務和頭目已清除，可以重新開始了。</p>
        </motion.div>
      )}

      {/* Difficulty */}
      <section className="mb-8">
        <p className="text-white/50 text-xs tracking-widest uppercase mb-3">難易度</p>
        <div className="space-y-3">
          {LEVELS.map(l => (
            <motion.button
              key={l.key}
              whileTap={{ scale: 0.97 }}
              disabled={saving}
              onClick={() => handleDifficulty(l.key)}
              className={`w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-3 text-lg transition-all ${l.color} ${state.difficulty === l.key ? `ring-2 ${l.ring}` : 'opacity-60 hover:opacity-80'} disabled:cursor-not-allowed`}
            >
              <span>{l.emoji}</span>
              {l.label}
              {state.difficulty === l.key && <span className="text-xs font-normal opacity-70">（目前）</span>}
            </motion.button>
          ))}
        </div>
      </section>

      {/* Reset progress */}
      <section>
        <p className="text-white/50 text-xs tracking-widest uppercase mb-3">進度管理</p>
        <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4">
          <p className="text-white/80 text-sm mb-1 font-bold">重置所有進度</p>
          <p className="text-white/40 text-xs mb-4">清除所有已完成任務與擊敗頭目的紀錄，回到遊戲開始狀態。此操作無法復原。</p>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2 bg-red-900/50 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              <RotateCcw size={16} />
              重置進度
            </button>
          ) : (
            <motion.div
              className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 space-y-3"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-2 text-red-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p className="text-sm font-bold">確定要重置所有進度嗎？這將無法復原。</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-2 rounded-xl text-sm transition-colors"
                >
                  {saving ? '重置中...' : '確定重置'}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Current progress summary */}
      <section className="mt-8">
        <p className="text-white/50 text-xs tracking-widest uppercase mb-3">目前進度</p>
        <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">已擊敗頭目</span>
            <span className="text-white font-bold">{state.puzzle_pieces} / {state.total_bosses}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">已完成任務</span>
            <span className="text-white font-bold">
              {state.bosses.reduce((n, b) => n + b.quests.filter(q => q.completed).length, 0)}
              {' / '}
              {state.bosses.reduce((n, b) => n + b.quests.length, 0)}
            </span>
          </div>
          {state.victory && (
            <p className="text-brand-yellow font-black text-center pt-2">🎉 任務完成！</p>
          )}
        </div>
      </section>
    </div>
  )
}
