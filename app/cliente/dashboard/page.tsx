'use client';
// app/cliente/dashboard/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Clock, Star, Plus, ChevronRight, MapPin, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

const S = {
  card: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14 },
};

export default function ClienteDashboard() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [puntos, setPuntos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('lavaya_access_token');
        const headers = { Authorization: `Bearer ${token}` };
        const base = process.env.NEXT_PUBLIC_API_URL;

        const [pRes, ptRes] = await Promise.all([
          fetch(`${base}/clientes/pedidos?limit=3`, { headers }),
          fetch(`${base}/clientes/puntos`, { headers }),
        ]);
        if (pRes.ok) { const d = await pRes.json(); setPedidos(d.pedidos ?? []); }
        if (ptRes.ok) { const d = await ptRes.json(); setPuntos(d.saldo ?? 0); }
      } catch { toast.error('Error cargando datos'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const ESTADO_COLOR: Record<string, string> = {
    PENDIENTE: '#f59e0b', CONFIRMADO: '#3b82f6', RECOLECTADO: '#6366f1',
    EN_PROCESO: '#8b5cf6', LISTO: '#14b8a6', EN_CAMINO: '#f97316',
    ENTREGADO: '#22c55e', CANCELADO: '#ef4444',
  };
  const ESTADO_LABEL: Record<string, string> = {
    PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', RECOLECTADO: 'Recolectado',
    EN_PROCESO: 'En lavado', LISTO: 'Listo', EN_CAMINO: 'En camino',
    ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
  };

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title={`Hola, ${user?.nombre} 👋`} subtitle="¿Qué necesitas lavar hoy?" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* CTA nuevo pedido */}
        <Link href="/cliente/pedidos"
          style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', borderRadius: 16, textDecoration: 'none', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
          <div style={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Nuevo pedido</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '2px 0 0' }}>Recogemos y entregamos tu ropa limpia</p>
          </div>
          <ChevronRight style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.7)' }} />
        </Link>

        {/* Stats rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'Pedidos', value: pedidos.length, icon: ShoppingBag, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
            { label: 'En proceso', value: pedidos.filter((p: any) => !['ENTREGADO','CANCELADO'].includes(p.estado)).length, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Mis puntos', value: puntos, icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          ].map(stat => (
            <div key={stat.label} style={{ ...S.card, padding: 14, textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <stat.icon style={{ width: 18, height: 18, color: stat.color }} />
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pedidos recientes */}
        <div style={S.card}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Pedidos recientes</p>
            <Link href="/cliente/historial" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Ver todos →</Link>
          </div>
          {pedidos.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Package style={{ width: 36, height: 36, margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Aún no tienes pedidos</p>
              <p style={{ fontSize: 12, color: 'var(--text-hint)', margin: '4px 0 0' }}>Crea tu primer pedido y nosotros nos encargamos del resto</p>
            </div>
          ) : pedidos.map((p: any) => (
            <Link key={p.id} href={`/cliente/historial/${p.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)', textDecoration: 'none', transition: 'background 0.15s' }}
              className="hover:bg-[var(--bg-card-hover)]">
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${ESTADO_COLOR[p.estado]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShoppingBag style={{ width: 16, height: 16, color: ESTADO_COLOR[p.estado] }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{p.totalPrendas} prendas</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ESTADO_COLOR[p.estado], backgroundColor: `${ESTADO_COLOR[p.estado]}20`, padding: '1px 8px', borderRadius: 999 }}>
                    {ESTADO_LABEL[p.estado] ?? p.estado}
                  </span>
                </div>
              </div>
              <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-hint)' }} />
            </Link>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { href: '/cliente/historial',    label: 'Mis pedidos',  icon: Clock, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', desc: 'Historial completo' },
            { href: '/cliente/fidelizacion', label: 'Mis puntos',   icon: Star,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: `${puntos} puntos acumulados` },
          ].map(item => (
            <Link key={item.href} href={item.href}
              style={{ ...S.card, padding: 16, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, transition: 'box-shadow 0.15s' }}
              className="hover:shadow-md">
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon style={{ width: 20, height: 20, color: item.color }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
