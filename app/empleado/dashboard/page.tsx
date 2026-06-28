'use client';
// app/empleado/dashboard/page.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Package, CheckCircle2, ClipboardList, RefreshCw,
  TrendingUp, DollarSign, Eye, UserCheck,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { empleadoApi, pedidosApi } from '@/lib/api';
import { formatCurrency, ESTADO_PEDIDO_LABEL, ESTADO_PEDIDO_COLOR, ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR } from '@/lib/utils';
import type { Pedido, EstadoPedido, Repartidor } from '@/types';
import toast from 'react-hot-toast';

type VentaDia = { fecha: string; totalPedidos: number; entregados: number; ingresos: number };

const ESTADO_HEX_COLOR: Record<string, string> = {
  PENDIENTE: '#f59e0b', CONFIRMADO: '#3b82f6', RECOLECTADO: '#6366f1', 
  EN_PROCESO: '#8b5cf6', LISTO: '#14b8a6', EN_CAMINO: '#0ea5e9',
  ENTREGADO: '#22c55e', CANCELADO: '#ef4444'
};
const PERIODOS = [
  { label: '7 días',  dias: 7  },
  { label: '14 días', dias: 14 },
  { label: '30 días', dias: 30 },
];

function formatFecha(fechaStr: string): string {
  const d = new Date(fechaStr + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export default function EmpleadoDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [pedidos,      setPedidos]      = useState<any[]>([]);
  const [resumen,      setResumen]      = useState({ recolectados: 0, enProceso: 0, listos: 0, entregadosHoy: 0 });
  const [loadingPed,   setLoadingPed]   = useState(true);
  const [actualizando, setActualizando] = useState<string | null>(null);
  
  // Estado para modal de detalle
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [showDetalle, setShowDetalle] = useState(false);
  
  // Estado para modal de asignar repartidor
  const [pedidoAsignar, setPedidoAsignar] = useState<Pedido | null>(null);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [repartidorSel, setRepartidorSel] = useState('');
  const [tipoAsignacion, setTipoAsignacion] = useState<'recoleccion' | 'entrega'>('entrega');
  const [showAsignar, setShowAsignar] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showAllPedidos, setShowAllPedidos] = useState(false);

  const [ventas,     setVentas]     = useState<VentaDia[]>([]);
  const [loadingVen, setLoadingVen] = useState(true);
  const [periodo,    setPeriodo]    = useState(14);

  // ── Cargar pedidos y resumen usando empleadoApi ──
  const loadPedidos = useCallback(async () => {
    setLoadingPed(true);
    try {
      // Promise.all está bien aquí porque empleadoApi reutiliza la misma
      // conexión Prisma (connection_limit=1 lo maneja el pool del backend)
      const [pedidosData, resumenData] = await Promise.all([
        empleadoApi.getPedidos(),
        empleadoApi.getResumen(),
      ]);
      setPedidos(pedidosData);
      setResumen(resumenData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoadingPed(false);
    }
  }, []);

  // ── Cargar ventas diarias ──
  const loadVentas = useCallback(async () => {
    setLoadingVen(true);
    try {
      const raw = await empleadoApi.getVentasDiarias(periodo);
      setVentas(raw.map(d => ({
        fecha:        String(d.fecha),
        totalPedidos: Number(d.totalPedidos),
        entregados:   Number(d.entregados),
        ingresos:     Number(d.ingresos),
      })));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando ventas');
    } finally {
      setLoadingVen(false);
    }
  }, [periodo]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadPedidos();
  }, [authLoading, user, loadPedidos]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadVentas();
  }, [authLoading, user, loadVentas]);

  // ── Cambiar estado usando empleadoApi ──
  const cambiarEstado = async (id: string, accion: 'en-proceso' | 'listo') => {
    setActualizando(id);
    try {
      if (accion === 'en-proceso') {
        await empleadoApi.marcarEnProceso(id);
        toast.success('Pedido en proceso de lavado');
      } else {
        await empleadoApi.marcarListo(id);
        toast.success('Pedido marcado como listo');
      }
      loadPedidos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setActualizando(null);
    }
  };
  
  // ── Ver detalle del pedido ──
  const verDetalle = async (pedido: Pedido) => {
    try {
      const full = await pedidosApi.get(pedido.id);
      setPedidoDetalle(full);
      setShowDetalle(true);
    } catch {
      toast.error('Error cargando detalle');
    }
  };

  // ── Abrir modal para asignar repartidor ──
  const abrirAsignar = async (pedido: Pedido) => {
    setPedidoAsignar(pedido);
    setRepartidorSel('');
    setTipoAsignacion(pedido.estado === 'LISTO' ? 'entrega' : 'recoleccion');
    try {
      const lista = await empleadoApi.getRepartidores('DISPONIBLE');
      setRepartidores(lista);
    } catch {
      toast.error('Error cargando repartidores');
    }
    setShowAsignar(true);
  };

  // ── Confirmar asignación de repartidor ──
  const confirmarAsignacion = async () => {
    if (!pedidoAsignar || !repartidorSel) {
      toast.error('Selecciona un repartidor');
      return;
    }
    setSaving(true);
    try {
      await empleadoApi.asignarRepartidor(pedidoAsignar.id, repartidorSel, tipoAsignacion);
      toast.success('Repartidor asignado');
      setShowAsignar(false);
      loadPedidos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar');
    } finally {
      setSaving(false);
    }
  };

  const totales = ventas.reduce(
    (acc, d) => ({ pedidos: acc.pedidos + d.totalPedidos, entregados: acc.entregados + d.entregados, ingresos: acc.ingresos + d.ingresos }),
    { pedidos: 0, entregados: 0, ingresos: 0 },
  );
  const tasaEntrega = totales.pedidos > 0 ? Math.round((totales.entregados / totales.pedidos) * 100) : 0;

  const tooltipFormatter = (value: unknown, name: unknown) => {
    if (name === 'ingresos')     return [formatCurrency(value as number), 'Ingresos'];
    if (name === 'totalPedidos') return [String(value), 'Pedidos'];
    if (name === 'entregados')   return [String(value), 'Entregados'];
    return [String(value), String(name)];
  };

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title={`Hola, ${user?.nombre ?? ''} 👋`}
        subtitle="Dashboard de la lavandería"
        action={
          <button
            onClick={() => { loadPedidos(); loadVentas(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Sección 1: Estado actual del día ── */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado del día</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Por lavar',      value: resumen.recolectados,  color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
              { label: 'En lavado',      value: resumen.enProceso,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
              { label: 'Listos',         value: resumen.listos,        color: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
              { label: 'Entregados hoy', value: resumen.entregadosHoy, color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
            ].map(stat => (
              <div key={stat.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Package style={{ width: 16, height: 16, color: stat.color }} />
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sección 2: Pedidos activos ── */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pedidos activos</p>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {loadingPed ? (
              <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
            ) : pedidos.length === 0 ? (
              <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                <CheckCircle2 style={{ width: 36, height: 36, opacity: 0.3 }} />
                <p style={{ fontSize: 14, margin: 0 }}>No hay pedidos en este momento</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                      {['ID', 'Cliente', 'Prendas', 'Estado', 'Recolección', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllPedidos ? pedidos : pedidos.slice(0, 5)).map((p: any, i: number) => (
                      <tr key={p.id}
                        style={{ borderBottom: i < (showAllPedidos ? pedidos.length : Math.min(pedidos.length, 5)) - 1 ? '1px solid var(--border)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>#{p.id.slice(0, 8)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                          {p.cliente?.nombre} {p.cliente?.apellido}
                          {p.cliente?.telefono && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{p.cliente.telefono}</p>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.totalPrendas}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_HEX_COLOR[p.estado], backgroundColor: `${ESTADO_HEX_COLOR[p.estado]}18`, padding: '3px 10px', borderRadius: 999 }}>
                            {ESTADO_PEDIDO_LABEL[p.estado as keyof typeof ESTADO_PEDIDO_LABEL] ?? p.estado}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {p.fechaRecoleccion ? new Date(p.fechaRecoleccion).toLocaleDateString('es-PE') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button onClick={() => verDetalle(p)} title="Ver detalle" style={{ padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Eye style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
                            </button>
                            {((['PENDIENTE', 'CONFIRMADO'].includes(p.estado) && !p.repartidorRecoleccionId) || (p.estado === 'LISTO' && !p.repartidorEntregaId)) && (
                              <button onClick={() => abrirAsignar(p)} title="Asignar repartidor" style={{ padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UserCheck style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
                              </button>
                            )}
                            {p.estado === 'RECOLECTADO' && (
                              <button disabled={actualizando === p.id} onClick={() => cambiarEstado(p.id, 'en-proceso')}
                                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {actualizando === p.id ? <Spinner className="w-3 h-3 border-white border-t-transparent" /> : <ClipboardList style={{ width: 12, height: 12 }} />}
                                Iniciar lavado
                              </button>
                            )}
                            {p.estado === 'EN_PROCESO' && (
                              <button disabled={actualizando === p.id} onClick={() => cambiarEstado(p.id, 'listo')}
                                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: '#14b8a6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {actualizando === p.id ? <Spinner className="w-3 h-3 border-white border-t-transparent" /> : <CheckCircle2 style={{ width: 12, height: 12 }} />}
                                Marcar listo
                              </button>
                            )}
                            {p.estado === 'LISTO' && !p.repartidorEntregaId && (
                              <span style={{ fontSize: 12, color: '#14b8a6', fontWeight: 600 }}>Esperando repartidor</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pedidos.length > 5 && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowAllPedidos(prev => !prev)}
                      style={{
                        padding: '7px 20px', borderRadius: 8, border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-card-hover)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-card)'; }}
                    >
                      {showAllPedidos
                        ? `▲ Mostrar menos`
                        : `▼ Ver ${pedidos.length - 5} pedido${pedidos.length - 5 !== 1 ? 's' : ''} más`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Sección 3: Gráficos de ventas ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Actividad y ventas
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {PERIODOS.map(p => (
                <button
                  key={p.dias}
                  onClick={() => setPeriodo(p.dias)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1.5px solid ${periodo === p.dias ? '#7c3aed' : 'var(--border)'}`,
                    backgroundColor: periodo === p.dias ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                    color: periodo === p.dias ? '#7c3aed' : 'var(--text-secondary)',
                    fontWeight: periodo === p.dias ? 600 : 400,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loadingVen ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <Spinner className="w-8 h-8" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: `Pedidos (${periodo}d)`,    value: totales.pedidos,                  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: Package      },
                  { label: `Entregados (${periodo}d)`, value: totales.entregados,               color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: CheckCircle2 },
                  { label: 'Tasa de entrega',           value: `${tasaEntrega}%`,                color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: TrendingUp   },
                  { label: `Ingresos (${periodo}d)`,   value: formatCurrency(totales.ingresos), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: DollarSign   },
                ].map(kpi => (
                  <div key={kpi.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <kpi.icon style={{ width: 16, height: 16, color: kpi.color }} />
                    </div>
                    <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{kpi.value}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{kpi.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Pedidos diarios</p>
                  {ventas.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-hint)', fontSize: 13 }}>Sin datos para este período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={ventas.map(d => ({ ...d, fecha: formatFecha(d.fecha) }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip formatter={tooltipFormatter as never} contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                        <Bar dataKey="totalPedidos" name="Pedidos"    fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="entregados"   name="Entregados" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Ingresos diarios (PEN)</p>
                  {ventas.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-hint)', fontSize: 13 }}>Sin ingresos registrados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={ventas.map(d => ({ ...d, fecha: formatFecha(d.fecha) }))} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={v => `S/${((v as number) / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={tooltipFormatter as never} contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                        <Bar dataKey="ingresos" name="Ingresos" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      
      {/* ── Modal: Detalle del pedido ── */}
      <Modal open={showDetalle} onClose={() => setShowDetalle(false)} title="Detalle del pedido" size="lg">
        {pedidoDetalle && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'ID', value: <span style={{ fontFamily: 'monospace' }}>{pedidoDetalle.id}</span> },
                { label: 'Estado', value: <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_PEDIDO_COLOR[pedidoDetalle.estado as EstadoPedido], backgroundColor: `${ESTADO_PEDIDO_COLOR[pedidoDetalle.estado as EstadoPedido]}18`, padding: '3px 10px', borderRadius: 999 }}>{ESTADO_PEDIDO_LABEL[pedidoDetalle.estado as EstadoPedido]}</span> },
                { label: 'Cliente', value: <div><p style={{ fontWeight: 500, margin: 0 }}>{pedidoDetalle.cliente?.nombre} {pedidoDetalle.cliente?.apellido}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{pedidoDetalle.cliente?.email}</p></div> },
                { label: 'Dirección', value: pedidoDetalle.direccion ? <div><p style={{ margin: 0 }}>{pedidoDetalle.direccion.calle} {pedidoDetalle.direccion.numero}, {pedidoDetalle.direccion.colonia}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{pedidoDetalle.direccion.ciudad}, {pedidoDetalle.direccion.estado}</p></div> : <span style={{ color: 'var(--text-hint)' }}>Sin dirección</span> },
                { label: 'Creado', value: new Date(pedidoDetalle.createdAt).toLocaleDateString('es-PE') },
                { label: 'Recolección', value: pedidoDetalle.fechaRecoleccion ? new Date(pedidoDetalle.fechaRecoleccion).toLocaleDateString('es-PE') : '—' },
              ].map((row, idx) => (
                <div key={idx}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</p>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{row.value}</div>
                </div>
              ))}
            </div>
            
            {/* ── Prendas ── */}
            {pedidoDetalle.prendas && pedidoDetalle.prendas.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prendas ({pedidoDetalle.totalPrendas})</h3>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'var(--bg-muted)' }}>
                      <tr>
                        {['Tipo', 'Cantidad', 'Precio', 'Subtotal'].map((h, idx) => (
                          <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoDetalle.prendas.map((pr: any) => (
                        <tr key={pr.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', textTransform: 'capitalize', fontSize: 13 }}>{pr.tipo}</td>
                          <td style={{ padding: '8px 12px', fontSize: 13 }}>{pr.cantidad}</td>
                          <td style={{ padding: '8px 12px', fontSize: 13 }}>{formatCurrency(pr.precio)}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>{formatCurrency(pr.precio * pr.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: 'var(--bg-muted)', borderTop: '1px solid var(--border)' }}>
                      <tr>
                        <td colSpan={3} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>Total</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
                          {formatCurrency(pedidoDetalle.prendas.reduce((a: number, p: any) => a + p.precio * p.cantidad, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
            
            {/* ── Historial ── */}
            {pedidoDetalle.historial && pedidoDetalle.historial.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Historial</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pedidoDetalle.historial.map((h: any) => (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: 13 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ESTADO_PEDIDO_COLOR[h.estado as EstadoPedido], marginTop: '6px', flexShrink: 0 }} />
                      <div>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ESTADO_PEDIDO_LABEL[h.estado as EstadoPedido]}</span>
                        {h.nota && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>— {h.nota}</span>}
                        <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '4px 0 0 0' }}>
                          {new Date(h.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* ── Modal: Asignar repartidor ── */}
      <Modal open={showAsignar} onClose={() => setShowAsignar(false)} title="Asignar repartidor" size="sm">
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Tipo de asignación</label>
            <select value={tipoAsignacion} onChange={(e) => setTipoAsignacion(e.target.value as 'recoleccion' | 'entrega')} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
              <option value="recoleccion">Recolección</option>
              <option value="entrega">Entrega</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Repartidor disponible</label>
            {repartidores.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-hint)', fontStyle: 'italic' }}>No hay repartidores disponibles</p>
            ) : (
              <select value={repartidorSel} onChange={(e) => setRepartidorSel(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                <option value="">Seleccionar...</option>
                {repartidores.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.usuario?.nombre} {r.usuario?.apellido} — ⭐ {r.calificacionPromedio.toFixed(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowAsignar(false)} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={confirmarAsignacion} disabled={saving || !repartidorSel} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: saving || !repartidorSel ? '#93c5fd' : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving || !repartidorSel ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {saving && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
              Asignar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}