'use client';
// app/cliente/historial/page.tsx — 4 estados simplificados para el cliente
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight, Clock, WashingMachine, Truck, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import {
  ESTADO_PEDIDO_LABEL_CLIENTE,
  ESTADO_PEDIDO_COLOR_CLIENTE,
  ESTADO_PEDIDO_DESC_CLIENTE,
  formatCurrency,
  formatDateShort,
} from '@/lib/utils';
import type { EstadoPedido } from '@/types';
import toast from 'react-hot-toast';

// ─── 4 filtros visibles al cliente ────────────────────────────
const FILTROS_CLIENTE = [
  { key: '',          label: 'Todos' },
  { key: 'activos',   label: 'En curso' },
  { key: 'entregado', label: 'Entregados' },
  { key: 'cancelado', label: 'Cancelados' },
];

// Icono según estado simplificado
function EstadoIcon({ estado }: { estado: string }) {
  const s = { width: 18, height: 18 };
  if (['PENDIENTE', 'CONFIRMADO', 'RECOLECTADO'].includes(estado))
    return <ShoppingBag style={{ ...s, color: '#3b82f6' }} />;
  if (estado === 'EN_PROCESO')
    return <WashingMachine style={{ ...s, color: '#8b5cf6' }} />;
  if (['LISTO', 'EN_CAMINO'].includes(estado))
    return <Truck style={{ ...s, color: '#f97316' }} />;
  if (estado === 'ENTREGADO')
    return <CheckCircle style={{ ...s, color: '#22c55e' }} />;
  return <XCircle style={{ ...s, color: '#ef4444' }} />;
}

// Barra de progreso (4 pasos)
function ProgressBar({ estado }: { estado: string }) {
  const step =
    ['PENDIENTE','CONFIRMADO','RECOLECTADO'].includes(estado) ? 1 :
    estado === 'EN_PROCESO' ? 2 :
    ['LISTO','EN_CAMINO'].includes(estado) ? 3 :
    estado === 'ENTREGADO' ? 4 : 0;

  if (step === 0) return null; // cancelado

  const steps = ['Recibido', 'Lavando', 'En camino', 'Entregado'];
  const colors = ['#3b82f6', '#8b5cf6', '#f97316', '#22c55e'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
      {steps.map((s, i) => {
        const done    = i + 1 <= step;
        const current = i + 1 === step;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              backgroundColor: done ? colors[i] : 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: current ? `0 0 0 3px ${colors[i]}30` : 'none',
              transition: 'all 0.2s',
            }}>
              {done && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }} />}
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, backgroundColor: done ? colors[i] : 'var(--border)', borderRadius: 99 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ClienteHistorial() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('lavaya_access_token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/clientes/pedidos?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) { const d = await res.json(); setPedidos(d.pedidos ?? []); }
      } catch { toast.error('Error cargando historial'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtrados = pedidos.filter((p: any) => {
    if (!filtro) return true;
    if (filtro === 'activos')   return !['ENTREGADO', 'CANCELADO'].includes(p.estado);
    if (filtro === 'entregado') return p.estado === 'ENTREGADO';
    if (filtro === 'cancelado') return p.estado === 'CANCELADO';
    return true;
  });

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Mis pedidos"
        subtitle={`${pedidos.length} pedidos en total`}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Filtros simplificados */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {FILTROS_CLIENTE.map(f => {
            const activo = filtro === f.key;
            return (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                style={{
                  padding: '7px 16px', borderRadius: 999,
                  border: `1.5px solid ${activo ? '#0ea5e9' : 'var(--border)'}`,
                  backgroundColor: activo ? 'rgba(14,165,233,0.1)' : 'var(--bg-card)',
                  color: activo ? '#0ea5e9' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: activo ? 700 : 500, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.length === 0 ? (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <Clock style={{ width: 40, height: 40, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No hay pedidos para mostrar</p>
            </div>
          ) : filtrados.map((p: any) => {
            const labelCliente = ESTADO_PEDIDO_LABEL_CLIENTE[p.estado as EstadoPedido] ?? p.estado;
            const colorClass   = ESTADO_PEDIDO_COLOR_CLIENTE[p.estado as EstadoPedido] ?? '';
            const desc         = ESTADO_PEDIDO_DESC_CLIENTE[p.estado as EstadoPedido] ?? '';
            const esCancelado  = p.estado === 'CANCELADO';
            const esEntregado  = p.estado === 'ENTREGADO';

            return (
              <Link key={p.id} href={`/cliente/historial/${p.id}`}
                style={{ textDecoration: 'none' }}>
                <div style={{
                  backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '16px 18px',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#0ea5e9'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(14,165,233,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Ícono */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      backgroundColor: esCancelado ? 'rgba(239,68,68,0.08)' : esEntregado ? 'rgba(34,197,94,0.08)' : 'rgba(14,165,233,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <EstadoIcon estado={p.estado} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.totalPrendas} prenda{p.totalPrendas !== 1 ? 's' : ''}
                        </span>
                        {/* Badge estado simplificado */}
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        }} className={colorClass}>
                          {labelCliente}
                        </span>
                      </div>
                      {/* Descripción amigable */}
                      {!esCancelado && (
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                          {desc}
                        </p>
                      )}
                      {/* Fecha */}
                      <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '4px 0 0' }}>
                        {formatDateShort(p.createdAt)}
                      </p>
                      {/* Barra de progreso */}
                      {!esCancelado && <ProgressBar estado={p.estado} />}
                    </div>

                    {/* Monto + flecha */}
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {p.pago && (
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {formatCurrency(p.pago.monto)}
                        </p>
                      )}
                      <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-hint)' }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
