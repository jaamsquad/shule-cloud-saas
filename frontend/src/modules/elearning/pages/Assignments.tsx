import React, { useEffect, useState } from 'react'
import { fetchAssignments } from '../services/elearningService'
import AssignmentTable from '../components/AssignmentTable'
import type { Assignment } from '../types'

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  useEffect(() => { fetchAssignments().then(setAssignments) }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Assignments</h2>
      <div className="mt-4"><AssignmentTable assignments={assignments} /></div>
    </div>
  )
}
