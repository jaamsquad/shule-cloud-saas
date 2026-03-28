import React from 'react'
import { Link } from 'react-router-dom'
import type { Course } from '../types'

export default function CourseCard({ course }: { course: Course }) {
  return (
    <Link to={`/lms/courses`} className="block transform transition-transform hover:scale-105 active:scale-95">
      <div className="p-4 border rounded-lg shadow-sm bg-white h-full cursor-pointer hover:border-primary">
        <h3 className="text-lg font-semibold">{course.title}</h3>
        <p className="text-sm text-muted-foreground">{course.subject} • {course.className}</p>
        <p className="mt-2 text-sm">Teacher: {course.teacher}</p>
        <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
          <div className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${course.progress ?? 0}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-600">Progress: {course.progress ?? 0}%</p>
      </div>
    </Link>
  )
}
