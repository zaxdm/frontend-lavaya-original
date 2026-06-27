'use client';
// app/admin/pedidos/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, RefreshCw, Eye, UserCheck } from 'lucide-react';
import { adminApi, pedidosApi } from '@/lib/api';
import {
  ESTADO_PEDIDO_LABEL, ESTADO_PEDIDO_COLOR,
  ESTADO_PEDIDO_LABEL_SIMPLE, GRUPO_ESTADO,
  ESTADO_PAGO_LABEL, ESTADO_PAGO_COLOR,
  formatDate, formatCurrency, cn,
} from '@/lib/utils';
import type { Pedido, EstadoPedido, Repartidor } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';

const ESTADOS: EstadoPedido[] = ['PENDIENTE','CONFIRMADO','RECOLECTADO','EN_PROCESO','LISTO','EN_CAMINO','ENTREGADO','CANCELADO'];

// Grupos para el filtro rápido del admin
const GRUPOS_ADMIN = [
  { value: '',          label: 'Todos' },
  { value: 'recibido',  label: 'Recibido' },
  { value: 'lavando',   label: 'Lavando' },
  { value: 'listo',     label: 'Listo' },
  { value: 'camino',    label: 'En camino' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

// Estilos inline con variables CSS — funcionan con cualquier versión de Tailwind
const S = {
  page:    { backgroundColor: 'var(--bg-base)', flex: 1, display: 'flex', flexDirection: 'column' as const },
  card:    { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  toolbar: { backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 12 },
  thead:   { backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' },
  th:      { padding: '12px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const },
  td:      { padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 },
  input:   { paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%' },
  select:  { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' },
  btnSm:   { padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  btnPage: { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' },
  empty:   { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--text-hint)' },
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [pedidoAsignar, setPedidoAsignar] = useState<Pedido | null>(null);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [repartidorSel, setRepartidorSel] = useState('');
  const [tipoAsignacion, setTipoAsignacion] = useState<'recoleccion' | 'entrega'>('recoleccion');
  const [showAsignar, setShowAsignar] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (filtroEstado) params.estado = filtroEstado;
      const res = await adminApi.getPedidos(params);
      setPedidos(res.pedidos); setTotal(res.paginacion.total); setTotalPages(res.paginacion.totalPaginas);
    } catch { toast.error('Error cargando pedidos'); }
    finally { setLoading(false); }
  }, [page, filtroEstado]);

  useEffect(() => { load(); }, [load]);

  const verDetalle = async (pedido: Pedido) => {
    try { const full = await pedidosApi.get(pedido.id); setPedidoDetalle(full); setShowDetalle(true); }
    catch { toast.error('Error cargando detalle'); }
  };

  const abrirAsignar = async (pedido: Pedido) => {
    setPedidoAsignar(pedido); setRepartidorSel('');
    try { const lista = await adminApi.getRepartidores('DISPONIBLE'); setRepartidores(lista); }
    catch { toast.error('Error cargando repartidores'); }
    setShowAsignar(true);
  };

  const confirmarAsignacion = async () => {
    if (!pedidoAsignar || !repartidorSel) { toast.error('Selecciona un repartidor'); return; }
    setSaving(true);
    try { await adminApi.asignarRepartidor(pedidoAsignar.id, repartidorSel, tipoAsignacion); toast.success('Repartidor asignado'); setShowAsignar(false); load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error al asignar'); }
    finally { setSaving(false); }
  };

  const pedidosFiltrados = pedidos.filter(p => {
    const matchBuscar = !buscar || p.id.includes(buscar) || p.cliente?.nombre?.toLowerCase().includes(buscar.toLowerCase()) || p.cliente?.email?.toLowerCase().includes(buscar.toLowerCase());
    // filtroEstado puede ser un grupo ('recibido','lavando',...) o un estado exacto ('PENDIENTE',...)
    const isGrupo = GRUPOS_ADMIN.some(g => g.value === filtroEstado && g.value !== '');
    const matchEstado = !filtroEstado ||
      (isGrupo ? GRUPO_ESTADO[p.estado as EstadoPedido] === filtroEstado : p.estado === filtroEstado);
    return matchBuscar && matchEstado;
  });

  return (
    <div style={S.page}>
      <PageHeader title="Gestión de Pedidos" subtitle={`${total} pedidos en total`} />

      {/* Filtros */}
      <div style={S.toolbar}>
        <div className="relative" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-hint)' }} />
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por cliente o ID..." style={S.input} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter className="w-4 h-4" style={{ color: 'var(--text-hint)' }} />
          <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1); }} style={S.select}>
            <option value="">Todos los estados</option>
            {GRUPOS_ADMIN.slice(1).map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            <option disabled>──────────</option>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_PEDIDO_LABEL[e]} (detalle)</option>)}
          </select>
        </div>
        <button onClick={load} style={S.btnSm}><RefreshCw className="w-3.5 h-3.5" /> Actualizar</button>
      </div>

      {/* Tabla */}
      <div className="flex-1 p-6">
        <div style={S.card}>
          {loading ? (
            <div style={S.empty}><Spinner className="w-8 h-8" /></div>
          ) : pedidosFiltrados.length === 0 ? (
            <div style={S.empty}><Search className="w-10 h-10 mb-2" /><p style={{ fontSize: 14 }}>No se encontraron pedidos</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={S.thead}>
                  <tr>
                    {['ID','Cliente','Prendas','Estado','Pago','Repartidor','Fecha','Acciones'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>#{p.id.slice(0,8)}</span></td>
                      <td style={S.td}>
                        <p style={{ fontWeight: 500 }}>{p.cliente?.nombre} {p.cliente?.apellido}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.cliente?.email}</p>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 600 }}>{p.totalPrendas}</span>
                        {p.tienePrendasExtra && <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">+cargo</span>}
                      </td>
                      <td style={S.td}>
                        <Badge className={ESTADO_PEDIDO_COLOR[p.estado]}>{ESTADO_PEDIDO_LABEL_SIMPLE[p.estado]}</Badge>
                        <p style={{ fontSize: 10, color: 'var(--text-hint)', margin: '3px 0 0' }}>{ESTADO_PEDIDO_LABEL[p.estado]}</p>
                      </td>
                      <td style={S.td}>
                        {p.pago ? (
                          <div>
                            <Badge className={ESTADO_PAGO_COLOR[p.pago.estado]}>{ESTADO_PAGO_LABEL[p.pago.estado]}</Badge>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{formatCurrency(p.pago.monto)} · {p.pago.metodoPago}</p>
                          </div>
                        ) : <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>Sin pago</span>}
                      </td>
                      <td style={{ ...S.td, fontSize: 13, color: 'var(--text-secondary)' }}>
                        {p.repartidorRecoleccion ? `${p.repartidorRecoleccion.usuario.nombre} ${p.repartidorRecoleccion.usuario.apellido}` : <span style={{ color: 'var(--text-hint)' }}>Sin asignar</span>}
                      </td>
                      <td style={{ ...S.td, fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(p.createdAt)}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => verDetalle(p)} title="Ver detalle" className="p-1.5 rounded-lg transition-colors hover:bg-blue-50 hover:text-blue-600" style={{ color: 'var(--text-secondary)' }}><Eye className="w-4 h-4" /></button>
                          {['PENDIENTE','CONFIRMADO'].includes(p.estado) && !p.repartidorRecoleccionId && (
                            <button onClick={() => abrirAsignar(p)} title="Asignar repartidor" className="p-1.5 rounded-lg transition-colors hover:bg-green-50 hover:text-green-600" style={{ color: 'var(--text-secondary)' }}><UserCheck className="w-4 h-4" /></button>
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Página {page} de {totalPages} · {total} pedidos</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...S.btnPage, opacity: page <= 1 ? 0.4 : 1 }}>Anterior</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...S.btnPage, opacity: page >= totalPages ? 0.4 : 1 }}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalle */}
      <Modal open={showDetalle} onClose={() => setShowDetalle(false)} title="Detalle del pedido" size="lg">
        {pedidoDetalle && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'ID', value: <span style={{ fontFamily: 'monospace' }}>{pedidoDetalle.id}</span> },
                { label: 'Estado', value: <Badge className={ESTADO_PEDIDO_COLOR[pedidoDetalle.estado]}>{ESTADO_PEDIDO_LABEL[pedidoDetalle.estado]}</Badge> },
                { label: 'Cliente', value: <><p style={{ fontWeight: 500 }}>{pedidoDetalle.cliente?.nombre} {pedidoDetalle.cliente?.apellido}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pedidoDetalle.cliente?.email}</p></> },
                { label: 'Dirección', value: <><p>{pedidoDetalle.direccion?.calle} {pedidoDetalle.direccion?.numero}, {pedidoDetalle.direccion?.colonia}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pedidoDetalle.direccion?.ciudad}, {pedidoDetalle.direccion?.estado}</p></> },
                { label: 'Creado', value: formatDate(pedidoDetalle.createdAt) },
                { label: 'Recolección', value: formatDate(pedidoDetalle.fechaRecoleccion) },
              ].map(row => (
                <div key={row.label}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{row.label}</p>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{row.value}</div>
                </div>
              ))}
            </div>

            {/* Prendas */}
            {pedidoDetalle.prendas && pedidoDetalle.prendas.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Prendas ({pedidoDetalle.totalPrendas})</h3>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'var(--bg-muted)' }}>
                      <tr>{['Tipo','Cant.','Precio','Subtotal'].map(h => <th key={h} style={{ ...S.th, padding: '8px 12px' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {pedidoDetalle.prendas.map(pr => (
                        <tr key={pr.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ ...S.td, padding: '8px 12px', textTransform: 'capitalize' }}>{pr.tipo}</td>
                          <td style={{ ...S.td, padding: '8px 12px' }}>{pr.cantidad}</td>
                          <td style={{ ...S.td, padding: '8px 12px' }}>{formatCurrency(pr.precio)}</td>
                          <td style={{ ...S.td, padding: '8px 12px', fontWeight: 600 }}>{formatCurrency(pr.precio * pr.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: 'var(--bg-muted)', borderTop: '1px solid var(--border)' }}>
                      <tr>
                        <td colSpan={3} style={{ ...S.td, padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Total</td>
                        <td style={{ ...S.td, padding: '8px 12px', fontWeight: 700 }}>{formatCurrency(pedidoDetalle.prendas.reduce((a, p) => a + p.precio * p.cantidad, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Historial */}
            {pedidoDetalle.historial && pedidoDetalle.historial.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Historial</h3>
                <div className="space-y-2">
                  {pedidoDetalle.historial.map(h => (
                    <div key={h.id} className="flex items-start gap-3" style={{ fontSize: 13 }}>
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ESTADO_PEDIDO_LABEL[h.estado]}</span>
                        {h.nota && <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>— {h.nota}</span>}
                        <p style={{ fontSize: 11, color: 'var(--text-hint)' }}>{formatDate(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Asignar */}
      <Modal open={showAsignar} onClose={() => setShowAsignar(false)} title="Asignar repartidor" size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Tipo de asignación</label>
            <select value={tipoAsignacion} onChange={e => setTipoAsignacion(e.target.value as 'recoleccion' | 'entrega')} style={{ ...S.select, width: '100%' }}>
              <option value="recoleccion">Recolección</option>
              <option value="entrega">Entrega</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Repartidor disponible</label>
            {repartidores.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-hint)', fontStyle: 'italic' }}>No hay repartidores disponibles</p>
              : <select value={repartidorSel} onChange={e => setRepartidorSel(e.target.value)} style={{ ...S.select, width: '100%' }}>
                  <option value="">Seleccionar...</option>
                  {repartidores.map(r => <option key={r.id} value={r.id}>{r.usuario?.nombre} {r.usuario?.apellido} — ⭐ {r.calificacionPromedio.toFixed(1)}</option>)}
                </select>}
          </div>
          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button onClick={() => setShowAsignar(false)} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmarAsignacion} disabled={saving || !repartidorSel} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: saving || !repartidorSel ? '#93c5fd' : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
              Asignar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
