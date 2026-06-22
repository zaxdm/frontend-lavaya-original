'use client';
// app/cliente/historial/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight, Clock } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:'#f59e0b',CONFIRMADO:'#3b82f6',RECOLECTADO:'#6366f1',EN_PROCESO:'#8b5cf6',LISTO:'#14b8a6',EN_CAMINO:'#f97316',ENTREGADO:'#22c55e',CANCELADO:'#ef4444',
};
const ESTADO_LABEL: Record<string,string> = {
  PENDIENTE:'Pendiente',CONFIRMADO:'Confirmado',RECOLECTADO:'Recolectado',EN_PROCESO:'En lavado',LISTO:'Listo',EN_CAMINO:'En camino',ENTREGADO:'Entregado',CANCELADO:'Cancelado',
};

export default function ClienteHistorial() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('lavaya_access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clientes/pedidos?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setPedidos(d.pedidos ?? []); }
      } catch { toast.error('Error cargando historial'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtrados = filtro ? pedidos.filter((p: any) => p.estado === filtro) : pedidos;

  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (n: number) => `S/${n.toFixed(2)}`;

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Historial de pedidos" subtitle={`${pedidos.length} pedidos en total`} />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Filtro */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {['', 'PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'CANCELADO'].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${filtro === e ? 'var(--accent)' : 'var(--border)'}`, backgroundColor: filtro === e ? 'var(--accent)' : 'var(--bg-card)', color: filtro === e ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
              {e ? ESTADO_LABEL[e] : 'Todos'}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {filtrados.length === 0 ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <Clock style={{ width: 40, height: 40, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No hay pedidos para mostrar</p>
            </div>
          ) : filtrados.map((p: any, i: number) => (
            <Link key={p.id} href={`/cliente/historial/${p.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < filtrados.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none', transition: 'background 0.15s', backgroundColor: 'transparent' }}
              className="hover:bg-[var(--bg-card-hover)]">
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${ESTADO_COLOR[p.estado]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShoppingBag style={{ width: 18, height: 18, color: ESTADO_COLOR[p.estado] }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.totalPrendas} prendas</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ESTADO_COLOR[p.estado], backgroundColor: `${ESTADO_COLOR[p.estado]}18`, padding: '2px 8px', borderRadius: 999 }}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{formatDate(p.createdAt)}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {p.pago && <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{formatCurrency(p.pago.monto)}</p>}
                <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-hint)', marginTop: 4 }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
