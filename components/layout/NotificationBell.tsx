'use client';
// components/layout/NotificationBell.tsx
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellOff, CheckCheck, Trash2, ShoppingBag, Package, Info, AlertTriangle } from 'lucide-react';
import { useNotifications, type NotifItem } from '@/hooks/useNotifications';

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return 'Ahora mismo';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

function NotifIcon({ tipo }: { tipo: NotifItem['tipo'] }) {
  const s = { width: 14, height: 14 };
  if (tipo === 'pedido_nuevo')     return <ShoppingBag style={{ ...s, color: '#3b82f6' }} />;
  if (tipo === 'pedido_entregado') return <Package style={{ ...s, color: '#22c55e' }} />;
  return <Info style={{ ...s, color: '#f59e0b' }} />;
}

function NotifColor(tipo: NotifItem['tipo']) {
  if (tipo === 'pedido_nuevo')     return 'rgba(59,130,246,0.12)';
  if (tipo === 'pedido_entregado') return 'rgba(34,197,94,0.12)';
  return 'rgba(245,158,11,0.12)';
}

export default function NotificationBell({ cuentaHref = '/admin/cuenta' }: { cuentaHref?: string }) {
  const { notificaciones, noLeidas, permiso, marcarLeida, marcarTodasLeidas, limpiarTodas, solicitarPermiso } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Botón campana */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          width: 36, height: 36,
          borderRadius: 10,
          border: 'none',
          backgroundColor: open ? 'rgba(255,255,255,0.15)' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
          transition: 'background 0.15s',
        }}
        title="Notificaciones"
      >
        <Bell style={{ width: 18, height: 18 }} />
        {/* Badge */}
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: noLeidas > 9 ? 18 : 14, height: 14,
            borderRadius: 999,
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
            border: '2px solid var(--bg-sidebar)',
          }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%', left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 8,
          width: 340,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          zIndex: 999,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Notificaciones</p>
              {noLeidas > 0 && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{noLeidas} sin leer</p>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas} title="Marcar todas como leídas"
                  style={{ padding: '4px 8px', borderRadius: 8, border: 'none', backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCheck style={{ width: 12, height: 12 }} /> Leer todas
                </button>
              )}
              {notificaciones.length > 0 && (
                <button onClick={limpiarTodas} title="Limpiar todas"
                  style={{ padding: '4px 6px', borderRadius: 8, border: 'none', backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>

          {/* Aviso de permiso */}
          {permiso !== 'granted' && permiso !== 'unsupported' && (
            <div
              style={{ padding: '10px 16px', backgroundColor: 'rgba(245,158,11,0.08)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={async () => { await solicitarPermiso(); }}
            >
              <AlertTriangle style={{ width: 14, height: 14, color: '#f59e0b', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#d97706', margin: 0, flex: 1 }}>
                {permiso === 'denied'
                  ? 'Las notificaciones del navegador están bloqueadas. Habilítalas desde la configuración del navegador.'
                  : 'Activa las notificaciones del navegador para recibir alertas.'}
              </p>
              {permiso === 'default' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap' }}>Activar</span>
              )}
            </div>
          )}

          {/* Lista */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notificaciones.length === 0 ? (
              <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <BellOff style={{ width: 28, height: 28, color: 'var(--text-hint)' }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Sin notificaciones</p>
                <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: 0, textAlign: 'center' }}>
                  Aquí aparecerán las alertas de pedidos nuevos y entregas
                </p>
              </div>
            ) : (
              notificaciones.map(n => {
                const inner = (
                  <div
                    onClick={() => marcarLeida(n.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      cursor: 'pointer',
                      backgroundColor: n.leida ? 'transparent' : NotifColor(n.tipo),
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Icono */}
                    <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: NotifColor(n.tipo), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <NotifIcon tipo={n.tipo} />
                    </div>
                    {/* Contenido */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: n.leida ? 400 : 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titulo}</p>
                        {!n.leida && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0', lineHeight: 1.4 }}>{n.mensaje}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '4px 0 0' }}>{timeAgo(n.timestamp)}</p>
                    </div>
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>

          {/* Footer — button en lugar de Link para evitar <a> anidado dentro del <a> del sidebar */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              onClick={() => { setOpen(false); router.push(`${cuentaHref}#notificaciones`); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontWeight: 500, padding: 0 }}
            >
              Configurar notificaciones →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
