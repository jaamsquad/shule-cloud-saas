import React from 'react'
import type { Quiz } from '../types'

export default function QuizCard({ quiz }: { quiz: Quiz }) {
  return (
    <div className="p-3 border rounded bg-white">
      <h4 className="font-medium">{quiz.title}</h4>
      <p className="text-sm text-gray-600">Duration: {quiz.durationMinutes} min • Attempts: {quiz.attemptsAllowed ?? 'unlimited'}</p>
      <div className="mt-2 text-indigo-600 text-sm">Start Quiz</div>
    </div>
  )
}
