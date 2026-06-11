import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X } from 'lucide-react'
import type { Quest } from '../types'

interface Props {
  quest: Quest
  onClose: () => void
  onSubmit: (answerIndex?: number) => Promise<boolean>
}

export default function QuestModal({ quest, onClose, onSubmit }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (quest.type === 'multiple_choice' && selected === null) return
    setLoading(true)
    const correct = await onSubmit(quest.type === 'multiple_choice' ? selected! : undefined)
    setLoading(false)
    setResult(correct ? 'correct' : 'wrong')
    if (correct) setTimeout(onClose, 1200)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="relative w-full max-w-md bg-gradient-to-b from-indigo-900 to-purple-900 rounded-3xl p-6 shadow-2xl border border-purple-500/40"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white"
          >
            <X size={22} />
          </button>

          <div className="text-4xl text-center mb-2">{quest.emoji}</div>
          <h2 className="text-xl font-black text-center text-white mb-4">{quest.name}</h2>
          <p className="text-white/90 text-center text-base leading-relaxed mb-6">
            {quest.description}
          </p>

          {quest.type === 'multiple_choice' && quest.options && (
            <div className="space-y-3 mb-6">
              {quest.options.map((opt, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelected(i); setResult(null) }}
                  className={`w-full py-3 px-5 rounded-2xl text-lg font-bold transition-all border-2 ${
                    selected === i
                      ? 'bg-brand-purple border-purple-300 text-white'
                      : 'bg-white/10 border-white/20 text-white'
                  }`}
                >
                  {opt.text}
                </motion.button>
              ))}
            </div>
          )}

          {result === 'wrong' && (
            <p className="text-center text-red-300 font-bold mb-4">❌ 再想想看！</p>
          )}

          {result === 'correct' ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle size={48} className="text-green-400" />
              <p className="text-green-300 font-black text-xl">完成！</p>
            </div>
          ) : quest.type === 'task' ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-brand-green text-white font-black text-xl shadow-lg shadow-green-500/30"
            >
              {loading ? '確認中...' : '✅ 任務完成！'}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={loading || selected === null}
              className="w-full py-4 rounded-2xl bg-brand-orange text-white font-black text-xl shadow-lg shadow-orange-500/30 disabled:opacity-40"
            >
              {loading ? '確認中...' : '送出答案 🚀'}
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
