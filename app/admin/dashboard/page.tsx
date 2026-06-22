'use client';
// app/admin/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { ShoppingBag, Users, TrendingUp, Truck, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import type { DashboardStats, PedidosPorDia, IngresosPorDia } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import StatCard from '@/components/ui/StatCard';
import PageHeader from '@/components/ui/PageHeader';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pedidosDia, setPedidosDia] = useState<PedidosPorDia[]>([]);
  const [ingresosDia, setIngresosDia] = useState<IngresosPorDia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esperar a que la autenticación esté resuelta y el usuario sea ADMIN
    if (authLoading || !user) return;

    const load = async () => {
      try {
        const [s, pd, id] = await Promise.all([
          adminApi.getStats(),
          adminApi.getPedidosPorDia(14),
          adminApi.getIngresosPorDia(14),
        ]);
        setStats(s); setPedidosDia(pd); setIngresosDia(id);
      } catch { toast.error('Error cargando el dashboard'); }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [authLoading, user]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center ly-page"><Spinner className="w-8 h-8" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col ly-page">
      <PageHeader title="Dashboard" subtitle="Métricas en tiempo real — actualización cada 60 s" />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pedidos hoy" value={stats?.pedidos.hoy ?? 0} sub={`${stats?.pedidos.esteMes ?? 0} este mes`} icon={ShoppingBag} iconColor="text-blue-600" />
          <StatCard title="Ingresos hoy" value={formatCurrency(stats?.ingresos.hoy ?? 0)} sub={`${formatCurrency(stats?.ingresos.esteMes ?? 0)} este mes`} icon={TrendingUp} iconColor="text-green-600" />
          <StatCard title="Repartidores activos" value={stats?.repartidoresDisponibles ?? 0} sub={`de ${stats?.usuarios.repartidores ?? 0} totales`} icon={Truck} iconColor="text-indigo-600" />
          <StatCard title="Clientes registrados" value={stats?.usuarios.clientes ?? 0} sub={`${stats?.usuarios.total ?? 0} usuarios totales`} icon={Users} iconColor="text-purple-600" />
        </div>

        {/* Estado badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pendientes',     count: stats?.pedidos.pendientes ?? 0, icon: Clock,        bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', num: 'text-yellow-900 dark:text-yellow-100' },
            { label: 'En proceso',     count: stats?.pedidos.enProceso ?? 0,  icon: ClipboardList, bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', num: 'text-purple-900 dark:text-purple-100' },
            { label: 'Total histórico',count: stats?.pedidos.total ?? 0,      icon: CheckCircle2,  bg: 'bg-green-500/10 border-green-500/30',   text: 'text-green-600 dark:text-green-400',  num: 'text-green-900 dark:text-green-100' },
            { label: 'Ingresos totales',count: formatCurrency(stats?.ingresos.total ?? 0), icon: TrendingUp, bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', num: 'text-blue-900 dark:text-blue-100' },
          ].map(({ label, count, icon: Icon, bg, text, num }) => (
            <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
              <Icon className={`w-8 h-8 flex-shrink-0 ${text}`} />
              <div>
                <p className={`text-2xl font-bold ${num}`}>{count}</p>
                <p className={`text-xs font-medium ${text}`}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ly-card rounded-xl border p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Pedidos — últimos 14 días</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={pedidosDia} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEntregados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tickFormatter={(v) => formatDateShort(v).slice(0, 6)} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, name) => [v as string, name === 'total' ? 'Total' : 'Entregados'] as [string, string]} labelFormatter={(l) => formatDateShort(l)} contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#gTotal)" strokeWidth={2} name="total" />
                <Area type="monotone" dataKey="entregados" stroke="#22c55e" fill="url(#gEntregados)" strokeWidth={2} name="entregados" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="ly-card rounded-xl border p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Ingresos — últimos 14 días (PE)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ingresosDia} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tickFormatter={(v) => formatDateShort(v).slice(0, 6)} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [formatCurrency(v as number)] as [string]} labelFormatter={(l) => formatDateShort(l)} contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                <Bar dataKey="ingresoPaypal" name="PayPal" fill="#6366f1" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="ingresoEfectivo" name="Efectivo" fill="#22c55e" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
