export default function ProblemsPanel() {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Problems</h2>
      <ul className="text-xs text-gray-700 list-disc pl-4">
        <li>Disconnected nodes</li>
        <li>Parallel/duplicate edges</li>
        <li>Dangling references</li>
      </ul>
    </div>
  )
}
