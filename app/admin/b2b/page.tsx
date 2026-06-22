'use client';
// app/(admin)/b2b/page.tsx — Gestión de Empresas B2B y contratos
import { useEffect, useState, useCallback } from 'react';
import {
  Building2, Plus, ToggleLeft, ToggleRight,
  FileText, ChevronRight, Search,
} from 'lucide-react';
import { b2bApi } from '@/lib/api';
import { formatDate, formatCurrency, formatDateShort } from '@/lib/utils';
import type { EmpresaB2B, ContratoB2B } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export default function B2BPage() {
  const [empresas, setEmpresas] = useState<EmpresaB2B[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');

  // Modal nueva empresa
  const [showCrear, setShowCrear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '', rfc: '', email: '', telefono: '',
    direccion: '', descuentoFijo: 0, limiteCredito: 0,
  });

  // Modal contrato
  const [empresaSel, setEmpresaSel] = useState<EmpresaB2B | null>(null);
  const [showContrato, setShowContrato] = useState(false);
  const [contrato, setContrato] = useState<ContratoB2B | null>(null);
  const [loadingContrato, setLoadingContrato] = useState(false);
  const [formContrato, setFormContrato] = useState({
    fechaInicio: '', fechaFin: '', pedidosMensuales: 0, condiciones: '',
  });
  const [savingContrato, setSavingContrato] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await b2bApi.list();
      setEmpresas(data);
    } catch {
      toast.error('Error cargando empresas B2B');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActiva = async (empresa: EmpresaB2B) => {
    try {
      await b2bApi.toggleActiva(empresa.id, !empresa.activa);
      toast.success(`Empresa ${!empresa.activa ? 'activada' : 'desactivada'}`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await b2bApi.crear(form);
      toast.success('Empresa B2B creada');
      setShowCrear(false);
      setForm({ nombre: '', rfc: '', email: '', telefono: '', direccion: '', descuentoFijo: 0, limiteCredito: 0 });
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear empresa');
    } finally {
      setSaving(false);
    }
  };

  const verContrato = async (empresa: EmpresaB2B) => {
    setEmpresaSel(empresa);
    setContrato(null);
    setShowContrato(true);
    setLoadingContrato(true);
    try {
      const c = await b2bApi.getContrato(empresa.id);
      setContrato(c);
      setFormContrato({
        fechaInicio: c.fechaInicio?.slice(0, 10) ?? '',
        fechaFin: c.fechaFin?.slice(0, 10) ?? '',
        pedidosMensuales: c.pedidosMensuales,
        condiciones: c.condiciones ?? '',
      });
    } catch {
      // No hay contrato aún — formulario vacío para crear
    } finally {
      setLoadingContrato(false);
    }
  };

  const guardarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaSel) return;
    setSavingContrato(true);
    try {
      await b2bApi.crearContrato(empresaSel.id, formContrato);
      toast.success('Contrato guardado');
      setShowContrato(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar contrato');
    } finally {
      setSavingContrato(false);
    }
  };

  const empresasFiltradas = buscar
    ? empresas.filter(e =>
        e.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
        e.email.toLowerCase().includes(buscar.toLowerCase()) ||
        e.rfc?.toLowerCase().includes(buscar.toLowerCase()),
      )
    : empresas;

  return (
    <div className="flex-1 flex flex-col ly-page">
      <PageHeader
        title="Gestión B2B"
        subtitle={`${empresas.length} empresas registradas`}
        action={
          <button
            onClick={() => setShowCrear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva empresa
          </button>
        }
      />

      {/* Filtro */}
      <div className="px-6 py-4 ly-card border-b ly-border">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar empresa, RFC o email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 p-6 ly-page">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8" /></div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Building2 className="w-12 h-12 mb-3" />
            <p className="text-sm">No hay empresas B2B registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {empresasFiltradas.map((empresa) => (
              <div
                key={empresa.id}
                className="ly-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header empresa */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold ly-text truncate">{empresa.nombre}</p>
                        {empresa.rfc && (
                          <p className="text-xs text-slate-400 font-mono">RFC: {empresa.rfc}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={empresa.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {empresa.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>

                {/* Datos */}
                <div className="p-5 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Email</span>
                    <span className="truncate ml-2">{empresa.email}</span>
                  </div>
                  {empresa.telefono && (
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Teléfono</span>
                      <span>{empresa.telefono}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Descuento</span>
                    <span className="font-semibold text-green-700">{empresa.descuentoFijo}%</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Crédito mensual</span>
                    <span className="font-semibold">{formatCurrency(empresa.limiteCredito)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Contrato</span>
                    {empresa.contrato ? (
                      <span className={empresa.contrato.activo ? 'text-green-700 font-medium' : 'text-slate-400'}>
                        {empresa.contrato.activo ? `Activo hasta ${formatDateShort(empresa.contrato.fechaFin)}` : 'Vencido'}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Sin contrato</span>
                    )}
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Registrada</span>
                    <span className="text-xs">{formatDateShort(empresa.createdAt)}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="px-5 pb-4 flex gap-2">
                  <button
                    onClick={() => verContrato(empresa)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border ly-border text-xs font-medium text-slate-600 hover:ly-muted transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Contrato
                  </button>
                  <button
                    onClick={() => toggleActiva(empresa)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border ly-border text-xs font-medium text-slate-600 hover:ly-muted transition-colors"
                  >
                    {empresa.activa
                      ? <><ToggleRight className="w-3.5 h-3.5 text-green-600" /> Desactivar</>
                      : <><ToggleLeft className="w-3.5 h-3.5 text-red-500" /> Activar</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Empresa */}
      <Modal open={showCrear} onClose={() => setShowCrear(false)} title="Nueva empresa B2B" size="md">
        <form onSubmit={handleCrear} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre de la empresa *</label>
              <input required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">RFC</label>
              <input value={form.rfc} onChange={e => setForm(p => ({ ...p, rfc: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Descuento fijo (%)</label>
              <input type="number" min="0" max="100" value={form.descuentoFijo} onChange={e => setForm(p => ({ ...p, descuentoFijo: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Límite de crédito (PE)</label>
              <input type="number" min="0" value={form.limiteCredito} onChange={e => setForm(p => ({ ...p, limiteCredito: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Dirección</label>
              <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowCrear(false)} className="flex-1 px-4 py-2.5 rounded-lg border ly-border text-sm font-medium text-slate-600 hover:ly-muted">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium flex items-center justify-center gap-2">
              {saving && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
              Crear empresa
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Contrato */}
      <Modal open={showContrato} onClose={() => setShowContrato(false)} title={`Contrato — ${empresaSel?.nombre ?? ''}`} size="md">
        {loadingContrato ? (
          <div className="flex items-center justify-center py-10"><Spinner /></div>
        ) : (
          <form onSubmit={guardarContrato} className="p-6 space-y-4">
            {contrato && (
              <div className="ly-muted rounded-lg p-3 text-xs text-slate-600 space-y-1 border ly-border">
                <p><span className="font-medium">Contrato existente:</span> {contrato.activo ? 'Activo' : 'Inactivo'}</p>
                <p>Vigencia: {formatDateShort(contrato.fechaInicio)} → {formatDateShort(contrato.fechaFin)}</p>
                <p>Pedidos incluidos: {contrato.pedidosMensuales}/mes</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha inicio *</label>
                <input required type="date" value={formContrato.fechaInicio} onChange={e => setFormContrato(p => ({ ...p, fechaInicio: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha fin *</label>
                <input required type="date" value={formContrato.fechaFin} onChange={e => setFormContrato(p => ({ ...p, fechaFin: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Pedidos mensuales incluidos</label>
                <input type="number" min="0" value={formContrato.pedidosMensuales} onChange={e => setFormContrato(p => ({ ...p, pedidosMensuales: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Condiciones / notas</label>
                <textarea rows={3} value={formContrato.condiciones} onChange={e => setFormContrato(p => ({ ...p, condiciones: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border ly-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowContrato(false)} className="flex-1 px-4 py-2.5 rounded-lg border ly-border text-sm font-medium text-slate-600 hover:ly-muted">Cancelar</button>
              <button type="submit" disabled={savingContrato} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium flex items-center justify-center gap-2">
                {savingContrato && <Spinner className="w-4 h-4 border-white border-t-transparent" />}
                {contrato ? 'Actualizar contrato' : 'Crear contrato'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
