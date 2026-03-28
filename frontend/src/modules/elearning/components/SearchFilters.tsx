import React from 'react'

export default function SearchFilters({ onSearch }: { onSearch?: (q: string) => void }) {
  return (
    <div className="flex gap-2">
      <input onChange={(e) => onSearch?.(e.target.value)} placeholder="Search..." className="px-3 py-2 border rounded w-full" />
      <select className="px-3 py-2 border rounded">
        <option>All</option>
        <option>Videos</option>
        <option>Documents</option>
      </select>
    </div>
  )
}
