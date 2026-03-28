import React from 'react'
import type { Submission } from '../types'

export default function SubmissionTable({ submissions }: { submissions: Submission[] }) {
  return (
    <div className="bg-white border rounded">
      <table className="w-full table-auto">
        <thead>
          <tr className="text-left">
            <th className="p-2">Student</th>
            <th className="p-2">Submitted At</th>
            <th className="p-2">Status</th>
            <th className="p-2">Marks</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{s.studentName}</td>
              <td className="p-2">{s.submittedAt ?? '-'}</td>
              <td className="p-2">{s.status}</td>
              <td className="p-2">{s.marks ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
