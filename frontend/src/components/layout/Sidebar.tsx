// components/layout/Sidebar.tsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Users, Menu, X, Cpu, ShieldCheck } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', badge: undefined },
  { to: '/campaign',  icon: Megaphone,       label: 'Campaign Studio', badge: 'Active' },
  { to: '/customers', icon: Users,           label: 'Customer Explorer', badge: '5,000' },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 w-full flex-shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0054A6] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[#FFD600] font-black text-sm">U</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 font-bold text-sm tracking-tight">Upay</span>
              <span className="text-[10px] font-mono text-slate-800 bg-[#FFD600]/30 border border-[#FFD600]/60 px-1 rounded font-semibold">
                AI
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-tight">Campaign Intelligence</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="text-slate-600 hover:text-slate-900 cursor-pointer p-1.5 rounded-lg bg-slate-50 border border-slate-200 transition-colors"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown nav */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-3 py-3 w-full flex-shrink-0 space-y-1.5 z-20 shadow-md">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50/80 text-[#0054A6] border-l-2 border-[#0054A6]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-white border-r border-slate-200 flex-col justify-between h-full z-20">
        <div>
          {/* Logo Brand Header */}
          <div className="px-5 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-[#0054A6] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-[#FFD600] font-black text-base">U</span>
                </div>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FFD600] border-2 border-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-900 font-extrabold text-base tracking-tight">Upay</span>
                  <span className="text-[9px] font-bold font-mono text-slate-800 bg-[#FFD600]/30 border border-[#FFD600]/60 px-1 py-0.2 rounded uppercase">
                    Causal AI
                  </span>
                </div>
                <p className="text-slate-500 text-xs">Campaign Intelligence</p>
              </div>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="px-3 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Operations Console
            </p>
            <nav className="space-y-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-blue-50/90 text-[#0054A6] border-l-2 border-[#0054A6] font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-slate-400 group-hover:text-[#0054A6] transition-colors" />
                    <span>{label}</span>
                  </div>
                  {badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:text-slate-900 border border-slate-200">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* System Health / Engine Status Card */}
        <div className="p-3.5 m-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
              <Cpu size={13} className="text-[#0054A6]" />
              <span>S-Learner ML</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>

          <div className="text-[11px] text-slate-600 space-y-1 pt-1.5 border-t border-slate-200/70">
            <div className="flex justify-between">
              <span>Profiles:</span>
              <span className="font-mono text-slate-900 font-semibold">5,000</span>
            </div>
            <div className="flex justify-between">
              <span>Fatigue Rules:</span>
              <span className="font-mono text-emerald-700 font-semibold flex items-center gap-0.5">
                <ShieldCheck size={11} /> Enforced
              </span>
            </div>
            <div className="flex justify-between">
              <span>Inference:</span>
              <span className="font-mono text-slate-900 font-semibold">28ms</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
