import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QuestOption } from '../types'

interface Props {
  options: QuestOption[]
  onChange: (placements: Record<string, string>) => void
}

const LEVEL_ORDER = ['極危 CR', '瀕危 EN', '易危 VU', '無危 LC']

const LEVEL_STYLE: Record<string, { border: string; bg: string; label: string; dot: string }> = {
  '極危 CR': {
    border: 'border-red-500/60',
    bg: 'bg-red-950/50',
    label: 'text-red-300',
    dot: 'bg-red-400',
  },
  '瀕危 EN': {
    border: 'border-orange-500/60',
    bg: 'bg-orange-950/50',
    label: 'text-orange-300',
    dot: 'bg-orange-400',
  },
  '易危 VU': {
    border: 'border-yellow-500/60',
    bg: 'bg-yellow-950/50',
    label: 'text-yellow-300',
    dot: 'bg-yellow-400',
  },
  '無危 LC': {
    border: 'border-green-500/60',
    bg: 'bg-green-950/50',
    label: 'text-green-300',
    dot: 'bg-green-400',
  },
}

export default function MatchQuest({ options, onChange }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [placements, setPlacements] = useState<Record<string, string>>({})

  const [shuffledAnimals] = useState(() =>
    [...options.map(o => o.animal!)].sort(() => Math.random() - 0.5)
  )

  const levels = LEVEL_ORDER.filter(l => options.some(o => o.level === l))
  const placedSet = new Set(Object.values(placements))
  const unplaced = shuffledAnimals.filter(a => !placedSet.has(a))

  const updatePlacements = (next: Record<string, string>) => {
    setPlacements(next)
    onChange(next)
  }

  const handleAnimalTap = (animal: string) => {
    setSelected(s => s === animal ? null : animal)
  }

  const handleLevelTap = (level: string) => {
    if (selected) {
      // Place selected animal into this slot (possibly swapping out existing)
      const displaced = placements[level]
      const next = { ...placements }
      // Remove selected from whatever slot it was already in
      Object.keys(next).forEach(l => { if (next[l] === selected) delete next[l] })
      next[level] = selected
      updatePlacements(next)
      setSelected(displaced || null) // pick up displaced animal if any
    } else {
      // Pick up animal already in this slot
      const animal = placements[level]
      if (animal) {
        const next = { ...placements }
        delete next[level]
        updatePlacements(next)
        setSelected(animal)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Selected indicator banner */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="selected-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 bg-brand-yellow/10 border border-brand-yellow/40 rounded-2xl px-4 py-2"
          >
            <span className="text-brand-yellow text-xs font-bold">已選取</span>
            <span className="text-white font-black text-sm flex-1">{selected}</span>
            <span className="text-white/40 text-xs">→ 點選等級放入</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unplaced animal chips */}
      {unplaced.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unplaced.map(animal => (
            <motion.button
              key={animal}
              onClick={() => handleAnimalTap(animal)}
              whileTap={{ scale: 0.93 }}
              animate={
                selected === animal
                  ? { scale: 1.08, y: -3 }
                  : { scale: 1, y: 0 }
              }
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`px-3 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                selected === animal
                  ? 'bg-brand-yellow text-black border-yellow-300 shadow-lg shadow-yellow-500/30'
                  : 'bg-white/10 text-white border-white/20 hover:border-white/40'
              }`}
            >
              {animal}
            </motion.button>
          ))}
        </div>
      )}

      {/* Level slots */}
      <div className="space-y-2">
        {levels.map(level => {
          const style = LEVEL_STYLE[level]
          const placed = placements[level]
          const isTarget = !!selected && !placed

          return (
            <motion.button
              key={level}
              onClick={() => handleLevelTap(level)}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                style.bg
              } ${
                isTarget
                  ? `${style.border} ring-1 ring-white/20`
                  : `${style.border} opacity-80`
              }`}
            >
              {/* Dot + level label */}
              <div className="flex items-center gap-2 shrink-0 w-24">
                <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                <span className={`font-black text-xs ${style.label}`}>{level}</span>
              </div>

              {/* Placed animal or placeholder */}
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  {placed ? (
                    <motion.span
                      key={placed}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="text-white font-bold text-sm"
                    >
                      {placed}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`text-xs italic ${isTarget ? 'text-white/50' : 'text-white/20'}`}
                    >
                      {isTarget ? '點這裡放入' : '尚未配對'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Tap-to-remove hint */}
              {placed && (
                <span className="text-white/30 text-xs shrink-0">點選移除</span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
