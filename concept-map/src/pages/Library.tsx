const KEY_PREFIX = 'conceptmap:map:'

export default function Library() {
  const items = Object.keys(localStorage)
    .filter(k => k.startsWith(KEY_PREFIX))
    .map(k => k.slice(KEY_PREFIX.length))
    .sort()

  const open = (name: string) => {
    // Navigate to editor and request it to open this map
    location.href = '/editor#open=' + encodeURIComponent(name)
  }

  const del = (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    localStorage.removeItem(KEY_PREFIX + name)
    location.reload()
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Your maps</h1>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No saved maps.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(n => (
            <li key={n} className="flex items-center justify-between border rounded px-3 py-2 bg-white">
              <span className="font-medium">{n}</span>
              <div className="flex gap-2">
                <button onClick={() => open(n)} className="px-2 py-1 text-xs rounded border">Open</button>
                <button onClick={() => del(n)} className="px-2 py-1 text-xs rounded border">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
