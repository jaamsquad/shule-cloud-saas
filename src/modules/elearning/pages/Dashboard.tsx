import React, { useEffect, useState } from 'react'
import { fetchCourses, fetchLiveSessions, fetchProgress } from '../services/elearningService'
import type { Course, LiveSession } from '../types'
import CourseCard from '../components/CourseCard'
import LiveSessionCard from '../components/LiveSessionCard'
import ProgressChartPlaceholder from '../components/ProgressChartPlaceholder'

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    fetchCourses().then(setCourses)
    fetchLiveSessions().then(setSessions)
    fetchProgress().then(ps => setProgress(Math.round((ps.reduce((s, p) => s + p.completedPercent, 0) / (ps.length || 1)))))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">E-learning Dashboard</h2>
        <p className="text-sm text-gray-600">Overview of courses, progress and upcoming sessions.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {courses.map(c => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2"><ProgressChartPlaceholder percent={progress} /></div>
        <div className="space-y-2">
          <h3 className="font-semibold">Upcoming Live Sessions</h3>
          {sessions.map(s => <LiveSessionCard key={s.id} session={s} />)}
        </div>
      </div>
    </div>
  )
}
