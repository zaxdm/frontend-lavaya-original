// app/cliente/historial/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pedidosApi } from '@/lib/api';
import type { Pedido } from '@/types';

export default function HistorialDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [pedido, setPedido] = useState<Pedido | null>(null);
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
        if (err.status === 404) {
          setError('Pedido no encontrado');
        } else if (err.status === 401) {
          setError('Tu sesión expiró. Inicia sesión de nuevo.');
        } else {
          setError(err.message || 'Ocurrió un error inesperado');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPedido();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p className="text-gray-500">Cargando detalle del pedido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push('/cliente/historial')}
          className="text-blue-600 underline"
        >
          Volver al historial
        </button>
      </div>
    );
  }

  if (!pedido) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => router.push('/cliente/historial')}
        className="mb-4 text-blue-600 underline text-sm"
      >
        ← Volver al historial
      </button>

      <h1 className="text-2xl font-bold mb-2">Pedido #{pedido.id}</h1>
      {/* Ajusta los campos siguientes según tu tipo Pedido real en types.ts */}
      <p className="text-gray-600 mb-1">Estado: <span className="font-semibold">{pedido.estado}</span></p>
    </div>
  );
}