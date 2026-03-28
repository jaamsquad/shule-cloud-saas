import React, { useEffect, useState } from 'react'
import { fetchSubmissions } from '../services/elearningService'
import SubmissionTable from '../components/SubmissionTable'
import type { Submission } from '../types'

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  useEffect(() => { fetchSubmissions().then(setSubmissions) }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Assignment Submissions</h2>
      <div className="mt-4"><SubmissionTable submissions={submissions} /></div>
    </div>
  )
}
