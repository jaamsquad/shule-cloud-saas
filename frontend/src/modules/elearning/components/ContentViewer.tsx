import React from 'react'
import type { Lesson } from '../types'

export default function ContentViewer({ lesson }: { lesson?: Lesson | null }) {
  if (!lesson) return <div className="p-4 bg-white border rounded">Select a lesson to preview content.</div>

  return (
    <div className="p-4 bg-white border rounded">
      <h3 className="font-semibold">{lesson.title}</h3>
      <p className="text-sm text-gray-600">{lesson.contentType} • {lesson.durationMinutes ?? '-'} min</p>
      <div className="mt-4 h-48 bg-gray-50 border-dashed border rounded flex items-center justify-center text-gray-400">Content preview placeholder</div>
      {lesson.summary && <p className="mt-3 text-sm">{lesson.summary}</p>}
    </div>
  )
}
