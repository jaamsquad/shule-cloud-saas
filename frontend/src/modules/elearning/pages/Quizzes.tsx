import React, { useEffect, useState } from 'react'
import { fetchQuizzes } from '../services/elearningService'
import QuizCard from '../components/QuizCard'
import type { Quiz } from '../types'

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  useEffect(() => { fetchQuizzes().then(setQuizzes) }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Quizzes / Tests</h2>
      <div className="mt-4 grid grid-cols-3 gap-4">{quizzes.map(q => <QuizCard key={q.id} quiz={q} />)}</div>
    </div>
  )
}
