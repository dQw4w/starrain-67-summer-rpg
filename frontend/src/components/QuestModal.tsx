import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X, Camera } from 'lucide-react'
import type { Quest } from '../types'

interface Props {
  quest: Quest
  onClose: () => void
  onSubmit: (answerIndex?: number, answerText?: string) => Promise<boolean>
}

export default function QuestModal({ quest, onClose, onSubmit }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [fillText, setFillText] = useState('')
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Determine effective UI type from options
  const isMultiChoice = !!quest.options && quest.options.length > 1
  const isFillIn      = !!quest.options && quest.options.length === 1
  const isTask        = !quest.options

  const canSubmit =
    (isMultiChoice && selected !== null) ||
    (isFillIn && fillText.trim().length > 0) ||
    isTask

  const handleSubmit = async () => {
    if (!canSubmit || loading) return
    setLoading(true)

    let correct: boolean
    if (isMultiChoice) {
      correct = await onSubmit(selected!)
    } else if (isFillIn) {
      correct = await onSubmit(undefined, fillText.trim())
    } else {
      correct = await onSubmit()
    }

    setLoading(false)
    setResult(correct ? 'correct' : 'wrong')
    if (correct) setTimeout(onClose, 1200)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
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

          {/* Multiple choice */}
          {isMultiChoice && quest.options && (
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

          {/* Fill-in text input */}
          {isFillIn && (
            <div className="mb-6">
              <input
                type="text"
                value={fillText}
                onChange={e => { setFillText(e.target.value); setResult(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="在這裡輸入答案..."
                className="w-full bg-white/10 text-white text-center text-xl rounded-2xl py-4 px-4 border-2 border-white/20 outline-none focus:border-purple-400 placeholder-white/30"
                autoFocus
              />
            </div>
          )}

          {/* Task: optional photo capture */}
          {isTask && (
            <div className="mb-6 space-y-3">
              {photoUrl ? (
                <div className="relative">
                  <img
                    src={photoUrl}
                    alt="拍攝的照片"
                    className="w-full rounded-2xl object-cover max-h-52"
                  />
                  <button
                    onClick={() => setPhotoUrl(null)}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-3 rounded-2xl bg-white/10 border-2 border-dashed border-white/30 text-white/70 font-bold flex items-center justify-center gap-2"
                >
                  <Camera size={20} /> 拍照（選填）
                </motion.button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          )}

          {/* Wrong answer feedback */}
          {result === 'wrong' && (
            <p className="text-center text-red-300 font-bold mb-4">❌ 再想想看！</p>
          )}

          {/* Result or submit button */}
          {result === 'correct' ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle size={48} className="text-green-400" />
              <p className="text-green-300 font-black text-xl">完成！</p>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              className={`w-full py-4 rounded-2xl font-black text-xl shadow-lg disabled:opacity-40 ${
                isTask
                  ? 'bg-brand-green text-white shadow-green-500/30'
                  : 'bg-brand-orange text-white shadow-orange-500/30'
              }`}
            >
              {loading
                ? '確認中...'
                : isTask
                ? '✅ 任務完成！'
                : '送出答案 🚀'}
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
