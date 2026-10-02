// components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Megaphone, Users, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/campaign',  icon: Megaphone,       label: 'Campaign Studio' },
  { to: '/customers', icon: Users,           label: 'Customer Explorer' },
];

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-upay-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">U</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Upay</p>
            <p className="text-slate-500 text-xs leading-tight">Campaign Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Prototype v0.1</p>
          <span className="text-xs text-emerald-500 font-medium">● Live</span>
        </div>
      </div>
    </aside>
  );
}
