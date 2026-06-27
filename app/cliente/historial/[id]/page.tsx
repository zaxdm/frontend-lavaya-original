'use client';
// app/cliente/historial/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ShoppingBag, MapPin, Truck, CreditCard,
  CheckCircle2, Circle, Star, MessageCircle,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import { pedidosApi } from '@/lib/api';
import toast from 'react-hot-toast';

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

// Orden cronológico de estados para la línea de tiempo
const FLUJO_ESTADOS = ['PENDIENTE', 'CONFIRMADO', 'RECOLECTADO', 'EN_PROCESO', 'LISTO', 'EN_CAMINO', 'ENTREGADO'];

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const formatCurrency = (n?: number) => `S/${(n ?? 0).toFixed(2)}`;

export default function HistorialDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchPedido = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await pedidosApi.get(id);
        setPedido(data);
      } catch (err: any) {
        if (err.status === 404) setError('Pedido no encontrado');
        else if (err.status === 401) setError('Tu sesión expiró. Inicia sesión de nuevo.');
        else setError(err.message || 'Ocurrió un error inesperado');
      } finally {
        setLoading(false);
      }
    };
    fetchPedido();
  }, [id]);

  if (loading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner /></div>;
  }

  if (error) {
    return (
      <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
        <PageHeader title="Detalle del pedido" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '64px 24px' }}>
          <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
          <button onClick={() => router.push('/cliente/historial')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Volver al historial
          </button>
        </div>
      </div>
    );
  }

  if (!pedido) return null;

  const color = ESTADO_COLOR[pedido.estado] ?? '#64748b';
  const label = ESTADO_LABEL[pedido.estado] ?? pedido.estado;
  const cancelado = pedido.estado === 'CANCELADO';
  const idxActual = FLUJO_ESTADOS.indexOf(pedido.estado);

  const items = pedido.items ?? pedido.prendas ?? [];
  const direccion = pedido.direccion ?? pedido.direccionEntrega ?? null;
  const repartidor = pedido.repartidor ?? pedido.repartidorEntrega ?? null;
  const pago = pedido.pago ?? null;

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title={`Pedido #${String(pedido.id).slice(0, 8)}`}
        subtitle={formatDate(pedido.createdAt)}
        action={
          <button onClick={() => router.push('/cliente/historial')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Volver
          </button>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto' }}>

        {/* ─── Estado actual ─── */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: `1.5px solid ${color}40`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pedido.totalPrendas ? 14 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag style={{ width: 18, height: 18, color }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Estado actual</p>
                <p style={{ fontSize: 16, fontWeight: 800, color, margin: '1px 0 0' }}>{label}</p>
              </div>
            </div>
            {pago && (
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{formatCurrency(pago.monto)}</p>
            )}
          </div>
          {pedido.totalPrendas != null && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{pedido.totalPrendas} prendas en este pedido</p>
          )}
        </div>

        {/* ─── Línea de tiempo ─── */}
        {!cancelado && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Seguimiento</p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {FLUJO_ESTADOS.map((est, i) => {
                const completado = i <= idxActual;
                const esActual = i === idxActual;
                return (
                  <div key={est} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {completado ? (
                        <CheckCircle2 style={{ width: 18, height: 18, color: esActual ? color : '#22c55e', flexShrink: 0 }} />
                      ) : (
                        <Circle style={{ width: 18, height: 18, color: 'var(--border)', flexShrink: 0 }} />
                      )}
                      {i < FLUJO_ESTADOS.length - 1 && (
                        <div style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: completado && i < idxActual ? '#22c55e' : 'var(--border)', margin: '2px 0' }} />
                      )}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: esActual ? 700 : 500, color: completado ? 'var(--text-primary)' : 'var(--text-hint)', margin: '0 0 18px' }}>
                      {ESTADO_LABEL[est]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cancelado && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#ef4444', margin: 0, fontWeight: 600 }}>Este pedido fue cancelado.</p>
            {pedido.motivoCancelacion && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0' }}>{pedido.motivoCancelacion}</p>
            )}
          </div>
        )}

        {/* ─── Prendas ─── */}
        {items.length > 0 && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Prendas</p>
            </div>
            {items.map((item: any, i: number) => (
              <div key={item.id ?? i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {item.tipo ?? item.descripcion ?? 'Prenda'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Cantidad: {item.cantidad ?? 1}
                  </p>
                </div>
                {item.precio != null && (
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {formatCurrency(item.precio * (item.cantidad ?? 1))}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Dirección ─── */}
        {direccion && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MapPin style={{ width: 16, height: 16, color: '#0ea5e9' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Dirección de entrega</p>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {[direccion.calle, direccion.numero].filter(Boolean).join(' ')}
              {direccion.colonia ? `, ${direccion.colonia}` : ''}
              {direccion.ciudad ? `, ${direccion.ciudad}` : ''}
            </p>
            {direccion.referencia && (
              <p style={{ fontSize: 12, color: 'var(--text-hint)', margin: '4px 0 0' }}>Ref: {direccion.referencia}</p>
            )}
          </div>
        )}

        {/* ─── Repartidor ─── */}
        {repartidor && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Truck style={{ width: 16, height: 16, color: '#f97316' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Repartidor</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {repartidor.nombre ?? repartidor.usuario?.nombre ?? 'Asignado'}
                </p>
                {repartidor.telefono && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{repartidor.telefono}</p>
                )}
              </div>
              {repartidor.telefono && (
                <a href={`tel:${repartidor.telefono}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  <MessageCircle style={{ width: 13, height: 13 }} /> Contactar
                </a>
              )}
            </div>
          </div>
        )}

        {/* ─── Pago ─── */}
        {pago && (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <CreditCard style={{ width: 16, height: 16, color: '#7c3aed' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Pago</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-muted)' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Método</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{pago.metodo ?? '—'}</p>
              </div>
              <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-muted)' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-secondary)' }}>Total</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(pago.monto)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Calificación (si ya fue entregado) ─── */}
        {pedido.estado === 'ENTREGADO' && !pedido.calificacion && (
          <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star style={{ width: 16, height: 16, color: '#f59e0b' }} />
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>¿Cómo estuvo tu pedido?</p>
            </div>
            <button
              onClick={() => toast('Próximamente: calificar pedido')}
              style={{ padding: '7px 14px', borderRadius: 9, border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Calificar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}