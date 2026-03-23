import React from 'react'

export default function Settings() {
  return (
    <div>
      <h2 className="text-2xl font-semibold">E-learning Settings</h2>
      <div className="mt-4 bg-white border rounded p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Default Quiz Duration (minutes)</label>
            <input className="mt-1 px-3 py-2 border rounded w-64" defaultValue={15} />
          </div>
          <div>
            <label className="block text-sm font-medium">Allow student discussion</label>
            <select className="mt-1 px-3 py-2 border rounded">
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </div>
          <div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded">Save settings</button>
          </div>
        </div>
      </div>
    </div>
  )
}
