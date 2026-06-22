'use client';
// components/layout/AppShell.tsx
// Shell responsivo compartido por Admin, Empleado y Cliente.
// En desktop: sidebar siempre visible a la izquierda.
// En móvil: topbar con botón hamburguesa + sidebar como drawer lateral.

import { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';

interface AppShellProps {
  sidebar: React.ReactNode;
  /** Título que aparece en la topbar móvil (ej: "LavaYa Admin") */
  title?: string;
  /** Color de acento para la topbar; por defecto usa --bg-sidebar */
  children: React.ReactNode;
}

export default function AppShell({ sidebar, title = 'LavaYa', children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Bloquear scroll del body cuando el drawer está abierto en móvil
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: 'var(--bg-base)' }}>

      {/* ── Overlay oscuro (solo móvil, cuando drawer abierto) ── */}
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* ── Sidebar / Drawer ─────────────────────────────────── */}
      <aside className={`app-sidebar${open ? ' open' : ''}`}>
        {/* Botón cerrar visible solo en móvil dentro del drawer */}
        <button
          onClick={close}
          aria-label="Cerrar menú"
          style={{
            display: 'none', // mostrado vía CSS en móvil
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1,
            width: 30,
            height: 30,
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="sidebar-close-btn"
        >
          <X style={{ width: 16, height: 16 }} />
        </button>

        {/* Contenido del sidebar (pasado como prop) */}
        <div onClick={close} style={{ height: '100%' }}>
          {sidebar}
        </div>
      </aside>

      {/* ── Layout principal ─────────────────────────────────── */}
      <div className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Topbar móvil ─────────────────────────────────── */}
        <header className="app-topbar">
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Abrir menú"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Menu style={{ width: 20, height: 20 }} />
          </button>

          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#ffffff',
            flex: 1,
            letterSpacing: '-0.01em',
          }}>
            {title}
          </span>
        </header>

        {/* ── Contenido de la página ───────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
