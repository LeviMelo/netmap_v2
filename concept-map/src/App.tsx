import { Outlet, Link, useLocation } from 'react-router-dom'

export default function App() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
          <div className="font-semibold">Concept Map Studio</div>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className={pathname === '/' ? 'font-semibold' : ''}>Library</Link>
            <Link to="/editor" className={pathname.startsWith('/editor') ? 'font-semibold' : ''}>Editor</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl w-full p-4">
        <Outlet />
      </main>
    </div>
  )
}
