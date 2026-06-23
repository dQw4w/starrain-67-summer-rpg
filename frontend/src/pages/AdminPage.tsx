import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, RotateCcw, ExternalLink, CheckCircle, Circle, Shield, Eye, EyeOff, QrCode, Images, Download, ImageOff, X, Trash2, Check, FlaskConical, CloudRain } from 'lucide-react'
import type { TeamState, Boss, GameSettings } from '../types'
import { api } from '../api'

// ── Simple PIN gate ──────────────────────────────────────────────────────────
const ADMIN_PIN = '0000'   // 可在此修改密碼

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [show, setShow] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = () => {
    if (pin === ADMIN_PIN) {
      onUnlock()
    } else {
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-6">
      <motion.div
        animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xs bg-white/5 rounded-3xl p-8 border border-white/10 text-center"
      >
        <Shield size={40} className="mx-auto text-white/40 mb-4" />
        <h1 className="text-white font-black text-xl mb-6">工作人員後台</h1>
        <div className="relative mb-4">
          <input
            type={show ? 'text' : 'password'}
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="請輸入密碼"
            className="w-full bg-white/10 text-white text-center text-xl rounded-2xl py-3 px-4 border border-white/20 outline-none focus:border-purple-400 tracking-widest"
            autoFocus
          />
          <button
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={submit}
          className="w-full py-3 bg-purple-600 text-white font-black rounded-2xl"
        >
          進入
        </motion.button>
      </motion.div>
    </div>
  )
}

// ── Difficulty labels ────────────────────────────────────────────────────────
const DIFF_META: Record<string, { label: string; color: string }> = {
  easy:   { label: '🌱 簡單', color: 'text-green-400' },
  normal: { label: '⚡ 普通', color: 'text-blue-400' },
  hard:   { label: '🔥 困難', color: 'text-red-400' },
}

// ── Team photo gallery / download ────────────────────────────────────────────
type PhotoItem = { name: string; quest_id: number | null; quest_name: string | null; url: string }

