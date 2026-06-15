import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Lock, MapPin, QrCode } from 'lucide-react'
import type { Boss, Quest } from '../types'
import QuestModal from './QuestModal'
import QrScanner from './QrScanner'
import TapBattle from './TapBattle'

interface Props {
  boss: Boss
  onQuestSubmit: (questId: number, answerIndex?: number, answerText?: string) => Promise<boolean>
  onDefeat: (bossId: number) => Promise<void>
}

export default function BossCard({ boss, onQuestSubmit, onDefeat }: Props) {
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [showLocation, setShowLocation] = useState(false)
  const [scanning, setScanning] = useState(false)   // QR scan step
  const [battling, setBattling] = useState(false)   // tap battle step

  const doneCount = boss.quests.filter(q => q.completed).length
  const total = boss.quests.length
  const progress = total > 0 ? doneCount / total : 0

  return (
    <>
      <motion.div
        layout
        className={`rounded-3xl p-5 border-2 ${
          boss.defeated
            ? 'bg-green-900/30 border-green-500/40'
            : boss.all_quests_done
            ? 'bg-orange-900/40 border-brand-orange/60 shadow-lg shadow-orange-500/20'
            : 'bg-white/5 border-white/10'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={!boss.defeated && boss.all_quests_done ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-5xl"
          >
            {boss.defeated ? '✅' : boss.emoji}
          </motion.div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white">
              {boss.defeated
                ? <span className="line-through opacity-50">{boss.name}</span>
                : boss.name}
            </h3>
            <p className="text-white/50 text-sm">{boss.location_name}</p>
          </div>
          {boss.defeated && <CheckCircle size={28} className="text-green-400 shrink-0" />}
          {!boss.defeated && !boss.all_quests_done && <Lock size={22} className="text-white/30 shrink-0" />}
        </div>

        {/* Progress bar */}
        {!boss.defeated && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>任務進度</span>
              <span>{doneCount}/{total}</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-orange to-brand-yellow rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Quest list */}
        {!boss.defeated && (
          <div className="space-y-2 mb-4">
            {boss.quests.map(q => (
              <motion.button
                key={q.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => !q.completed && setActiveQuest(q)}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-2xl text-left transition-all ${
                  q.completed
                    ? 'bg-green-500/20 border border-green-500/30 cursor-default'
                    : 'bg-white/10 border border-white/10 hover:bg-white/15 active:bg-white/20'
                }`}
              >
                <span className="text-2xl">{q.completed ? '✅' : q.emoji}</span>
                <span className={`font-bold flex-1 ${q.completed ? 'text-green-300 line-through opacity-70' : 'text-white'}`}>
                  {q.name}
                </span>
                {!q.completed && <span className="text-white/40 text-sm">點擊開始</span>}
              </motion.button>
            ))}
          </div>
        )}

        {/* Battle section */}
        {!boss.defeated && boss.all_quests_done && (
          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLocation(v => !v)}
              className="w-full py-3 px-4 rounded-2xl bg-yellow-500/20 border border-brand-yellow/40 text-brand-yellow font-bold flex items-center justify-center gap-2"
            >
              <MapPin size={18} />
              {showLocation ? '隱藏魔王位置' : '查看魔王在哪裡！'}
            </motion.button>

            <AnimatePresence>
              {showLocation && boss.location_hint && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-yellow-500/10 border border-brand-yellow/30 rounded-2xl p-4 text-center"
                >
                  <p className="text-brand-yellow font-bold text-sm leading-relaxed">
                    📍 {boss.location_hint}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setScanning(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-lg shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
            >
              <QrCode size={22} />
              掃描QR碼挑戰 {boss.name}！
            </motion.button>
          </div>
        )}
      </motion.div>

      {activeQuest && (
        <QuestModal
          quest={activeQuest}
          onClose={() => setActiveQuest(null)}
          onSubmit={async (idx, text) => {
            const ok = await onQuestSubmit(activeQuest.id, idx, text)
            return ok
          }}
        />
      )}

      {scanning && (
        <QrScanner
          bossId={boss.id}
          bossName={boss.name}
          onSuccess={() => { setScanning(false); setBattling(true) }}
          onClose={() => setScanning(false)}
        />
      )}

      {battling && (
        <TapBattle
          bossEmoji={boss.emoji}
          bossName={boss.name}
          onVictory={async () => { await onDefeat(boss.id) }}
          onClose={() => setBattling(false)}
        />
      )}
    </>
  )
}
