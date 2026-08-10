import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, FolderKanban, Package, Settings, Fence, Zap, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/quick-takeoff', label: 'Quantitatif rapide', icon: Zap },
  { to: '/bid-pipeline', label: 'Pipeline', icon: FolderKanban },
  { to: '/bid-calendar', label: 'Calendrier des soumissions', icon: CalendarDays },
  { to: '/projects', label: 'Projets', icon: FolderKanban },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/settings', label: 'Paramètres', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  return (
    <div className="flex h-screen bg-slate-50">
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Fence className="w-4 h-4 text-slate-900" />
          </div>
          <span className="text-white font-semibold text-sm">BarrioPro</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-300 p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-slate-900/50 z-20" onClick={() => setMobileOpen(false)} />}
      <aside className={`w-60 bg-slate-900 text-slate-300 flex-col flex-shrink-0 fixed inset-y-0 left-0 z-30 transition-transform md:static md:translate-x-0 md:flex ${mobileOpen ? 'translate-x-0 flex' : '-translate-x-full'}`}>
        <div className="px-6 py-5 flex items-center gap-2.5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
            <Fence className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <div className="text-white font-semibold text-base leading-tight">BarrioPro</div>
            <div className="text-[11px] text-slate-500 leading-tight">Estimation de clôtures</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 text-[11px] text-slate-600">
          BarrioPro MVP · v1.0
        </div>
      </aside>
      <main className="flex-1 overflow-auto pt-12 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}