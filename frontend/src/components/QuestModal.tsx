import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X, Camera, ImagePlus } from 'lucide-react'
import type { Quest, QuestOption } from '../types'
import MatchQuest from './MatchQuest'

interface Props {
  quest: Quest
  onClose: () => void
  onSubmit: (answerIndex?: number, answerText?: string) => Promise<boolean>
  onSubmitPhotos?: (files: File[]) => Promise<boolean>
}

export default function QuestModal({ quest, onClose, onSubmit, onSubmitPhotos }: Props) {
  const [selected, setSelected]           = useState<number | null>(null)
  const [fillText, setFillText]           = useState('')
  const [result, setResult]               = useState<'correct' | 'wrong' | null>(null)
  const [loading, setLoading]             = useState(false)
  const [matchPlacements, setMatchPlacements] = useState<Record<string, string>>({})

  // Portrait detection (only matters for drag_match landscape mode)
  const [portrait, setPortrait] = useState(
    () => typeof window !== 'undefined'
      ? window.matchMedia('(orientation: portrait)').matches
      : true
  )
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const h = (e: MediaQueryListEvent) => setPortrait(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // Photo task state
  const photoCount: number = quest.type === 'photo_task' ? (quest.options?.[0]?.count ?? 1) : 0
  const [photos, setPhotos] = useState<(string | null)[]>(Array(photoCount).fill(null))      // preview URLs
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>(Array(photoCount).fill(null)) // actual files to upload
  const photoRefs  = useRef<(HTMLInputElement | null)[]>([])  // camera (capture)
  const uploadRefs = useRef<(HTMLInputElement | null)[]>([])  // gallery / files

  const isPhotoTask   = quest.type === 'photo_task'
  const isDragMatch   = quest.type === 'drag_match'
  const isMultiChoice = !isPhotoTask && !isDragMatch && !!quest.options && quest.options.length > 1
  const isFillIn      = !isPhotoTask && !isDragMatch && !!quest.options && quest.options.length === 1
  const isTask        = !isMultiChoice && !isFillIn && !isPhotoTask && !isDragMatch

  const allPhotosTaken = photos.every(p => p !== null)
  const matchOptions   = (quest.options ?? []) as QuestOption[]
  const allMatched     = isDragMatch && matchOptions.every(o => Object.values(matchPlacements).includes(o.animal!))

  const canSubmit =
    (isMultiChoice && selected !== null) ||
    (isFillIn && fillText.trim().length > 0) ||
    (isPhotoTask && allPhotosTaken) ||
    (isDragMatch && allMatched) ||
    isTask

  const handlePhotoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotos(prev => { const n = [...prev]; n[index] = URL.createObjectURL(file); return n })
    setPhotoFiles(prev => { const n = [...prev]; n[index] = file; return n })
  }

  const handleSubmit = async () => {
    if (!canSubmit || loading) return
    setLoading(true)
    let correct: boolean
    if (isPhotoTask) {
      const files = photoFiles.filter((f): f is File => f !== null)
      correct = onSubmitPhotos ? await onSubmitPhotos(files) : await onSubmit()
    } else if (isMultiChoice) {
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

  // ── Drag-match: full-screen landscape overlay ──────────────────────────────
  if (isDragMatch) {
    const overlayStyle: React.CSSProperties = portrait
      ? {
          width:     '100dvh',
          height:    '100dvw',
          top:       '50%',
          left:      '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
        }
      : { inset: 0 }

    return (
      <AnimatePresence>
        <motion.div
          className="fixed z-50 bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex flex-col overflow-hidden"
          style={overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-white/10 shrink-0">
            <span className="text-3xl shrink-0">{quest.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base leading-tight">{quest.name}</p>
              <p className="text-white/60 text-xs mt-0.5">{quest.description}</p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white shrink-0 p-1">
              <X size={20} />
            </button>
          </div>

          {/* MatchQuest fills remaining height */}
          <div className="flex-1 overflow-hidden px-5 py-3 min-h-0">
            <MatchQuest
              options={quest.options!}
              onChange={p => { setMatchPlacements(p); setResult(null) }}
            />
          </div>

          {/* Footer */}
          <div className="px-5 pb-4 pt-2 shrink-0 border-t border-white/10">
            {result === 'wrong' && (
              <p className="text-center text-red-300 font-bold mb-2 text-sm">❌ 再想想看！</p>
            )}
            {result === 'correct' ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle size={28} className="text-green-400" />
                <p className="text-green-300 font-black text-lg">完成！</p>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="w-full py-3 rounded-2xl font-black text-lg shadow-lg disabled:opacity-40 bg-brand-orange text-white shadow-orange-500/30"
              >
                {loading ? '確認中...' : '送出答案 🚀'}
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ── Normal portrait modal ──────────────────────────────────────────────────
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

          {/* Fill-in */}
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

          {/* Photo task */}
          {isPhotoTask && (
            <div className="mb-6 space-y-3">
              {quest.image && (
                <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/30">
                  <img src={quest.image} alt="要尋找的目標" className="w-full max-h-56 object-contain" />
                  <p className="text-center text-white/60 text-xs py-1.5 bg-white/5">👆 找到照片中的這個目標</p>
                </div>
              )}
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
                          onClick={() => {
                            setPhotos(prev => { const n = [...prev]; n[i] = null; return n })
                            setPhotoFiles(prev => { const n = [...prev]; n[i] = null; return n })
                          }}
                          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1">
                        <span className="text-white/40 text-xs mb-0.5">第 {i + 1} 張</span>
                        <button
                          onClick={() => photoRefs.current[i]?.click()}
                          className="flex items-center gap-1 text-white/70 hover:text-white text-xs bg-white/10 rounded-full px-3 py-1.5"
                        >
                          <Camera size={13} /> 拍照
                        </button>
                        <button
                          onClick={() => uploadRefs.current[i]?.click()}
                          className="flex items-center gap-1 text-white/70 hover:text-white text-xs bg-white/10 rounded-full px-3 py-1.5"
                        >
                          <ImagePlus size={13} /> 上傳
                        </button>
                      </div>
                    )}
                    <input
                      ref={el => { photoRefs.current[i] = el }}
                      type="file" accept="image/*" capture="environment"
                      className="hidden"
                      onChange={e => handlePhotoChange(i, e)}
                    />
                    <input
                      ref={el => { uploadRefs.current[i] = el }}
                      type="file" accept="image/*"
                      className="hidden"
                      onChange={e => handlePhotoChange(i, e)}
                    />
                  </div>
                ))}
              </div>
              {photoCount === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => photoRefs.current[0]?.click()}
                    className="py-3 rounded-2xl bg-white/10 border-2 border-white/20 text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    {photos[0] ? '重拍' : '拍照'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => uploadRefs.current[0]?.click()}
                    className="py-3 rounded-2xl bg-white/10 border-2 border-white/20 text-white font-bold flex items-center justify-center gap-2"
                  >
                    <ImagePlus size={18} />
                    上傳照片
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {/* Plain task */}
          {isTask && <div className="mb-6" />}

          {result === 'wrong' && (
            <p className="text-center text-red-300 font-bold mb-4">❌ 再想想看！</p>
          )}

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
              {loading ? '確認中...' : isTask || isPhotoTask ? '✅ 任務完成！' : '送出答案 🚀'}
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
