import { motion } from 'framer-motion'

interface Props {
  pieces: number
  total: number
  victory: boolean
}

const DUCK_PIECES = ['🦆', '🐾', '✨', '🌟', '🎉']

export default function PuzzleBoard({ pieces, total, victory }: Props) {
  return (
    <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
      <h2 className="text-center font-black text-white/70 text-sm uppercase tracking-widest mb-4">
        好棒鴨拼圖
      </h2>

      {victory ? (
        <motion.div
          className="text-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <div className="text-7xl mb-2 animate-float">🦆</div>
          <p className="text-brand-yellow font-black text-2xl">好棒鴨獲救了！</p>
          <p className="text-white/60 text-sm mt-1">太厲害了！探險隊成功！</p>
        </motion.div>
      ) : (
        <>
          <div className="flex justify-center gap-3 mb-4">
            {Array.from({ length: total }).map((_, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={i < pieces ? { scale: [1.3, 1], opacity: 1 } : { scale: 1, opacity: 0.25 }}
                transition={{ duration: 0.4 }}
                className="text-4xl"
              >
                {i < pieces ? DUCK_PIECES[i % DUCK_PIECES.length] : '❓'}
              </motion.div>
            ))}
          </div>
          <p className="text-center text-white/50 text-sm">
            已蒐集 <span className="text-brand-yellow font-black text-base">{pieces}</span> / {total} 塊拼圖
          </p>
        </>
      )}
    </div>
  )
}
