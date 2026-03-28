import React from 'react'

export default function ProgressChartPlaceholder({ percent = 0 }: { percent?: number }) {
  return (
    <div className="p-4 bg-white border rounded text-center">
      <div className="text-2xl font-semibold">{percent}%</div>
      <div className="mt-2 text-sm text-gray-600">Overall progress (placeholder chart)</div>
      <div className="mt-3 h-24 flex items-center justify-center text-gray-400 border rounded">Chart placeholder</div>
    </div>
  )
}
