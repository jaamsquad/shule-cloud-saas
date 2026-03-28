import React, { useEffect, useState } from 'react'
import { fetchCourses } from '../services/elearningService'
import type { Course } from '../types'
import CourseCard from '../components/CourseCard'

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  useEffect(() => { fetchCourses().then(setCourses) }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Courses & Subjects</h2>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {courses.map(c => <CourseCard key={c.id} course={c} />)}
      </div>
    </div>
  )
}
