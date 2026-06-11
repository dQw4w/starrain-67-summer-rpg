import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  current: string
  onSelect: (d: string) => void
  onClose: () => void
}

const LEVELS = [
  { key: 'easy',   label: '簡單', emoji: '🌱', color: 'bg-green-600' },
  { key: 'normal', label: '普通', emoji: '⚡', color: 'bg-blue-600' },
  { key: 'hard',   label: '困難', emoji: '🔥', color: 'bg-red-600' },
]

export default function DifficultyModal({ current, onSelect, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-xs bg-gray-900 rounded-3xl p-6 border border-white/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          <p className="text-white/50 text-xs text-center mb-4 tracking-widest uppercase">難易度調整</p>
          <div className="space-y-3">
            {LEVELS.map(l => (
              <motion.button
                key={l.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => { onSelect(l.key); onClose() }}
                className={`w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-3 text-lg ${l.color} ${current === l.key ? 'ring-2 ring-white' : 'opacity-70'}`}
              >
                <span>{l.emoji}</span>
                {l.label}
                {current === l.key && <span className="text-xs opacity-70">（目前）</span>}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
