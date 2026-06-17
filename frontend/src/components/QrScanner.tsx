import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, AlertCircle } from 'lucide-react'

const SCANNER_ELEM_ID = 'hbduck-qr-video'

export function bossQrContent(bossId: number) {
  return `hbduck:boss:${bossId}`
}

interface Props {
  bossId: number
  bossName: string
  onSuccess: () => void
  onClose: () => void
}

export default function QrScanner({ bossId, bossName, onSuccess, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const scannerRef   = useRef<{ stop: () => Promise<void>; isScanning: boolean } | null>(null)
  const onSuccessRef = useRef(onSuccess)
  // Keep ref current without restarting the scanner effect
  useLayoutEffect(() => { onSuccessRef.current = onSuccess })

  useEffect(() => {
    let stopped = false      // true once we've matched or unmounted
    let didStop = false      // ensures scanner.stop() is only ever called once

    const safeStop = (s: { stop: () => Promise<void> }) => {
      if (didStop) return Promise.resolve()
      didStop = true
      try {
        return s.stop().catch(() => {})
      } catch {
        return Promise.resolve()
      }
    }

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return

      const scanner = new Html5Qrcode(SCANNER_ELEM_ID, { verbose: false } as never)
      scannerRef.current = scanner

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text: string) => {
            if (stopped) return
            if (text.trim() === bossQrContent(bossId)) {
              stopped = true
              setScanned(true)
              safeStop(scanner).finally(() => setTimeout(() => onSuccessRef.current(), 800))
            } else {
              setError('QR碼不符，請掃描正確的魔王QR碼！')
              setTimeout(() => setError(null), 2000)
            }
          },
          () => {} // per-frame decode errors are normal, ignore
        )
        .catch(() => {
          setError('無法開啟相機\n請確認已授予相機權限')
        })
    })

    return () => {
      stopped = true
      if (scannerRef.current) safeStop(scannerRef.current)
    }
  }, [bossId]) // intentionally omit onSuccess — kept current via ref above

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-black/90 shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-brand-yellow" />
          <span className="text-white font-bold">掃描 {bossName} 的QR碼</span>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white p-1">
          <X size={24} />
        </button>
      </div>

      {/* Camera area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* html5-qrcode renders video inside this div */}
        <div id={SCANNER_ELEM_ID} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

        {/* Overlay: dark edges + bright center frame */}
        {!scanned && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark vignette bars */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 right-0 h-[calc(50%-120px)] bg-black/60" />
              <div className="absolute bottom-0 left-0 right-0 h-[calc(50%-120px)] bg-black/60" />
              <div className="absolute top-[calc(50%-120px)] bottom-[calc(50%-120px)] left-0 w-[calc(50%-120px)] bg-black/60" />
              <div className="absolute top-[calc(50%-120px)] bottom-[calc(50%-120px)] right-0 w-[calc(50%-120px)] bg-black/60" />
            </div>

            {/* Corner brackets */}
            <div className="relative w-60 h-60">
              {(['top-0 left-0 border-t-4 border-l-4 rounded-tl-sm',
                'top-0 right-0 border-t-4 border-r-4 rounded-tr-sm',
                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-sm',
                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-sm'] as const)
                .map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 border-brand-yellow ${cls}`} />
                ))}

              {/* Scanning line */}
              <motion.div
                className="absolute left-1 right-1 h-0.5 bg-brand-yellow/80 shadow-sm shadow-yellow-400"
                initial={{ top: 0 }}
                animate={{ top: '100%' }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear', repeatType: 'mirror' }}
              />
            </div>
          </div>
        )}

        {/* Success overlay */}
        <AnimatePresence>
          {scanned && (
            <motion.div
              className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="text-8xl"
              >
                ✅
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="px-5 py-4 bg-black/90 text-center shrink-0 min-h-[60px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-red-400 font-bold"
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          ) : scanned ? (
            <motion.p key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 font-bold">
              掃描成功！
            </motion.p>
          ) : (
            <motion.p key="hint" className="text-white/40 text-sm">
              將工作人員的QR碼對準框框內
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
