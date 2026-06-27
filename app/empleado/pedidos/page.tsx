'use client';
// app/empleado/pedidos/page.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  Package, RefreshCw, Eye, UserCheck,
  ArrowRight, WashingMachine, CheckCircle2,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { empleadoApi, pedidosApi } from '@/lib/api';
import {
  ESTADO_PEDIDO_LABEL, ESTADO_PEDIDO_COLOR,
  ESTADO_PEDIDO_LABEL_SIMPLE, GRUPO_ESTADO,
  ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR,
  formatDate, formatCurrency,
} from '@/lib/utils';
import type { Pedido, EstadoPedido, Repartidor, EstadoPago } from '@/types';
import toast from 'react-hot-toast';

// ─── Grupos simplificados que ve el empleado ──────────────────
const GRUPOS = [
  { key: '',         label: 'Todos',          color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  { key: 'recibido', label: 'Recibido',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { key: 'lavando',  label: 'Lavando',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { key: 'listo',    label: 'Listo',           color: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
];

// Botón de acción según estado actual
function getAccion(estado: EstadoPedido): { label: string; icon: React.ElementType; color: string } | null {
  if (['PENDIENTE', 'CONFIRMADO', 'RECOLECTADO'].includes(estado))
    return { label: 'Iniciar lavado', icon: WashingMachine, color: '#8b5cf6' };
  if (estado === 'EN_PROCESO')
    return { label: 'Marcar listo', icon: CheckCircle2, color: '#14b8a6' };
  return null;
}

export default function EmpleadoPedidos() {
  const { user, loading: authLoading } = useAuth();
  const [pedidos, setPedidos]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [actualizando, setActualizando] = useState<string | null>(null);

  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [showDetalle, setShowDetalle]     = useState(false);

  const [pedidoAsignar, setPedidoAsignar]   = useState<Pedido | null>(null);
  const [repartidores, setRepartidores]     = useState<Repartidor[]>([]);
  const [repartidorSel, setRepartidorSel]   = useState('');
  const [tipoAsignacion, setTipoAsignacion] = useState<'recoleccion' | 'entrega'>('recoleccion');
  const [showAsignar, setShowAsignar]       = useState(false);
  const [saving, setSaving]                 = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await empleadoApi.getPedidos();
      setPedidos(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user, load]);

  // Un solo clic avanza el pedido al siguiente estado
  const avanzar = async (p: any) => {
    setActualizando(p.id);
    try {
      const res = await empleadoApi.avanzarPedido(p.id);
      toast.success(res.mensaje || 'Estado actualizado');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setActualizando(null);
    }
  };

  const verDetalle = async (pedido: Pedido) => {
    try { const full = await pedidosApi.get(pedido.id); setPedidoDetalle(full); setShowDetalle(true); }
    catch { toast.error('Error cargando detalle'); }
  };

  const abrirAsignar = async (pedido: Pedido) => {
    setPedidoAsignar(pedido);
    setRepartidorSel('');
    setTipoAsignacion(pedido.estado === 'LISTO' ? 'entrega' : 'recoleccion');
    try { const lista = await empleadoApi.getRepartidores('DISPONIBLE'); setRepartidores(lista); }
    catch { toast.error('Error cargando repartidores'); }
    setShowAsignar(true);
  };

  const confirmarAsignacion = async () => {
    if (!pedidoAsignar || !repartidorSel) { toast.error('Selecciona un repartidor'); return; }
    setSaving(true);
    try {
      await empleadoApi.asignarRepartidor(pedidoAsignar.id, repartidorSel, tipoAsignacion);
      toast.success('Repartidor asignado');
      setShowAsignar(false); load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar');
    } finally { setSaving(false); }
  };

  // Filtrar por grupo simple
  const pedidosFiltrados = filtroGrupo
    ? pedidos.filter(p => GRUPO_ESTADO[p.estado as EstadoPedido] === filtroGrupo)
    : pedidos;

  // Conteos por grupo
  const conteos: Record<string, number> = { '': pedidos.length };
  for (const g of GRUPOS.slice(1)) {
    conteos[g.key] = pedidos.filter(p => GRUPO_ESTADO[p.estado as EstadoPedido] === g.key).length;
  }

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Pedidos"
        subtitle={`${pedidos.length} pedidos activos`}
        action={
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Tabs de grupos simplificados ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {GRUPOS.map(g => {
            const activo = filtroGrupo === g.key;
            const n = conteos[g.key] ?? 0;
            return (
              <button key={g.key} onClick={() => setFiltroGrupo(g.key)}
                style={{
                  padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: activo ? 700 : 500,
                  border: `1.5px solid ${activo ? g.color : 'var(--border)'}`,
                  backgroundColor: activo ? g.bg : 'var(--bg-card)',
                  color: activo ? g.color : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                {g.label}
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 999, fontSize: 11, fontWeight: 700,
                  backgroundColor: activo ? g.color : 'var(--bg-muted)',
                  color: activo ? '#fff' : 'var(--text-secondary)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tabla ── */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 64, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          ) : pedidosFiltrados.length === 0 ? (
            <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <Package style={{ width: 40, height: 40, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Sin pedidos en este grupo</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                    {['ID', 'Cliente', 'Prendas', 'Estado', 'Repartidor', 'Pago', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map((p: any, i: number) => {
                    const accion = getAccion(p.estado);
                    const grupo  = GRUPOS.find(g => g.key === GRUPO_ESTADO[p.estado as EstadoPedido]);
                    return (
                      <tr key={p.id}
                        style={{ borderBottom: i < pedidosFiltrados.length - 1 ? '1px solid var(--border)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* ID */}
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                          #{p.id.slice(0, 8)}
                        </td>

                        {/* Cliente */}
                        <td style={{ padding: '14px 16px' }}>
                          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{p.cliente?.nombre} {p.cliente?.apellido}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{p.cliente?.telefono ?? p.cliente?.email ?? '—'}</p>
                        </td>

                        {/* Prendas */}
                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                          {p.totalPrendas}
                        </td>

                        {/* Estado — grupo simple + estado interno */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {grupo && grupo.key && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 700, backgroundColor: grupo.bg, color: grupo.color, width: 'fit-content' }}>
                                {grupo.label}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>
                              {ESTADO_PEDIDO_LABEL[p.estado as EstadoPedido]}
                            </span>
                          </div>
                        </td>

                        {/* Repartidor */}
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {p.repartidorRecoleccion
                            ? `${p.repartidorRecoleccion.usuario.nombre} ${p.repartidorRecoleccion.usuario.apellido}`
                            : <span style={{ color: 'var(--text-hint)' }}>Sin asignar</span>}
                        </td>

                        {/* Pago */}
                        <td style={{ padding: '14px 16px', fontSize: 12 }}>
                          {p.pago
                            ? <span style={{ color: ESTADO_PAGO_COLOR[p.pago.estado as EstadoPago], fontWeight: 600 }}>{ESTADO_PAGO_LABEL[p.pago.estado as EstadoPago]}</span>
                            : <span style={{ color: 'var(--text-hint)' }}>—</span>}
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {/* Ver detalle */}
                            <button onClick={() => verDetalle(p)} title="Ver detalle"
                              style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Eye style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
                            </button>

                            {/* Asignar repartidor */}
                            {((['PENDIENTE','CONFIRMADO'].includes(p.estado) && !p.repartidorRecoleccionId) ||
                              (p.estado === 'LISTO' && !p.repartidorEntregaId)) && (
                              <button onClick={() => abrirAsignar(p)} title="Asignar repartidor"
                                style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <UserCheck style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
                              </button>
                            )}

                            {/* Botón principal de avance — UN solo botón */}
                            {accion && (
                              <button
                                disabled={actualizando === p.id}
                                onClick={() => avanzar(p)}
                                style={{
                                  padding: '6px 12px', borderRadius: 8, border: 'none',
                                  backgroundColor: actualizando === p.id ? `${accion.color}80` : accion.color,
                                  color: '#fff', fontSize: 12, fontWeight: 600, cursor: actualizando === p.id ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const,
                                }}>
                                {actualizando === p.id
                                  ? <Spinner className="w-3 h-3 border-white border-t-transparent" />
                                  : <accion.icon style={{ width: 12, height: 12 }} />}
                                {accion.label}
                                <ArrowRight style={{ width: 11, height: 11 }} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal detalle ── */}
      <Modal open={showDetalle} onClose={() => setShowDetalle(false)} title="Detalle del pedido" size="lg">
        {pedidoDetalle && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'ID', value: <span style={{ fontFamily: 'monospace' }}>{pedidoDetalle.id}</span> },
                { label: 'Estado', value: <Badge className={ESTADO_PEDIDO_COLOR[pedidoDetalle.estado]}>{ESTADO_PEDIDO_LABEL[pedidoDetalle.estado]}</Badge> },
                { label: 'Cliente', value: <div><p style={{ fontWeight: 500, margin: 0 }}>{pedidoDetalle.cliente?.nombre} {pedidoDetalle.cliente?.apellido}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{pedidoDetalle.cliente?.email}</p></div> },
                { label: 'Dirección', value: pedidoDetalle.direccion ? <div><p style={{ margin: 0 }}>{pedidoDetalle.direccion.calle} {pedidoDetalle.direccion.numero}, {pedidoDetalle.direccion.colonia}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{pedidoDetalle.direccion.ciudad}</p></div> : '—' },
                { label: 'Recolección', value: formatDate(pedidoDetalle.fechaRecoleccion) },
                { label: 'Entrega est.', value: formatDate(pedidoDetalle.fechaEntregaEstimada) },
              ].map((row, idx) => (
                <div key={idx}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</p>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{row.value}</div>
                </div>
              ))}
            </div>
            {pedidoDetalle.prendas && pedidoDetalle.prendas.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Prendas ({pedidoDetalle.totalPrendas})</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <thead style={{ backgroundColor: 'var(--bg-muted)' }}>
                    <tr>{['Tipo','Cant.','Precio','Subtotal'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{h}</th>)}</tr>
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
                </table>
              </div>
            )}
            {pedidoDetalle.historial && pedidoDetalle.historial.length > 0 && (
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Historial</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pedidoDetalle.historial.map((h: any) => (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7c3aed', marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontWeight: 500 }}>{ESTADO_PEDIDO_LABEL[h.estado as EstadoPedido]}</span>
                        {h.nota && <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>— {h.nota}</span>}
                        <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '3px 0 0' }}>{formatDate(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal asignar repartidor ── */}
      <Modal open={showAsignar} onClose={() => setShowAsignar(false)} title="Asignar repartidor" size="sm">
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Tipo</label>
            <select value={tipoAsignacion} onChange={e => setTipoAsignacion(e.target.value as 'recoleccion' | 'entrega')}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
              <option value="recoleccion">Recolección</option>
              <option value="entrega">Entrega</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Repartidor</label>
            {repartidores.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-hint)', fontStyle: 'italic' }}>No hay repartidores disponibles</p>
              : <select value={repartidorSel} onChange={e => setRepartidorSel(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                  <option value="">Seleccionar...</option>
                  {repartidores.map(r => <option key={r.id} value={r.id}>{r.usuario?.nombre} {r.usuario?.apellido} — ⭐ {r.calificacionPromedio.toFixed(1)}</option>)}
                </select>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowAsignar(false)} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmarAsignacion} disabled={saving || !repartidorSel}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: saving || !repartidorSel ? '#93c5fd' : '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving || !repartidorSel ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
              Asignar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
