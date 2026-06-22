'use client';
// app/admin/catalogo/page.tsx — Gestión del catálogo de prendas
import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import { adminApi } from '@/lib/api';
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

export default function CatalogoPage() {
  const [catalogo, setCatalogo] = useState<CatalogoPrenda[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal crear / editar
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<CatalogoPrenda | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(PRENDA_VACIA);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getCatalogo();
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

  const abrirEditar = (prenda: CatalogoPrenda) => {
    setEditando(prenda);
    setForm({
      nombre: prenda.nombre,
      descripcion: prenda.descripcion ?? '',
      precioUnitario: prenda.precioUnitario,
      precioExtra: prenda.precioExtra,
      activo: prenda.activo,
    });
    setShowModal(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await adminApi.actualizarPrenda(editando.id, form);
        toast.success('Prenda actualizada');
      } else {
        await adminApi.crearPrenda(form);
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

  const toggleActivo = async (prenda: CatalogoPrenda) => {
    try {
      await adminApi.actualizarPrenda(prenda.id, { activo: !prenda.activo });
      toast.success(`Prenda ${!prenda.activo ? 'activada' : 'desactivada'}`);
      load();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  return (
    <div className="flex-1 flex flex-col ly-page">
      <PageHeader
        title="Catálogo de Prendas"
        subtitle={`${catalogo.length} tipos de prenda registrados`}
        action={
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva prenda
          </button>
        }
      />

      <div className="flex-1 p-6 ly-page">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-8 h-8" />
          </div>
        ) : catalogo.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Package className="w-12 h-12 mb-3" />
            <p className="text-sm">No hay prendas en el catálogo</p>
          </div>
        ) : (
          <div className="ly-card rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b ly-muted">
                  {['Tipo de prenda', 'Descripción', 'Precio base', 'Cargo extra (+10)', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold ly-text-2 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y ly-border">
                {catalogo.map((p) => (
                  <tr key={p.id} className="hover:ly-muted transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-semibold ly-text capitalize">{p.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 ly-text-2 max-w-xs truncate">
                      {p.descripcion || <span className="italic text-slate-300">Sin descripción</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold ly-text">{formatCurrency(p.precioUnitario)}</span>
                      <span className="text-xs text-slate-400 ml-1">/prenda</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.precioExtra > 0 ? (
                        <span className="font-medium text-orange-600">+{formatCurrency(p.precioExtra)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={p.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => abrirEditar(p)}
                          title="Editar"
                          className="p-1.5 rounded-lg ly-text-2 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActivo(p)}
                          title={p.activo ? 'Desactivar' : 'Activar'}
                          className="p-1.5 rounded-lg ly-text-2 hover:bg-slate-100 transition-colors"
                        >
                          {p.activo
                            ? <ToggleRight className="w-5 h-5 text-green-600" />
                            : <ToggleLeft className="w-5 h-5 text-red-400" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info sobre cargo extra */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm">
          <span className="text-amber-600 text-base flex-shrink-0">ℹ</span>
          <div>
            <p className="font-semibold text-amber-900">¿Qué es el cargo extra?</p>
            <p className="text-amber-700 mt-0.5">
              Se aplica automáticamente al precio unitario cuando un pedido supera las <strong>10 prendas</strong>.
              Por ejemplo: si el precio base es S/25 y el cargo extra es S/5, prendas en pedidos de +10 costarán S/30 cada una.
            </p>
          </div>
        </div>
      </div>

      {/* Modal crear / editar */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editando ? `Editar — ${editando.nombre}` : 'Nueva prenda'}
        size="sm"
      >
        <form onSubmit={handleGuardar} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nombre del tipo de prenda *
            </label>
            <input
              required
              type="text"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value.toLowerCase() }))}
              placeholder="camisa, pantalon, vestido..."
              className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Se guarda en minúsculas automáticamente</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción breve..."
              className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Precio base (PE) *
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.precioUnitario}
                onChange={e => setForm(p => ({ ...p, precioUnitario: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cargo extra +10 prendas
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precioExtra}
                onChange={e => setForm(p => ({ ...p, precioExtra: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Vista previa */}
          {form.precioUnitario > 0 && (
            <div className="ly-muted rounded-lg p-3 text-xs text-slate-600 space-y-1 border ly-border">
              <p>Precio normal: <strong>{formatCurrency(form.precioUnitario)}</strong>/prenda</p>
              {form.precioExtra > 0 && (
                <p>Precio con cargo extra: <strong>{formatCurrency(form.precioUnitario + form.precioExtra)}</strong>/prenda</p>
              )}
            </div>
          )}

          {/* Estado (solo al editar) */}
          {editando && (
            <div className="flex items-center justify-between py-2 border-t ly-border">
              <span className="text-sm font-medium text-slate-700">Prenda activa</span>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                className="flex items-center gap-2 text-sm"
              >
                {form.activo
                  ? <ToggleRight className="w-6 h-6 text-green-600" />
                  : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                <span className={form.activo ? 'text-green-700' : 'text-slate-400'}>
                  {form.activo ? 'Activa' : 'Inactiva'}
                </span>
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2.5 rounded-lg border ly-border text-sm font-medium text-slate-600 hover:ly-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
