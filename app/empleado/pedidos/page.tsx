'use client';
// app/empleado/pedidos/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { Package, RefreshCw, CheckCircle2, ClipboardList, Eye, UserCheck } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { empleadoApi, pedidosApi } from '@/lib/api';
import { ESTADO_PEDIDO_LABEL, ESTADO_PEDIDO_COLOR, ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR, formatDate, formatCurrency } from '@/lib/utils';
import type { Pedido, EstadoPedido, Repartidor } from '@/types';
import toast from 'react-hot-toast';

const ESTADOS_ACTIVOS = ['PENDIENTE', 'CONFIRMADO', 'RECOLECTADO', 'EN_PROCESO', 'LISTO'];

export default function EmpleadoPedidos() {
  const { user, loading: authLoading } = useAuth();
  const [pedidos,      setPedidos]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filtro,       setFiltro]       = useState('');
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // empleadoApi.getPedidos ya construye la URL correcta con BASE_URL
      // y maneja el refresh del JWT automáticamente
      const data = await empleadoApi.getPedidos(filtro || undefined);
      setPedidos(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [authLoading, user, load]);

  const cambiarEstado = async (id: string, accion: 'en-proceso' | 'listo') => {
    setActualizando(id);
    try {
      if (accion === 'en-proceso') {
        await empleadoApi.marcarEnProceso(id);
      } else {
        await empleadoApi.marcarListo(id);
      }
      toast.success('Estado actualizado');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setActualizando(null);
    }
  };

  const verDetalle = async (pedido: Pedido) => {
    try {
      const full = await pedidosApi.get(pedido.id);
      setPedidoDetalle(full);
      setShowDetalle(true);
    } catch {
      toast.error('Error cargando detalle');
    }
  };

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
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Pedidos en lavandería"
        subtitle={`${pedidos.length} pedidos activos`}
        action={
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
          </button>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {['', ...ESTADOS_ACTIVOS].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              style={{
                padding: '6px 14px', borderRadius: 999,
                border: `1.5px solid ${filtro === e ? (ESTADO_PEDIDO_COLOR[e as EstadoPedido] || 'var(--accent)') : 'var(--border)'}`,
                backgroundColor: filtro === e ? (ESTADO_PEDIDO_COLOR[e as EstadoPedido] ? `${ESTADO_PEDIDO_COLOR[e as EstadoPedido]}15` : 'rgba(37,99,235,0.1)') : 'var(--bg-card)',
                color: filtro === e ? (ESTADO_PEDIDO_COLOR[e as EstadoPedido] || 'var(--accent)') : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {e ? ESTADO_PEDIDO_LABEL[e as EstadoPedido] : 'Todos'}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          ) : pedidos.length === 0 ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <Package style={{ width: 40, height: 40, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No hay pedidos en este estado</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                    {['ID', 'Cliente', 'Tel.', 'Prendas', 'Estado', 'Recolección', 'Entrega est.', 'Pago', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p: any, i: number) => (
                    <tr key={p.id}
                      style={{ borderBottom: i < pedidos.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>#{p.id.slice(0, 8)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.cliente?.nombre} {p.cliente?.apellido}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{p.cliente?.telefono ?? '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.totalPrendas}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_PEDIDO_COLOR[p.estado as EstadoPedido], backgroundColor: `${ESTADO_PEDIDO_COLOR[p.estado as EstadoPedido]}18`, padding: '3px 10px', borderRadius: 999 }}>
                          {ESTADO_PEDIDO_LABEL[p.estado as EstadoPedido] ?? p.estado}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(p.fechaRecoleccion)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(p.fechaEntregaEstimada)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12 }}>
                        {p.pago
                          ? <span style={{ color: ESTADO_PAGO_COLOR[p.pago.estado], fontWeight: 600 }}>{ESTADO_PAGO_LABEL[p.pago.estado]}</span>
                          : <span style={{ color: 'var(--text-hint)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => verDetalle(p)} title="Ver detalle" style={{ padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Eye style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
                          </button>
                          
                          {/* Botón de asignar repartidor */}
                          {(
                            (['PENDIENTE', 'CONFIRMADO'].includes(p.estado) && !p.repartidorRecoleccionId) || 
                            (p.estado === 'LISTO' && !p.repartidorEntregaId)
                          ) && (
                            <button onClick={() => abrirAsignar(p)} title="Asignar repartidor" style={{ padding: '6px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <UserCheck style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
                            </button>
                          )}
                          
                          {/* Botones de cambio de estado */}
                          {p.estado === 'RECOLECTADO' && (
                            <button disabled={actualizando === p.id} onClick={() => cambiarEstado(p.id, 'en-proceso')}
                              style={{ padding: '5px 10px', borderRadius: 7, border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const }}>
                              {actualizando === p.id ? <Spinner className="w-3 h-3 border-white border-t-transparent" /> : <ClipboardList style={{ width: 11, height: 11 }} />}
                              Lavar
                            </button>
                          )}
                          {p.estado === 'EN_PROCESO' && (
                            <button disabled={actualizando === p.id} onClick={() => cambiarEstado(p.id, 'listo')}
                              style={{ padding: '5px 10px', borderRadius: 7, border: 'none', backgroundColor: '#14b8a6', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const }}>
                              {actualizando === p.id ? <Spinner className="w-3 h-3 border-white border-t-transparent" /> : <CheckCircle2 style={{ width: 11, height: 11 }} />}
                              Listo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de Detalle del Pedido */}
      <Modal open={showDetalle} onClose={() => setShowDetalle(false)} title="Detalle del pedido" size="lg">
        {pedidoDetalle && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'ID', value: <span style={{ fontFamily: 'monospace' }}>{pedidoDetalle.id}</span> },
                { label: 'Estado', value: <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_PEDIDO_COLOR[pedidoDetalle.estado as EstadoPedido], backgroundColor: `${ESTADO_PEDIDO_COLOR[pedidoDetalle.estado as EstadoPedido]}18`, padding: '3px 10px', borderRadius: 999 }}>{ESTADO_PEDIDO_LABEL[pedidoDetalle.estado as EstadoPedido]}</span> },
                { label: 'Cliente', value: <div><p style={{ fontWeight: 500, margin: 0 }}>{pedidoDetalle.cliente?.nombre} {pedidoDetalle.cliente?.apellido}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{pedidoDetalle.cliente?.email}</p></div> },
                { label: 'Dirección', value: pedidoDetalle.direccion ? <div><p style={{ margin: 0 }}>{pedidoDetalle.direccion.calle} {pedidoDetalle.direccion.numero}, {pedidoDetalle.direccion.colonia}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{pedidoDetalle.direccion.ciudad}, {pedidoDetalle.direccion.estado}</p></div> : <span style={{ color: 'var(--text-hint)' }}>Sin dirección</span> },
                { label: 'Creado', value: formatDate(pedidoDetalle.createdAt) },
                { label: 'Recolección', value: formatDate(pedidoDetalle.fechaRecoleccion) },
              ].map((row, idx) => (
                <div key={idx}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</p>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{row.value}</div>
                </div>
              ))}
            </div>
            
            {/* Prendas */}
            {pedidoDetalle.prendas && pedidoDetalle.prendas.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prendas ({pedidoDetalle.totalPrendas})</h3>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'var(--bg-muted)' }}>
                      <tr>
                        {['Tipo', 'Cant.', 'Precio', 'Subtotal'].map((h, idx) => (
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
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>{formatCurrency(pedidoDetalle.prendas.reduce((a: number, p: any) => a + p.precio * p.cantidad, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
            
            {/* Historial */}
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
                        <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '4px 0 0 0' }}>{formatDate(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* Modal de Asignar Repartidor */}
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