'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Calculator, Package, Settings, UtensilsCrossed, LogOut, ChefHat } from 'lucide-react';

interface RestaurantConfig {
  name: string;
  slogan?: string;
  logoUrl?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [config, setConfig] = useState<RestaurantConfig>({ name: 'Xpos' });

  // Load config from backend (or from localStorage cache)
  useEffect(() => {
    const cached = localStorage.getItem('pos_restaurant_config');
    if (cached) {
      try { setConfig(JSON.parse(cached)); } catch { /* ignore */ }
    }

    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const res = await fetch('http://localhost:3000/api/v1/restaurant-config', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data: RestaurantConfig = await res.json();
          setConfig(data);
          localStorage.setItem('pos_restaurant_config', JSON.stringify(data));
        }
      } catch { /* ignore network errors */ }
    };

    fetchConfig();

    // Listen for updates dispatched by settings page
    const onStorage = () => {
      const updated = localStorage.getItem('pos_restaurant_config');
      if (updated) {
        try { setConfig(JSON.parse(updated)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (pathname === '/login' || pathname === '/register') return null;

  const menuItems = [
    { name: 'Plano de Sala', icon: LayoutDashboard, path: '/' },
    { name: 'Monitor Cocina', icon: ChefHat, path: '/cocina' },
    { name: 'Cierre de Caja', icon: Calculator, path: '/report' },
    { name: 'Inventario', icon: Package, path: '/inventory' },
    { name: 'Categorías', icon: LayoutDashboard, path: '/inventory/categories' },
    { name: 'Áreas de Prep.', icon: ChefHat, path: '/inventory/stations' },
    { name: 'Configuración', icon: Settings, path: '/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_restaurant_config');
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 print:hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        {/* Logo or fallback icon */}
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center overflow-hidden shrink-0">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight truncate">{config.name || 'Xpos'}</h2>
          {config.slogan && (
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{config.slogan}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all active:scale-95 ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 border border-transparent transition-all active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>

      <div className="pb-6 pt-2 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Xpos Cloud v1.0
        </p>
      </div>
    </aside>
  );
}