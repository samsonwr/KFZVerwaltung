import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '&#9783;', exact: true },
  { to: '/vehicles', label: 'Fahrzeuge', icon: '&#128663;', exact: false },
  { to: '/km', label: 'KM melden', icon: '&#128207;', exact: false },
  { to: '/services/new', label: 'Service +', icon: '&#128295;', exact: false },
  { to: '/planning', label: 'Planung', icon: '&#128197;', exact: false },
]

function NavItem({ to, label, icon, exact }: { to: string; label: string; icon: string; exact: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-accent/20 text-amber-700 border border-accent/30'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`
      }
    >
      <span dangerouslySetInnerHTML={{ __html: icon }} className="text-lg w-5 text-center" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar – desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200 p-4 gap-1 fixed inset-y-0 left-0 shadow-sm">
        <div className="flex items-center gap-2 mb-6 px-2">
          <span className="text-2xl">&#128295;</span>
          <div>
            <p className="text-slate-900 font-bold text-sm leading-tight">KFZ Verwaltung</p>
            <p className="text-slate-400 text-xs">Werkstattverwaltung</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="text-slate-300 text-xs px-2 pb-2">v0.1.0</div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-200 z-30 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">&#128295;</span>
          <span className="text-slate-900 font-bold text-sm">KFZ Verwaltung</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-500 hover:text-slate-900 p-2"
          aria-label="Menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-20 p-4 transform transition-transform shadow-lg ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <div key={item.to} onClick={() => setMobileOpen(false)}>
              <NavItem {...item} />
            </div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
