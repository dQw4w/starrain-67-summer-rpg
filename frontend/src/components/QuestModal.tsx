import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X, Camera, ImagePlus } from 'lucide-react'
import type { Quest, QuestOption } from '../types'
import MatchQuest from './MatchQuest'

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
  const [matchPlacements, setMatchPlacements] = useState<Record<string, string>>({})

  // Photo task state
  const photoCount: number = quest.type === 'photo_task' ? (quest.options?.[0]?.count ?? 1) : 0
  const [photos, setPhotos] = useState<(string | null)[]>(Array(photoCount).fill(null))
  const photoRefs = useRef<(HTMLInputElement | null)[]>([])

  // UI mode detection
  const isPhotoTask  = quest.type === 'photo_task'
  const isDragMatch  = quest.type === 'drag_match'
  const isMultiChoice = !isPhotoTask && !isDragMatch && !!quest.options && quest.options.length > 1
  const isFillIn      = !isPhotoTask && !isDragMatch && !!quest.options && quest.options.length === 1
  const isTask        = !isMultiChoice && !isFillIn && !isPhotoTask && !isDragMatch

  const allPhotosTaken = photos.every(p => p !== null)
  const matchOptions = (quest.options ?? []) as QuestOption[]
  const allMatched = isDragMatch && matchOptions.every(o => Object.values(matchPlacements).includes(o.animal!))

  const canSubmit =
    (isMultiChoice && selected !== null) ||
    (isFillIn && fillText.trim().length > 0) ||
    (isPhotoTask && allPhotosTaken) ||
    (isDragMatch && allMatched) ||
    isTask

  const handlePhotoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotos(prev => {
      const next = [...prev]
      next[index] = url
      return next
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit || loading) return
    setLoading(true)

    let correct: boolean
    if (isMultiChoice) {
      correct = await onSubmit(selected!)
    } else if (isFillIn) {
      correct = await onSubmit(undefined, fillText.trim())
    } else if (isDragMatch) {
      correct = await onSubmit(undefined, JSON.stringify(matchPlacements))
    } else {
      correct = await onSubmit()
    }

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
          className="relative w-full max-w-md bg-gradient-to-b from-indigo-900 to-purple-900 rounded-3xl p-6 shadow-2xl border border-purple-500/40 max-h-[90dvh] overflow-y-auto"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-10">
            <X size={22} />
          </button>

          <div className="text-4xl text-center mb-2">{quest.emoji}</div>
          <h2 className="text-xl font-black text-center text-white mb-4">{quest.name}</h2>
          <p className="text-white/90 text-center text-base leading-relaxed mb-6">
            {quest.description}
          </p>

          {/* ── Multiple choice ── */}
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

          {/* ── Fill-in ── */}
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

          {/* ── Photo task: N slots ── */}
          {isPhotoTask && (
            <div className="mb-6 space-y-3">
              <p className="text-white/50 text-sm text-center">
                需要拍 {photoCount} 張照片（{photos.filter(Boolean).length}/{photoCount} 張已拍）
              </p>
              <div className={`grid gap-3 ${photoCount === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {Array.from({ length: photoCount }).map((_, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 border-2 border-dashed border-white/20">
                    {photos[i] ? (
                      <>
                        <img src={photos[i]!} alt={`照片 ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setPhotos(prev => { const n = [...prev]; n[i] = null; return n })}
                          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => photoRefs.current[i]?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        <ImagePlus size={28} />
                        <span className="text-xs">第 {i + 1} 張</span>
                      </button>
                    )}
                    <input
                      ref={el => { photoRefs.current[i] = el }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => handlePhotoChange(i, e)}
                    />
                  </div>
                ))}
              </div>
              {photoCount === 1 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => photoRefs.current[0]?.click()}
                  className="w-full py-3 rounded-2xl bg-white/10 border-2 border-white/20 text-white font-bold flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  {photos[0] ? '重新拍攝' : '開啟相機拍照'}
                </motion.button>
              )}
            </div>
          )}

          {/* ── Drag match ── */}
          {isDragMatch && quest.options && (
            <div className="mb-6">
              <MatchQuest
                options={quest.options}
                onChange={p => { setMatchPlacements(p); setResult(null) }}
              />
            </div>
          )}

          {/* ── Plain task ── */}
          {isTask && <div className="mb-6" />}

          {/* Wrong answer */}
          {result === 'wrong' && (
            <p className="text-center text-red-300 font-bold mb-4">❌ 再想想看！</p>
          )}

          {/* Success / submit button */}
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
                isTask || isPhotoTask
                  ? 'bg-brand-green text-white shadow-green-500/30'
                  : 'bg-brand-orange text-white shadow-orange-500/30'
              }`}
            >
              {loading
                ? '確認中...'
                : isTask || isPhotoTask
                ? '✅ 任務完成！'
                : '送出答案 🚀'}
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
