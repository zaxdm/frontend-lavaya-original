'use client';
// app/empleado/catalogo/page.tsx — Catálogo de prendas con crear/editar/toggle
import { useEffect, useState, useCallback } from 'react';
import { Package, RefreshCw, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { empleadoApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { CatalogoPrenda } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';

const PRENDA_VACIA = {
  nombre: '',
  descripcion: '',
  precioUnitario: 0,
  precioExtra: 0,
  activo: true,
};

export default function EmpleadoCatalogoPage() {
  const [catalogo, setCatalogo] = useState<CatalogoPrenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<CatalogoPrenda | null>(null);
  const [form, setForm] = useState(PRENDA_VACIA);
  const [saving, setSaving] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await empleadoApi.getCatalogo(true); // traer activos e inactivos
      setCatalogo(data);
    } catch {
      toast.error('Error cargando catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const abrirCrear = () => {
    setEditando(null);
    setForm(PRENDA_VACIA);
    setShowModal(true);
  };

  const abrirEditar = (p: CatalogoPrenda) => {
    setEditando(p);
    setForm({
      nombre:          p.nombre,
      descripcion:     p.descripcion ?? '',
      precioUnitario:  p.precioUnitario,
      precioExtra:     p.precioExtra,
      activo:          p.activo,
    });
    setShowModal(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (form.precioUnitario <= 0) { toast.error('El precio base debe ser mayor a 0'); return; }
    setSaving(true);
    try {
      if (editando) {
        await empleadoApi.actualizarPrenda(editando.id, {
          nombre:         form.nombre.toLowerCase().trim(),
          descripcion:    form.descripcion || undefined,
          precioUnitario: form.precioUnitario,
          precioExtra:    form.precioExtra,
          activo:         form.activo,
        });
        toast.success('Prenda actualizada');
      } else {
        await empleadoApi.crearPrenda({
          nombre:         form.nombre.toLowerCase().trim(),
          descripcion:    form.descripcion || undefined,
          precioUnitario: form.precioUnitario,
          precioExtra:    form.precioExtra,
        });
        toast.success('Prenda creada');
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (p: CatalogoPrenda) => {
    try {
      await empleadoApi.actualizarPrenda(p.id, { activo: !p.activo });
      toast.success(`Prenda ${!p.activo ? 'activada' : 'desactivada'}`);
      load();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const visibles = mostrarTodos ? catalogo : catalogo.filter(p => p.activo);
  const activos  = catalogo.filter(p => p.activo).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader
        title="Catálogo de prendas"
        subtitle={`${activos} activas · ${catalogo.length} total`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={load}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
            </button>
            <button
              onClick={abrirCrear}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', backgroundColor: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Nueva prenda
            </button>
          </div>
        }
      />

      <div style={{ padding: 24, flex: 1 }}>
        {/* Filtro activos/todos */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Todas', value: true  },
            { label: 'Solo activas', value: false },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setMostrarTodos(opt.value)}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${mostrarTodos === opt.value ? '#7c3aed' : 'var(--border)'}`,
                backgroundColor: mostrarTodos === opt.value ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                color: mostrarTodos === opt.value ? '#7c3aed' : 'var(--text-secondary)',
                fontWeight: mostrarTodos === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Info */}
        <div style={{ backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Package style={{ width: 16, height: 16, color: '#7c3aed', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Precio base aplica para pedidos de hasta 10 prendas. El <strong>cargo extra</strong> se suma al precio base en pedidos con más de 10 prendas.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spinner className="w-8 h-8" />
          </div>
        ) : visibles.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', color: 'var(--text-hint)' }}>
            <Package style={{ width: 40, height: 40 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No hay prendas en el catálogo</p>
            <button onClick={abrirCrear} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', backgroundColor: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus style={{ width: 14, height: 14 }} /> Crear primera prenda
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                  {['Prenda', 'Descripción', 'Precio base', 'Cargo +10', 'Total +10', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: i < visibles.length - 1 ? '1px solid var(--border)' : 'none', opacity: p.activo ? 1 : 0.55 }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Prenda */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package style={{ width: 16, height: 16, color: '#7c3aed' }} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{p.nombre}</span>
                      </div>
                    </td>
                    {/* Descripción */}
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 180 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.descripcion || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>—</span>}
                      </span>
                    </td>
                    {/* Precio base */}
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(p.precioUnitario)}
                    </td>
                    {/* Cargo extra */}
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, color: p.precioExtra > 0 ? '#d97706' : 'var(--text-hint)' }}>
                      {p.precioExtra > 0 ? `+${formatCurrency(p.precioExtra)}` : '—'}
                    </td>
                    {/* Total +10 */}
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {p.precioExtra > 0
                        ? <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.precioUnitario + p.precioExtra)}</strong>
                        : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    {/* Estado */}
                    <td style={{ padding: '13px 16px' }}>
                      <Badge className={p.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    {/* Acciones */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => abrirEditar(p)}
                          title="Editar"
                          style={{ padding: '6px', borderRadius: 7, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(124,58,237,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#7c3aed'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                        >
                          <Pencil style={{ width: 15, height: 15 }} />
                        </button>
                        <button
                          onClick={() => toggleActivo(p)}
                          title={p.activo ? 'Desactivar' : 'Activar'}
                          style={{ padding: '6px', borderRadius: 7, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          {p.activo
                            ? <ToggleRight style={{ width: 20, height: 20, color: '#22c55e' }} />
                            : <ToggleLeft style={{ width: 20, height: 20, color: '#ef4444' }} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Nota cargo extra */}
        <div style={{ marginTop: 16, backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', display: 'flex', gap: 8 }}>
          <span>ℹ</span>
          <span>El <strong>cargo extra</strong> se aplica automáticamente cuando un pedido supera las 10 prendas. Se suma al precio base de cada prenda.</span>
        </div>
      </div>

      {/* Modal crear / editar */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editando ? `Editar — ${editando.nombre}` : 'Nueva prenda'}
        size="sm"
      >
        <form onSubmit={handleGuardar} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Nombre */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nombre del tipo de prenda *
            </label>
            <input
              required
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value.toLowerCase() }))}
              placeholder="camisa, pantalon, vestido..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>Se guarda en minúsculas automáticamente</p>
          </div>

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Descripción (opcional)
            </label>
            <input
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción breve..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Precios en fila */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Precio base (PE) *
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.precioUnitario || ''}
                onChange={e => setForm(p => ({ ...p, precioUnitario: Number(e.target.value) }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cargo extra (+10)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precioExtra || ''}
                onChange={e => setForm(p => ({ ...p, precioExtra: Number(e.target.value) }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Preview de precios */}
          {form.precioUnitario > 0 && (
            <div style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Precio normal:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(form.precioUnitario)}/prenda</strong>
              </div>
              {form.precioExtra > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#d97706' }}>Con cargo extra (+10):</span>
                  <strong style={{ color: '#d97706' }}>{formatCurrency(form.precioUnitario + form.precioExtra)}/prenda</strong>
                </div>
              )}
            </div>
          )}

          {/* Toggle activo (solo al editar) */}
          {editando && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Prenda activa</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {form.activo ? 'Visible para los clientes' : 'Oculta para los clientes'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: form.activo ? '#22c55e' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}
              >
                {form.activo
                  ? <ToggleRight style={{ width: 26, height: 26 }} />
                  : <ToggleLeft style={{ width: 26, height: 26 }} />}
                {form.activo ? 'Activa' : 'Inactiva'}
              </button>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', backgroundColor: saving ? '#c4b5fd' : '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {saving && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
              {editando ? 'Guardar cambios' : 'Crear prenda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
