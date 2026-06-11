import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, RotateCcw } from 'lucide-react'
import type { TeamState } from '../types'
import { api } from '../api'

const DIFFICULTIES = ['easy', 'normal', 'hard'] as const

export default function AdminPage() {
  const [teams, setTeams] = useState<TeamState[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmResetAll, setConfirmResetAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const list = await api.adminListTeams()
    const full = await Promise.all(list.map(t => api.adminGetTeam(t.id)))
    setTeams(full)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setDifficulty = async (teamId: number, d: string) => {
    await api.adminUpdateTeam(teamId, { difficulty: d })
    await load()
  }

  const toggleQuest = async (teamId: number, questId: number, completed: boolean) => {
    await api.adminSetQuest(teamId, questId, !completed)
    await load()
  }

  const toggleBoss = async (teamId: number, bossId: number, defeated: boolean) => {
    await api.adminSetBoss(teamId, bossId, !defeated)
    await load()
  }

  const resetTeam = async (teamId: number) => {
    await api.adminResetTeam(teamId)
    await load()
  }

  const resetAll = async () => {
    await api.adminResetAll()
    setConfirmResetAll(false)
    await load()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="text-4xl">🦆</motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0d1a] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">工作人員後台</h1>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-white/50 hover:text-white">
            <RefreshCw size={20} />
          </button>
          {confirmResetAll ? (
            <div className="flex gap-2">
              <button onClick={resetAll} className="bg-red-600 px-3 py-1 rounded-xl text-white text-sm font-bold">確認重置全部</button>
              <button onClick={() => setConfirmResetAll(false)} className="bg-white/10 px-3 py-1 rounded-xl text-white text-sm">取消</button>
            </div>
          ) : (
            <button onClick={() => setConfirmResetAll(true)} className="bg-red-900/50 px-3 py-1 rounded-xl text-red-300 text-sm flex items-center gap-1">
              <RotateCcw size={14} /> 全部重置
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {teams.map(team => (
          <div key={team.team_id} className="bg-white/5 rounded-3xl p-5 border border-white/10">
            {/* Team header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-black text-white">{team.name}</h2>
                <p className="text-white/40 text-sm">拼圖 {team.puzzle_pieces}/{team.total_bosses}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={team.difficulty}
                  onChange={e => setDifficulty(team.team_id, e.target.value)}
                  className="bg-white/10 text-white text-sm rounded-xl px-3 py-2 border border-white/20"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                </select>
                <button
                  onClick={() => resetTeam(team.team_id)}
                  className="bg-white/10 px-3 py-2 rounded-xl text-white/50 text-sm hover:text-white"
                >
                  重置
                </button>
              </div>
            </div>

            {/* Bosses */}
            {team.bosses.map(boss => (
              <div key={boss.id} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{boss.emoji}</span>
                  <span className="font-bold text-white">{boss.name}</span>
                  <button
                    onClick={() => toggleBoss(team.team_id, boss.id, boss.defeated)}
                    className={`ml-auto text-xs px-3 py-1 rounded-full font-bold ${boss.defeated ? 'bg-green-700 text-green-200' : 'bg-white/10 text-white/50'}`}
                  >
                    {boss.defeated ? '已擊敗 ✓' : '未擊敗'}
                  </button>
                </div>

                <div className="space-y-1 pl-8">
                  {boss.quests.map(q => (
                    <div key={q.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleQuest(team.team_id, q.id, q.completed)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${q.completed ? 'bg-green-500 border-green-500' : 'border-white/30'}`}
                      >
                        {q.completed && <span className="text-xs text-white">✓</span>}
                      </button>
                      <span className={`text-sm ${q.completed ? 'text-green-300 line-through opacity-60' : 'text-white/80'}`}>
                        {q.emoji} {q.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
