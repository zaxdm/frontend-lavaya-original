'use client';
// app/login/empleado/page.tsx — Redirección permanente al login unificado
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmpleadoLoginRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/ingresar'); }, [router]);
  return null;
}
