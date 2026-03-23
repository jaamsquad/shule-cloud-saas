import React from 'react'
import type { DiscussionThread } from '../types'

export default function DiscussionThreadList({ threads }: { threads: DiscussionThread[] }) {
  return (
    <div className="space-y-2">
      {threads.map(t => (
        <div key={t.id} className="p-3 border rounded bg-white">
          <div className="flex justify-between">
            <div>
              <h4 className="font-medium">{t.title}</h4>
              <p className="text-sm text-gray-600">By {t.author} • {t.replies} replies</p>
            </div>
            <div className="text-xs text-gray-500">{new Date(t.lastActivityAt).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
