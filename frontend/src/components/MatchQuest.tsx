import { useState, useRef, useEffect } from 'react'
import type { QuestOption } from '../types'

interface Props {
  options: QuestOption[]
  onChange: (placements: Record<string, string>) => void
}

const LEVEL_ORDER = ['極危 CR', '瀕危 EN', '易危 VU', '無危 LC']

const LC: Record<string, { bg: string; border: string; text: string; hex: string }> = {
  '極危 CR': { bg: 'bg-red-900/50',    border: 'border-red-500',    text: 'text-red-200',    hex: '#ef4444' },
  '瀕危 EN': { bg: 'bg-orange-900/50', border: 'border-orange-500', text: 'text-orange-200', hex: '#f97316' },
  '易危 VU': { bg: 'bg-yellow-900/50', border: 'border-yellow-500', text: 'text-yellow-200', hex: '#eab308' },
  '無危 LC': { bg: 'bg-green-900/50',  border: 'border-green-500',  text: 'text-green-200',  hex: '#22c55e' },
}

type Pt = { x: number; y: number }

export default function MatchQuest({ options, onChange }: Props) {
  // connections: level → animal (same format backend expects)
  const [connections, setConnections] = useState<Record<string, string>>({})
  const [dragging, setDragging]       = useState<string | null>(null)
  const [dragPt, setDragPt]           = useState<Pt | null>(null)
  const [hoverLevel, setHoverLevel]   = useState<string | null>(null)
  const [tick, setTick]               = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const animalRefs   = useRef<Record<string, HTMLDivElement | null>>({})
  const levelRefs    = useRef<Record<string, HTMLDivElement | null>>({})

  const [shuffledAnimals] = useState(() =>
    [...options.map(o => o.animal!)].sort(() => Math.random() - 0.5)
  )
  const levels = LEVEL_ORDER.filter(l => options.some(o => o.level === l))

  // recalculate SVG lines after first paint
  useEffect(() => { setTick(t => t + 1) }, [])

  const relEdges = (el: HTMLElement) => {
    const cr = containerRef.current!.getBoundingClientRect()
    const r  = el.getBoundingClientRect()
    return { right: r.right - cr.left, left: r.left - cr.left, cy: r.top - cr.top + r.height / 2 }
  }

  const animalLevel = (animal: string) =>
    Object.entries(connections).find(([, a]) => a === animal)?.[0] ?? null

  const setConn = (next: Record<string, string>) => {
    setConnections(next)
    onChange(next)
  }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, animal: string) => {
    e.preventDefault()
    containerRef.current?.setPointerCapture(e.pointerId)
    const cr = containerRef.current!.getBoundingClientRect()
    setDragging(animal)
    setDragPt({ x: e.clientX - cr.left, y: e.clientY - cr.top })
  }

  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const cr = containerRef.current!.getBoundingClientRect()
    setDragPt({ x: e.clientX - cr.left, y: e.clientY - cr.top })
    let found: string | null = null
    for (const [level, el] of Object.entries(levelRefs.current)) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        found = level; break
      }
    }
    setHoverLevel(found)
  }

  const onUp = (e: React.PointerEvent) => {
    if (dragging) {
      for (const [level, el] of Object.entries(levelRefs.current)) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const next = { ...connections }
          Object.keys(next).forEach(l => { if (next[l] === dragging) delete next[l] })
          next[level] = dragging
          setConn(next)
          break
        }
      }
    }
    setDragging(null); setDragPt(null); setHoverLevel(null)
  }

  const onCancel = () => { setDragging(null); setDragPt(null); setHoverLevel(null) }

  // Build SVG paths
  void tick
  const connLines = Object.entries(connections).flatMap(([level, animal]) => {
    if (dragging === animal) return []
    const ae = animalRefs.current[animal]; const le = levelRefs.current[level]
    if (!ae || !le || !containerRef.current) return []
    const a = relEdges(ae); const l = relEdges(le)
    const cx = (a.right + l.left) / 2
    return [{ key: `${level}`, d: `M ${a.right} ${a.cy} C ${cx} ${a.cy}, ${cx} ${l.cy}, ${l.left} ${l.cy}`, color: LC[level]?.hex ?? '#fff' }]
  })

  const dragLine = (() => {
    if (!dragging || !dragPt || !containerRef.current) return null
    const ae = animalRefs.current[dragging]; if (!ae) return null
    const a = relEdges(ae)
    const cx = (a.right + dragPt.x) / 2
    const lvl = animalLevel(dragging)
    const color = hoverLevel ? (LC[hoverLevel]?.hex ?? '#fff') : (lvl ? LC[lvl]?.hex : '#ffffff88')
    return { d: `M ${a.right} ${a.cy} C ${cx} ${a.cy}, ${cx} ${dragPt.y}, ${dragPt.x} ${dragPt.y}`, color: color ?? '#ffffff88' }
  })()

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ touchAction: 'none' }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
    >
      {/* SVG connection lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 5 }}
      >
        {connLines.map(l => (
          <path key={l.key} d={l.d} stroke={l.color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        ))}
        {dragLine && (
          <path d={dragLine.d} stroke={dragLine.color} strokeWidth={2.5} strokeDasharray="7 3" fill="none" strokeLinecap="round" />
        )}
      </svg>

      <div className="flex gap-4">
        {/* Animals */}
        <div className="flex flex-col gap-2.5 flex-1" style={{ position: 'relative', zIndex: 10 }}>
          {shuffledAnimals.map(animal => {
            const lvl = animalLevel(animal)
            const c   = lvl ? LC[lvl] : null
            const active = dragging === animal
            return (
              <div
                key={animal}
                ref={el => { animalRefs.current[animal] = el }}
                onPointerDown={e => startDrag(e, animal)}
                onDoubleClick={() => {
                  const l = animalLevel(animal)
                  if (l) { const n = { ...connections }; delete n[l]; setConn(n) }
                }}
                className={[
                  'h-12 px-3 flex items-center rounded-xl border-2 font-bold text-sm',
                  'cursor-grab active:cursor-grabbing transition-all',
                  active
                    ? 'border-white/70 bg-white/20 text-white scale-105 shadow-lg shadow-white/10'
                    : c
                      ? `${c.bg} ${c.border} ${c.text}`
                      : 'bg-white/10 border-white/20 text-white',
                ].join(' ')}
              >
                <span className="truncate">{animal}</span>
                {lvl && !active && <span className="ml-auto text-xs opacity-40 shrink-0 pl-1">✓</span>}
              </div>
            )
          })}
        </div>

        {/* Levels */}
        <div className="flex flex-col gap-2.5 flex-1" style={{ position: 'relative', zIndex: 10 }}>
          {levels.map(level => {
            const c = LC[level]
            const placed   = connections[level]
            const isHover  = hoverLevel === level && !!dragging
            return (
              <div
                key={level}
                ref={el => { levelRefs.current[level] = el }}
                className={[
                  'h-12 px-3 flex flex-col justify-center rounded-xl border-2 transition-all',
                  c.bg, c.border,
                  isHover ? 'ring-2 ring-white/50 scale-[1.04]' : '',
                ].join(' ')}
              >
                <span className={`font-black text-xs ${c.text}`}>{level}</span>
                {placed && <span className="text-white/70 text-xs truncate mt-0.5">{placed}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-center text-white/30 text-xs mt-3">拖曳動物到保育等級・雙擊取消連線</p>
    </div>
  )
}
