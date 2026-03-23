import React from 'react'
import type { Assignment } from '../types'

export default function AssignmentTable({ assignments }: { assignments: Assignment[] }) {
  return (
    <div className="bg-white border rounded">
      <table className="w-full table-auto">
        <thead>
          <tr className="text-left">
            <th className="p-2">Title</th>
            <th className="p-2">Due Date</th>
            <th className="p-2">Marks</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map(a => (
            <tr key={a.id} className="border-t">
              <td className="p-2">{a.title}</td>
              <td className="p-2">{a.dueDate}</td>
              <td className="p-2">{a.totalMarks ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
