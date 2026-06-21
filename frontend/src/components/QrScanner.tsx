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
  testMode: boolean
  onSuccess: () => void
  onClose: () => void
}

export default function QrScanner({ bossId, bossName, testMode, onSuccess, onClose }: Props) {

  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const scannerRef   = useRef<{ stop: () => Promise<void>; isScanning: boolean } | null>(null)
  const onSuccessRef = useRef(onSuccess)
  useLayoutEffect(() => { onSuccessRef.current = onSuccess })

  useEffect(() => {
    if (testMode) return  // skip camera in test mode

    let stopped = false
    let didStop = false

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
          () => {}
        )
        .catch(() => {
          setError('無法開啟相機\n請確認已授予相機權限')
        })
    })

    return () => {
      stopped = true
      if (scannerRef.current) safeStop(scannerRef.current)
    }
  }, [bossId, testMode])

  const handleTestScan = () => {
    setScanned(true)
    setTimeout(() => onSuccessRef.current(), 800)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-black/90 shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-brand-yellow" />
          <span className="text-white font-bold">掃描 {bossName} 的QR碼</span>
          {testMode && (
            <span className="text-xs bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
              測試模式
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white p-1">
          <X size={24} />
        </button>
      </div>

      {/* Body */}
      {testMode ? (
        /* Test mode: bypass button instead of camera */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-black px-8">
          <AnimatePresence mode="wait">
            {scanned ? (
              <motion.div
                key="ok"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="text-8xl"
              >
                ✅
              </motion.div>
            ) : (
              <motion.div key="btn" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-center gap-4">
                <p className="text-amber-300/70 text-sm text-center">測試模式已開啟，點擊按鈕模擬掃描成功</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleTestScan}
                  className="w-full max-w-xs py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-3"
                >
                  <Camera size={26} />
                  已掃描QRCode
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Normal mode: camera view */
        <div className="flex-1 relative overflow-hidden bg-black">
          <div id={SCANNER_ELEM_ID} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {!scanned && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0">
                <div className="absolute top-0 left-0 right-0 h-[calc(50%-120px)] bg-black/60" />
                <div className="absolute bottom-0 left-0 right-0 h-[calc(50%-120px)] bg-black/60" />
                <div className="absolute top-[calc(50%-120px)] bottom-[calc(50%-120px)] left-0 w-[calc(50%-120px)] bg-black/60" />
                <div className="absolute top-[calc(50%-120px)] bottom-[calc(50%-120px)] right-0 w-[calc(50%-120px)] bg-black/60" />
              </div>
              <div className="relative w-60 h-60">
                {(['top-0 left-0 border-t-4 border-l-4 rounded-tl-sm',
                  'top-0 right-0 border-t-4 border-r-4 rounded-tr-sm',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-sm',
                  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-sm'] as const)
                  .map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-brand-yellow ${cls}`} />
                  ))}
                <motion.div
                  className="absolute left-1 right-1 h-0.5 bg-brand-yellow/80 shadow-sm shadow-yellow-400"
                  initial={{ top: 0 }}
                  animate={{ top: '100%' }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear', repeatType: 'mirror' }}
                />
              </div>
            </div>
          )}

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
      )}

      {/* Bottom bar (normal mode only) */}
      {!testMode && (
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
      )}
    </div>
  )
}
