'use client';
// components/layout/ClienteSidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Clock, Star, LogOut, Moon, Sun, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import Avatar from '@/components/ui/Avatar';

const NAV = [
  { href: '/cliente/dashboard',    label: 'Inicio',         icon: Home        },
  { href: '/cliente/pedidos',      label: 'Nuevo pedido',   icon: ShoppingBag },
  { href: '/cliente/historial',    label: 'Historial',      icon: Clock       },
  { href: '/cliente/fidelizacion', label: 'Puntos',         icon: Star        },
];

export default function ClienteSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div style={{ backgroundColor: 'var(--bg-sidebar)', width: 240, minHeight: '100%', display: 'flex', flexDirection: 'column' }} className="text-white">

      {/* Avatar usuario */}
      <Link href="/cliente/perfil"
        style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 10px 0', padding: '10px 12px', borderRadius: 12, textDecoration: 'none', backgroundColor: pathname === '/cliente/perfil' ? 'rgba(255,255,255,0.12)' : 'transparent', transition: 'background 0.15s' }}
        className={cn(pathname !== '/cliente/perfil' && 'hover:bg-white/10')}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
            <Avatar src={user?.fotoPerfil} nombre={user?.nombre ?? '?'} apellido={user?.apellido ?? ''} size={36} gradient="linear-gradient(135deg,#0ea5e9,#6366f1)" />
          </div>
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, backgroundColor: '#22c55e', borderRadius: '50%', border: '2px solid var(--bg-sidebar)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nombre} {user?.apellido}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Mi cuenta</p>
        </div>
        <Settings style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
      </Link>

      <div style={{ margin: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />

      <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', fontWeight: active ? 600 : 400, fontSize: 14, backgroundColor: active ? '#0ea5e9' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'all 0.15s', boxShadow: active ? '0 4px 12px rgba(14,165,233,0.3)' : 'none' }}
              className={cn(!active && 'hover:bg-white/10 hover:!text-white')}>
              <item.icon style={{ width: 16, height: 16, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
              {item.label}
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
          <span style={{ width: 32, height: 17, borderRadius: 999, backgroundColor: isDark ? '#0ea5e9' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', padding: '0 2px', flexShrink: 0 }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.2s', transform: isDark ? 'translateX(15px)' : 'translateX(0)' }} />
          </span>
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
