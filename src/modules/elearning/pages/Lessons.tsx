import React, { useEffect, useState } from 'react'
import { fetchLessons } from '../services/elearningService'
import type { Lesson } from '../types'
import LessonList from '../components/LessonList'
import ContentViewer from '../components/ContentViewer'

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selected, setSelected] = useState<Lesson | null>(null)

  useEffect(() => { fetchLessons().then(setLessons) }, [])

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1">
        <h2 className="text-xl font-semibold">Lessons / Content Library</h2>
        <div className="mt-3"><LessonList lessons={lessons} /></div>
      </div>
      <div className="col-span-2">
        <h3 className="text-lg font-semibold">Content Preview</h3>
        <div className="mt-3"><ContentViewer lesson={selected ?? lessons[0] ?? null} /></div>
      </div>
    </div>
  )
}
