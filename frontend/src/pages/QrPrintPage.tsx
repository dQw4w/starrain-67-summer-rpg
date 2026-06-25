import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer } from 'lucide-react'
import { bossQrContent } from '../components/QrScanner'
import { api } from '../api'

interface BossInfo {
  id: number
  name: string
  emoji: string
  location_name: string
  location_hint: string
}

interface TeamInfo {
  id: number
  name: string
  difficulty: string
  token: string
}

const teamUrl = (token: string) => `${window.location.origin}/team/${token}`

function DownloadableQr({ value, filename }: { value: string; filename: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const download = () => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const blobUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const px = 400
      const canvas = document.createElement('canvas')
      canvas.width = px
      canvas.height = px
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, px, px)
      ctx.drawImage(img, 0, 0, px, px)
      URL.revokeObjectURL(blobUrl)
      const a = document.createElement('a')
      a.download = filename + '.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = blobUrl
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="bg-white p-3 rounded-xl border border-gray-100">
        <QRCodeSVG value={value} size={160} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
      </div>
      <button
        onClick={download}
        className="print:hidden flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Download size={12} /> 下載 PNG
      </button>
    </div>
  )
}

const TEAM_COLORS: Record<number, { border: string; badge: string; text: string }> = {
  1: { border: 'border-blue-300',   badge: 'bg-blue-100 text-blue-700',   text: 'text-blue-700'   },
  2: { border: 'border-green-300',  badge: 'bg-green-100 text-green-700', text: 'text-green-700'  },
  3: { border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700',text: 'text-purple-700' },
}

export default function QrPrintPage() {
  const [bosses, setBosses] = useState<BossInfo[]>([])
  const [teams, setTeams]   = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.adminListBosses(), api.adminListTeams()]).then(([b, t]) => {
      setBosses(b)
      setTeams(t)
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
        <h1 className="text-lg font-bold text-gray-800">QR 碼列印</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-700 transition-colors"
        >
          <Printer size={16} /> 列印
        </button>
      </div>

      <div className="p-8 space-y-12 print:p-4 print:space-y-8">

        {/* ── Boss QR codes ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-black text-gray-700 mb-5 print:text-base print:mb-3">
            🗺️ 魔王 QR 碼 <span className="font-normal text-gray-400 text-sm ml-2">放置於各場地</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            {bosses.map(boss => (
              <div
                key={boss.id}
                className="bg-white rounded-2xl border-2 border-gray-200 p-6 flex flex-col items-center gap-4 shadow-sm print:rounded-xl print:shadow-none print:p-4"
              >
                <div className="text-center">
                  <div className="text-5xl mb-2">{boss.emoji}</div>
                  <h3 className="text-2xl font-black text-gray-900">{boss.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{boss.location_name}</p>
                </div>
                <DownloadableQr value={bossQrContent(boss.id)} filename={`boss-${boss.id}-${boss.name}`} />
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
        </section>

        {/* Page break before team section */}
        <div className="hidden print:block print:break-before-page" />

        {/* ── Team links ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-black text-gray-700 mb-5 print:text-base print:mb-3">
            👥 隊伍連結 <span className="font-normal text-gray-400 text-sm ml-2">發給各小隊掃描</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            {teams.map(team => {
              const url = teamUrl(team.token)
              const c   = TEAM_COLORS[team.id] ?? TEAM_COLORS[1]
              return (
                <div
                  key={team.id}
                  className={`bg-white rounded-2xl border-2 ${c.border} p-6 flex flex-col items-center gap-4 shadow-sm print:rounded-xl print:shadow-none print:p-4`}
                >
                  <div className="text-center">
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${c.badge}`}>
                      第 {team.id} 隊
                    </span>
                    <h3 className="text-2xl font-black text-gray-900">{team.name}</h3>
                  </div>

                  <DownloadableQr value={url} filename={`team-${team.id}-${team.name}`} />

                  <div className="text-center w-full">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-xs font-mono break-all hover:underline ${c.text} print:text-gray-500`}
                    >
                      {url}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

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
