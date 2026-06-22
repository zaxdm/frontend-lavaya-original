// app/cliente/historial/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Pedido {
  id: string;
  estado: string;
  fecha: string;
  total: number;
  items?: {
    id: string;
    descripcion: string;
    cantidad: number;
    precio: number;
  }[];
  direccion?: string;
  repartidor?: {
    nombre: string;
    telefono?: string;
  };
}

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

        const token = localStorage.getItem('token'); // ajusta según cómo guardes el token

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/pedidos/${id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            credentials: 'include',
          }
        );

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Pedido no encontrado');
          }
          throw new Error('Error al cargar el pedido');
        }

        const data = await res.json();
        setPedido(data);
      } catch (err: any) {
        setError(err.message || 'Ocurrió un error inesperado');
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
      <p className="text-gray-600 mb-1">Fecha: {new Date(pedido.fecha).toLocaleDateString('es-PE')}</p>
      <p className="text-gray-600 mb-1">Estado: <span className="font-semibold">{pedido.estado}</span></p>
      <p className="text-gray-600 mb-4">Total: S/ {pedido.total.toFixed(2)}</p>

      {pedido.direccion && (
        <p className="text-gray-600 mb-4">Dirección de entrega: {pedido.direccion}</p>
      )}

      {pedido.repartidor && (
        <div className="mb-4">
          <p className="font-semibold">Repartidor asignado:</p>
          <p>{pedido.repartidor.nombre}</p>
          {pedido.repartidor.telefono && <p>{pedido.repartidor.telefono}</p>}
        </div>
      )}

      {pedido.items && pedido.items.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Items</h2>
          <ul className="divide-y">
            {pedido.items.map((item) => (
              <li key={item.id} className="py-2 flex justify-between">
                <span>{item.descripcion} x{item.cantidad}</span>
                <span>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}