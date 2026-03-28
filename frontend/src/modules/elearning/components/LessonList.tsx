import React from 'react'
import type { Lesson } from '../types'

export default function LessonList({ lessons }: { lessons: Lesson[] }) {
  return (
    <div className="space-y-2">
      {lessons.map(l => (
        <div key={l.id} className="p-3 border rounded hover:shadow-sm bg-white">
          <div className="flex justify-between">
            <div>
              <h4 className="font-medium">{l.title}</h4>
              <p className="text-sm text-gray-600">{l.contentType} • {l.durationMinutes ?? '-'} min</p>
            </div>
            <div className="text-sm text-indigo-600">Open</div>
          </div>
          {l.summary && <p className="mt-2 text-sm text-gray-700">{l.summary}</p>}
        </div>
      ))}
    </div>
  )
}
