'use client';
// components/layout/EmpleadoSidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, LogOut, Moon, Sun, Package, UserCheck, PlusCircle, User, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import Avatar from '@/components/ui/Avatar';
import NotificationBell from './NotificationBell';

const NAV = [
  { href: '/empleado/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/empleado/nuevo-pedido', label: 'Nuevo pedido',    icon: PlusCircle,     highlight: true },
  { href: '/empleado/pedidos',      label: 'Pedidos activos', icon: ShoppingBag     },
  { href: '/empleado/clientes',     label: 'Clientes',         icon: UserCheck       },
  { href: '/empleado/membresias',   label: 'Membresías',      icon: Crown           },
  { href: '/empleado/catalogo',     label: 'Catálogo',        icon: Package         },
  { href: '/empleado/cuenta',       label: 'Mi cuenta',       icon: User            },
];

export default function EmpleadoSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div style={{ backgroundColor: 'var(--bg-sidebar)', width: 240, minHeight: '100%', display: 'flex', flexDirection: 'column' }} className="text-white">

      {/* Perfil + campana */}
      <div style={{ margin: '12px 10px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Link href="/empleado/cuenta"
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, textDecoration: 'none', backgroundColor: pathname.startsWith('/empleado/cuenta') ? 'rgba(255,255,255,0.12)' : 'transparent', transition: 'background 0.15s', minWidth: 0 }}
          className={cn(!pathname.startsWith('/empleado/cuenta') && 'hover:bg-white/10')}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
              <Avatar
                src={user?.fotoPerfil}
                nombre={user?.nombre ?? '?'}
                apellido={user?.apellido ?? ''}
                size={36}
                gradient="linear-gradient(135deg,#7c3aed,#a855f7)"
              />
            </div>
            <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, backgroundColor: '#22c55e', borderRadius: '50%', border: '2px solid var(--bg-sidebar)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nombre} {user?.apellido}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Empleado</p>
          </div>
        </Link>
        {/* Campana de notificaciones */}
        <div style={{ flexShrink: 0, paddingRight: 4 }}>
          <NotificationBell cuentaHref="/empleado/cuenta" />
        </div>
      </div>

      <div style={{ margin: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />

      <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = pathname.startsWith(item.href);
          const isHighlight = 'highlight' in item && item.highlight;
          return (
            <Link key={item.href} href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                fontWeight: active ? 600 : 400, fontSize: 14,
                backgroundColor: active ? '#7c3aed' : isHighlight ? 'rgba(20,184,166,0.18)' : 'transparent',
                color: active ? '#fff' : isHighlight ? '#2dd4bf' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.15s',
                boxShadow: active ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
                border: isHighlight && !active ? '1px solid rgba(45,212,191,0.3)' : '1px solid transparent',
              }}
              className={cn(!active && !isHighlight && 'hover:bg-white/10 hover:!text-white')}
            >
              <item.icon style={{ width: 16, height: 16, flexShrink: 0, opacity: active ? 1 : 0.85 }} />
              {item.label}
              {isHighlight && !active && (
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.15)', padding: '1px 6px', borderRadius: 999, letterSpacing: '0.04em' }}>
                  NUEVO
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '10px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 14, width: '100%' }}
          className="hover:bg-white/10 hover:!text-white">
          {isDark ? <Sun style={{ width: 16, height: 16, color: '#fbbf24' }} /> : <Moon style={{ width: 16, height: 16, opacity: 0.6 }} />}
          <span style={{ flex: 1, textAlign: 'left' }}>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button onClick={() => logout()}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 14, width: '100%' }}
          className="hover:bg-red-500/20 hover:!text-red-400">
          <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
