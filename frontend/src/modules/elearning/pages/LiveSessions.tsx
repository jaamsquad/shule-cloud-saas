import React, { useEffect, useState } from 'react'
import { fetchLiveSessions } from '../services/elearningService'
import LiveSessionCard from '../components/LiveSessionCard'
import type { LiveSession } from '../types'

export default function LiveSessions() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  useEffect(() => { fetchLiveSessions().then(setSessions) }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Live Classes / Sessions</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">{sessions.map(s => <LiveSessionCard key={s.id} session={s} />)}</div>
    </div>
  )
}
