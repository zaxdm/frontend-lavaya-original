'use client';
// components/layout/Sidebar.tsx — Admin + variante Empleado
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Users, Building2,
  Package, ChevronRight, LogOut, Moon, Sun, Settings, UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import Avatar from '@/components/ui/Avatar';
import NotificationBell from './NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Pedidos',        href: '/admin/pedidos',   icon: ShoppingBag },
  { label: 'Usuarios',       href: '/admin/usuarios',  icon: Users,      adminOnly: true },
  { label: 'Empresas B2B',   href: '/admin/b2b',       icon: Building2,  adminOnly: true },
  { label: 'Catálogo',       href: '/admin/catalogo',  icon: Package,    adminOnly: true },
  { label: 'Configuración',  href: '/admin/settings',  icon: Settings,   adminOnly: true },
];

const EMPLEADO_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/empleado/dashboard', icon: LayoutDashboard },
  { label: 'Pedidos',   href: '/empleado/pedidos',   icon: ShoppingBag },
];

export default function Sidebar({ variant = 'admin' }: { variant?: 'admin' | 'empleado' }) {
  const pathname   = usePathname();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const items      = variant === 'empleado' ? EMPLEADO_NAV : NAV_ITEMS;
  const cuentaHref = variant === 'empleado' ? '/empleado/cuenta' : '/admin/cuenta';

  const ROL_LABEL: Record<string, string> = {
    ADMIN: 'Administrador', EMPLEADO: 'Empleado', REPARTIDOR: 'Repartidor', CLIENTE: 'Cliente',
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg-sidebar)', width: 256, minHeight: '100%', display: 'flex', flexDirection: 'column' }}
      className="text-white"
    >
      {/* ─── Perfil + campana ─────────────────────────────────── */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2">
          <Link
            href={cuentaHref}
            className={cn(
              'group flex flex-1 items-center gap-3 p-3 rounded-xl transition-all duration-200 min-w-0',
              pathname.startsWith(cuentaHref)
                ? 'bg-white/15 ring-1 ring-white/20'
                : 'hover:bg-white/10',
            )}
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/20 group-hover:ring-blue-400/60 transition-all">
                <Avatar
                  src={user?.fotoPerfil}
                  nombre={user?.nombre ?? '?'}
                  apellido={user?.apellido ?? ''}
                  size={36}
                  gradient="linear-gradient(135deg,#3b82f6,#6366f1)"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full ring-2 ring-[var(--bg-sidebar)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.nombre} {user?.apellido}
              </p>
              <p className="text-xs text-white/45 truncate mt-0.5">
                {ROL_LABEL[user?.rol ?? ''] ?? user?.rol}
              </p>
            </div>
          </Link>
          <div className="flex-shrink-0 pr-1">
            <NotificationBell />
          </div>
        </div>
      </div>

      <div className="PE-5 my-3 border-t border-white/10" />

      {/* ─── Navegación ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 space-y-0.5">
        {items
          .filter(item => !item.adminOnly || user?.rol === 'ADMIN')
          .map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                )}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-white' : 'text-white/50')} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </Link>
            );
          })}
      </nav>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 space-y-0.5 border-t border-white/10 mt-3">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          {isDark
            ? <Sun className="w-4 h-4 flex-shrink-0 text-yellow-400" />
            : <Moon className="w-4 h-4 flex-shrink-0 text-white/50" />}
          <span className="flex-1">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
          <span
            className="flex-shrink-0 w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-200"
            style={{ backgroundColor: isDark ? '#3b82f6' : 'rgba(255,255,255,0.15)' }}
          >
            <span
              className="w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: isDark ? 'translateX(16px)' : 'translateX(0px)' }}
            />
          </span>
        </button>

        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
