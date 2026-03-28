import React, { useEffect, useState } from 'react'
import { fetchProgress } from '../services/elearningService'
import ProgressChartPlaceholder from '../components/ProgressChartPlaceholder'

export default function Progress() {
  const [percent, setPercent] = useState(0)
  useEffect(() => { fetchProgress().then(ps => setPercent(Math.round((ps.reduce((s, p) => s + p.completedPercent, 0) / (ps.length || 1))))) }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Learning Progress</h2>
      <div className="mt-4"><ProgressChartPlaceholder percent={percent} /></div>
    </div>
  )
}
