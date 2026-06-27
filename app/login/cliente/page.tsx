'use client';
// app/login/cliente/page.tsx — Redirección permanente al login unificado
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClienteLoginRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/ingresar'); }, [router]);
  return null;
}
