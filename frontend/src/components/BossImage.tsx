import { useState } from 'react'

interface Props {
  bossId: number
  emoji: string
  className?: string
}

export default function BossImage({ bossId, emoji, className = '' }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className={`flex items-center justify-center ${className}`}>{emoji}</span>
  }

  return (
    <img
      src={`/boss-${bossId}.png`}
      alt=""
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
