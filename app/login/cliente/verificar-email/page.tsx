'use client';
// app/login/cliente/verificar-email/page.tsx — Redirección al nuevo verificar-email
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  useEffect(() => {
    router.replace(`/ingresar/verificar-email${email ? `?email=${encodeURIComponent(email)}` : ''}`);
  }, [router, email]);
  return null;
}

export default function VerificarEmailRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  );
}
