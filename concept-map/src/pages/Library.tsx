import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMaps } from '../modules/storage/local'

export default function Library() {
  const [maps, setMaps] = useState<{id:string; name:string; updatedAt:number}[]>([])

  useEffect(() => {
    setMaps(listMaps())
  }, [])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your maps</h1>
        <Link to="/editor" className="px-3 py-1.5 rounded bg-brand-500 text-white">New map</Link>
      </div>
      {maps.length === 0 ? (
        <p className="text-sm text-gray-600">No maps yet. Create one in the editor.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {maps.map(m => (
            <li key={m.id} className="rounded border bg-white p-3">
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-gray-500">Updated {new Date(m.updatedAt).toLocaleString()}</div>
              <div className="mt-2">
                <Link to={`/editor?id=${encodeURIComponent(m.id)}`} className="text-sm text-brand-500">Open</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
