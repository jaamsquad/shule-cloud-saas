import React from 'react'
import type { LiveSession } from '../types'

export default function LiveSessionCard({ session }: { session: LiveSession }) {
  return (
    <div className="p-3 border rounded bg-white">
      <h4 className="font-medium">{session.title}</h4>
      <p className="text-sm text-gray-600">Teacher: {session.teacher}</p>
      <p className="text-sm text-gray-600">Date: {new Date(session.sessionDate).toLocaleString()}</p>
      <a className="mt-2 inline-block text-indigo-600 text-sm" href={session.meetingLink} target="_blank" rel="noreferrer">Join (placeholder)</a>
    </div>
  )
}
