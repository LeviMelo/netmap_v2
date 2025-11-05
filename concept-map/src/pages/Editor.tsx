import Canvas from '../components/editor/Canvas'
import StylePanel from '../components/editor/StylePanel'
import ProblemsPanel from '../components/editor/ProblemsPanel'
import Toolbar from '../components/editor/Toolbar'

export default function Editor() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_var(--editor-sidebar-w)] gap-4 h-[calc(100vh-5rem)]">
      <div className="rounded border bg-white h-full flex flex-col">
        <div className="border-b px-3 py-2"><Toolbar /></div>
        <div className="flex-1"><Canvas /></div>
      </div>
      <div className="flex flex-col gap-4 h-full">
        <div className="rounded border bg-white p-3">
          <StylePanel />
        </div>
        <div className="rounded border bg-white p-3 min-h-0 overflow-auto">
          <ProblemsPanel />
        </div>
      </div>
    </div>
  )
}
