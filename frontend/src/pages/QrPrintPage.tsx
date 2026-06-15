import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'
import { bossQrContent } from '../components/QrScanner'
import { api } from '../api'

interface BossInfo {
  id: number
  name: string
  emoji: string
  location_name: string
  location_hint: string
}

export default function QrPrintPage() {
  const [bosses, setBosses] = useState<BossInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.adminListBosses().then(data => {
      setBosses(data)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">載入中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Screen-only toolbar */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">魔王 QR 碼 — 列印版</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-700 transition-colors"
        >
          <Printer size={16} /> 列印
        </button>
      </div>

      {/* Print grid */}
      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-3 print:gap-6 print:p-4">
        {bosses.map(boss => (
          <div
            key={boss.id}
            className="bg-white rounded-2xl border-2 border-gray-200 p-6 flex flex-col items-center gap-4 shadow-sm print:rounded-xl print:shadow-none print:border-gray-300"
          >
            {/* Boss info */}
            <div className="text-center">
              <div className="text-5xl mb-2">{boss.emoji}</div>
              <h2 className="text-2xl font-black text-gray-900">{boss.name}</h2>
              <p className="text-gray-500 text-sm mt-1">{boss.location_name}</p>
            </div>

            {/* QR Code */}
            <div className="bg-white p-3 rounded-xl border border-gray-100">
              <QRCodeSVG
                value={bossQrContent(boss.id)}
                size={180}
                bgColor="#ffffff"
                fgColor="#1a1a1a"
                level="M"
              />
            </div>

            {/* QR content label for debugging */}
            <div className="text-center">
              <p className="text-xs font-mono text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                {bossQrContent(boss.id)}
              </p>
              {boss.location_hint && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-[200px]">
                  📍 {boss.location_hint}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