function PhotosModal({ teamId, teamName, onClose }: { teamId: number; teamName: string; onClose: () => void }) {
  const [photos, setPhotos] = useState<PhotoItem[] | null>(null)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<null | 'team' | 'selected'>(null)

  const load = useCallback(() => {
    setError(false)
    setPhotos(null)
    setSelected(new Set())
    setConfirm(null)
    api.adminTeamPhotos(teamId).then(setPhotos).catch(() => setError(true))
  }, [teamId])

  useEffect(() => { load() }, [load])

  const toggle = (name: string) =>
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(name)) n.delete(name); else n.add(name)
      return n
    })

  const allSelected = !!photos && photos.length > 0 && selected.size === photos.length
  const toggleAll = () =>
    setSelected(allSelected || !photos ? new Set() : new Set(photos.map(p => p.name)))

  const deleteSelected = async () => {
    setBusy(true)
    try {
      await api.adminDeleteSelectedPhotos(teamId, [...selected])
      load()
    } finally { setBusy(false) }
  }

  const deleteTeam = async () => {
    setBusy(true)
    try {
      await api.adminDeleteTeamPhotos(teamId)
      load()
    } finally { setBusy(false) }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-2xl max-h-[88dvh] bg-[#15151f] rounded-t-3xl sm:rounded-3xl border border-white/10 flex flex-col overflow-hidden"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <h3 className="text-white font-black truncate">{teamName}・上傳照片</h3>
            <p className="text-white/40 text-xs">{photos ? `${photos.length} 張` : '載入中…'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {photos && photos.length > 0 && (
              <a
                href={api.adminTeamPhotosZipUrl(teamId)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-3 py-2 rounded-xl"
              >
                <Download size={15} /> 下載全部
              </a>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white p-1">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Selection / delete toolbar */}
        {photos && photos.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/10 shrink-0 text-sm">
            <button onClick={toggleAll} className="text-white/50 hover:text-white font-bold">
              {allSelected ? '取消全選' : '全選'}
            </button>
            {selected.size > 0 && <span className="text-white/40">已選 {selected.size} 張</span>}

            <div className="ml-auto flex items-center gap-2">
              {confirm ? (
                <>
                  <span className="text-red-300 text-xs">
                    確定刪除{confirm === 'team' ? '全部' : `這 ${selected.size} 張`}？
                  </span>
                  <button
                    disabled={busy}
                    onClick={confirm === 'team' ? deleteTeam : deleteSelected}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {busy ? '刪除中…' : '確認'}
                  </button>
                  <button onClick={() => setConfirm(null)} className="text-white/50 px-2 py-1.5">取消</button>
                </>
              ) : (
                <>
                  {selected.size > 0 && (
                    <button
                      onClick={() => setConfirm('selected')}
                      className="flex items-center gap-1.5 bg-red-900/50 hover:bg-red-900/70 text-red-300 font-bold px-3 py-1.5 rounded-lg"
                    >
                      <Trash2 size={14} /> 刪除選取
                    </button>
                  )}
                  <button
                    onClick={() => setConfirm('team')}
                    className="flex items-center gap-1.5 text-white/40 hover:text-red-300 px-2 py-1.5"
                  >
                    <Trash2 size={14} /> 清空此隊
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="overflow-y-auto p-5">
          {error ? (
            <p className="text-red-400 text-center py-12">載入失敗，請重試</p>
          ) : !photos ? (
            <p className="text-white/40 text-center py-12">載入中…</p>
          ) : photos.length === 0 ? (
            <div className="text-center py-14 text-white/30">
              <ImageOff size={36} className="mx-auto mb-3" />
              <p>這組還沒有上傳任何照片</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map(p => {
                const isSel = selected.has(p.name)
                return (
                  <div
                    key={p.name}
                    className={`relative bg-white/5 rounded-2xl overflow-hidden border transition-all ${
                      isSel ? 'border-purple-400 ring-2 ring-purple-400/50' : 'border-white/10'
                    }`}
                  >
                    <button
                      onClick={() => toggle(p.name)}
                      className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${
                        isSel ? 'bg-purple-500 border-purple-400 text-white' : 'bg-black/50 border-white/50 text-transparent'
                      }`}
                      title="選取"
                    >
                      <Check size={14} />
                    </button>
                    <a href={p.url} target="_blank" rel="noreferrer" className="block aspect-square bg-black/40">
                      <img src={p.url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                    </a>
                    <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                      <span className="text-white/50 text-xs truncate">
                        {p.quest_name ?? (p.quest_id ? `任務 ${p.quest_id}` : '照片')}
                      </span>
                      <a href={`${p.url}?dl=1`} className="text-purple-400 hover:text-purple-300 shrink-0" title="下載這張">
                        <Download size={15} />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Per-team card ────────────────────────────────────────────────────────────
function TeamCard({
  team,
  onQuestToggle,
  onBossToggle,
  onDifficulty,
  onReset,
}: {
  team: TeamState
  onQuestToggle: (questId: number, current: boolean) => Promise<void>
  onBossToggle: (bossId: number, current: boolean) => Promise<void>
  onDifficulty: (d: string) => Promise<void>
  onReset: () => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)

  const wrap = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    await fn()
    setBusy(null)
  }

  const totalQuests = team.bosses.reduce((a, b) => a + b.quests.length, 0)
  const doneQuests  = team.bosses.reduce((a, b) => a + b.quests.filter(q => q.completed).length, 0)
  const defeatedBosses = team.bosses.filter(b => b.defeated).length
  const teamUrl = `${window.location.origin}/team/${team.token}`

  return (
    <>
    <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl font-black text-white">{team.name}</h2>
            <p className="text-white/40 text-sm mt-0.5">
              任務 {doneQuests}/{totalQuests} · 魔王 {defeatedBosses}/{team.total_bosses}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 mt-1">
            <button
              onClick={() => setShowPhotos(true)}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
            >
              <Images size={13} /> 照片
            </button>
            <a
              href={teamUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              開啟介面 <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            animate={{ width: totalQuests ? `${(doneQuests / totalQuests) * 100}%` : '0%' }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/40 text-xs">難易度：</span>
          {(['easy', 'normal', 'hard'] as const).map(d => (
            <button
              key={d}
              disabled={busy === `diff-${d}`}
              onClick={() => wrap(`diff-${d}`, () => onDifficulty(d))}
              className={`text-xs px-3 py-1 rounded-full font-bold transition-all border ${
                team.difficulty === d
                  ? 'bg-white/15 border-white/40 ' + DIFF_META[d].color
                  : 'border-white/10 text-white/30 hover:text-white/60'
              }`}
            >
              {DIFF_META[d].label}
            </button>
          ))}

          <div className="ml-auto">
            {confirmReset ? (
              <div className="flex gap-2">
                <button
                  onClick={() => wrap('reset', async () => { await onReset(); setConfirmReset(false) })}
                  className="text-xs px-3 py-1 bg-red-600 text-white rounded-full font-bold"
                >
                  確認重置
                </button>
                <button onClick={() => setConfirmReset(false)} className="text-xs px-3 py-1 bg-white/10 text-white/60 rounded-full">
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs flex items-center gap-1 px-3 py-1 bg-white/5 text-white/40 hover:text-red-400 rounded-full"
              >
                <RotateCcw size={11} /> 重置此組
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Boss + Quest list */}
      <div className="divide-y divide-white/5">
        {team.bosses.map((boss: Boss) => (
          <div key={boss.id} className="px-5 py-4">
            {/* Boss row */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{boss.emoji}</span>
              <div className="flex-1">
                <span className={`font-bold text-sm ${boss.defeated ? 'line-through text-white/40' : 'text-white'}`}>
                  {boss.name}
                </span>
                <span className="text-white/30 text-xs ml-2">{boss.location_name}</span>
              </div>
              <button
                disabled={busy === `boss-${boss.id}`}
                onClick={() => wrap(`boss-${boss.id}`, () => onBossToggle(boss.id, boss.defeated))}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                  boss.defeated
                    ? 'bg-green-800/60 text-green-300 border border-green-600/40'
                    : 'bg-white/8 text-white/40 border border-white/10 hover:text-white'
                }`}
              >
                {busy === `boss-${boss.id}` ? '...' : boss.defeated ? '✓ 已擊敗' : '標記擊敗'}
              </button>
            </div>

            {/* Quest rows */}
            <div className="space-y-2 pl-9">
              {boss.quests.map(q => (
                <div key={q.id} className="flex items-center gap-3">
                  <button
                    disabled={busy === `quest-${q.id}`}
                    onClick={() => wrap(`quest-${q.id}`, () => onQuestToggle(q.id, q.completed))}
                    className="shrink-0"
                  >
                    {busy === `quest-${q.id}` ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                        <RefreshCw size={18} className="text-white/40" />
                      </motion.div>
                    ) : q.completed ? (
                      <CheckCircle size={20} className="text-green-400" />
                    ) : (
                      <Circle size={20} className="text-white/25 hover:text-white/60 transition-colors" />
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${q.completed ? 'line-through text-white/30' : 'text-white/75'}`}>
                    {q.emoji} {q.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

    <AnimatePresence>
      {showPhotos && (
        <PhotosModal teamId={team.team_id} teamName={team.name} onClose={() => setShowPhotos(false)} />
      )}
    </AnimatePresence>
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [teams, setTeams] = useState<TeamState[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmResetAll, setConfirmResetAll] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [confirmDelPhotos, setConfirmDelPhotos] = useState(false)
  const [delPhotosBusy, setDelPhotosBusy] = useState(false)
  const [gameSettings, setGameSettings] = useState<GameSettings>({ qr_test_mode: false, rain_mode: false })
  const [settingsBusy, setSettingsBusy] = useState(false)

  const toggleSetting = async (key: keyof GameSettings) => {
    const next = !gameSettings[key]
    setGameSettings(prev => ({ ...prev, [key]: next }))
    setSettingsBusy(true)
    try {
      const updated = await api.adminUpdateSettings({ [key]: next })
      setGameSettings(updated)
    } finally {
      setSettingsBusy(false)
    }
  }

  const handleDeleteAllPhotos = async () => {
    setDelPhotosBusy(true)
    try {
      await api.adminDeleteAllPhotos()
    } finally {
      setDelPhotosBusy(false)
      setConfirmDelPhotos(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [list, s] = await Promise.all([api.adminListTeams(), api.getSettings()])
    const full = await Promise.all(list.map(t => api.adminGetTeam(t.id)))
    setTeams(full)
    setGameSettings(s)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (unlocked) load()
  }, [unlocked, load])

  // Optimistic update helper: update local state immediately, re-fetch in background
  const optimisticUpdate = (updater: (teams: TeamState[]) => TeamState[]) => {
    setTeams(prev => updater(prev))
  }

  const handleQuestToggle = async (teamId: number, questId: number, current: boolean) => {
    optimisticUpdate(ts => ts.map(t =>
      t.team_id !== teamId ? t : {
        ...t,
        bosses: t.bosses.map(b => ({
          ...b,
          quests: b.quests.map(q => q.id === questId ? { ...q, completed: !current } : q),
        })),
      }
    ))
    await api.adminSetQuest(teamId, questId, !current)
    load()
  }

  const handleBossToggle = async (teamId: number, bossId: number, current: boolean) => {
    optimisticUpdate(ts => ts.map(t =>
      t.team_id !== teamId ? t : {
        ...t,
        bosses: t.bosses.map(b => b.id === bossId ? { ...b, defeated: !current } : b),
        puzzle_pieces: t.bosses.filter(b => b.id === bossId ? !current : b.defeated).length,
      }
    ))
    await api.adminSetBoss(teamId, bossId, !current)
    load()
  }

  const handleDifficulty = async (teamId: number, d: string) => {
    optimisticUpdate(ts => ts.map(t => t.team_id === teamId ? { ...t, difficulty: d } : t))
    await api.adminUpdateTeam(teamId, { difficulty: d })
    load()
  }

  const handleReset = async (teamId: number) => {
    await api.adminResetTeam(teamId)
    load()
  }

  const handleResetAll = async () => {
    await api.adminResetAll()
    setConfirmResetAll(false)
    load()
  }

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="min-h-screen bg-[#0d0d1a] px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">工作人員後台</h1>
          {lastUpdated && (
            <p className="text-white/30 text-xs mt-0.5">
              更新於 {lastUpdated.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <RefreshCw size={20} />
            </motion.div>
          </button>

          <AnimatePresence mode="wait">
            {confirmResetAll ? (
              <motion.div key="confirm" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex gap-2">
                <button onClick={handleResetAll} className="bg-red-600 px-3 py-1.5 rounded-xl text-white text-sm font-bold">
                  確認重置全部
                </button>
                <button onClick={() => setConfirmResetAll(false)} className="bg-white/10 px-3 py-1.5 rounded-xl text-white/60 text-sm">
                  取消
                </button>
              </motion.div>
            ) : (
              <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setConfirmResetAll(true)}
                className="flex items-center gap-1.5 bg-red-900/40 text-red-400 text-sm px-3 py-1.5 rounded-xl hover:bg-red-900/60 transition-colors">
                <RotateCcw size={13} /> 全部重置
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global toggles */}
      <div className="space-y-2 mb-4">
        {([
          { key: 'qr_test_mode' as const, icon: FlaskConical, label: '掃描測試模式（跳過QR碼掃描）', color: 'amber' },
          { key: 'rain_mode'    as const, icon: CloudRain,    label: '雨備模式（切換備用題目）',        color: 'sky'   },
        ] as const).map(({ key, icon: Icon, label, color }) => {
          const on = gameSettings[key]
          return (
            <button
              key={key}
              onClick={() => !settingsBusy && toggleSetting(key)}
              disabled={settingsBusy}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-colors font-bold text-sm disabled:opacity-60 ${
                on
                  ? color === 'amber'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon size={16} />
                {label}
              </span>
              <span className={`w-10 h-6 rounded-full flex items-center shrink-0 px-0.5 transition-colors ${
                on
                  ? color === 'amber' ? 'bg-amber-500' : 'bg-sky-500'
                  : 'bg-white/20'
              }`}>
                <motion.span
                  animate={{ x: on ? 16 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-5 h-5 bg-white rounded-full block shadow"
                />
              </span>
            </button>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <a
          href="/admin/qr"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors font-bold text-sm"
        >
          <QrCode size={16} /> 列印魔王 QR 碼
        </a>
        <a
          href={api.adminAllPhotosZipUrl()}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors font-bold text-sm"
        >
          <Download size={16} /> 下載全部照片
        </a>

        {confirmDelPhotos ? (
          <div className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-900/30 border border-red-700/40">
            <span className="text-red-300 text-sm font-bold">確定刪除所有隊伍的照片？無法復原</span>
            <button
              onClick={handleDeleteAllPhotos}
              disabled={delPhotosBusy}
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {delPhotosBusy ? '刪除中…' : '確認刪除'}
            </button>
            <button onClick={() => setConfirmDelPhotos(false)} className="text-white/50 text-sm px-2 py-1.5">
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelPhotos(true)}
            className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-red-300 hover:border-red-700/40 transition-colors font-bold text-sm"
          >
            <Trash2 size={16} /> 刪除全部照片
          </button>
        )}
      </div>

      {/* Team overview strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {teams.map(t => {
          const total = t.bosses.reduce((a, b) => a + b.quests.length, 0)
          const done  = t.bosses.reduce((a, b) => a + b.quests.filter(q => q.completed).length, 0)
          return (
            <div key={t.team_id} className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
              <p className="text-white font-bold text-sm truncate">{t.name.replace('探險小隊', '隊')}</p>
              <p className="text-white/40 text-xs mt-0.5">{done}/{total} 任務</p>
              <p className="text-white/40 text-xs">{t.puzzle_pieces}/{t.total_bosses} 魔王</p>
              <p className={`text-xs mt-1 font-bold ${DIFF_META[t.difficulty]?.color}`}>
                {DIFF_META[t.difficulty]?.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Team cards */}
      <div className="space-y-4">
        {loading && teams.length === 0 ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="text-4xl">🦆</motion.div>
          </div>
        ) : (
          teams.map(team => (
            <motion.div key={team.team_id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <TeamCard
                team={team}
                onQuestToggle={(qId, cur) => handleQuestToggle(team.team_id, qId, cur)}
                onBossToggle={(bId, cur) => handleBossToggle(team.team_id, bId, cur)}
                onDifficulty={(d) => handleDifficulty(team.team_id, d)}
                onReset={() => handleReset(team.team_id)}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
