import React, { useEffect, useState } from 'react'
import { fetchThreads } from '../services/elearningService'
import DiscussionThreadList from '../components/DiscussionThreadList'
import type { DiscussionThread } from '../types'

export default function Discussions() {
  const [threads, setThreads] = useState<DiscussionThread[]>([])
  useEffect(() => { fetchThreads().then(setThreads) }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Discussion Forum</h2>
      <div className="mt-4"><DiscussionThreadList threads={threads} /></div>
    </div>
  )
}
