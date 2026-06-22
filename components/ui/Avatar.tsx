'use client';
// components/ui/Avatar.tsx
// Muestra la foto del usuario si es una URL subida por él (data: o blob:).
// Para todo lo demás (ui-avatars, null, undefined) → iniciales con color determinista.

function colorForName(nombre: string, apellido: string): string {
  const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#f59e0b,#f97316)',
    'linear-gradient(135deg,#10b981,#14b8a6)',
    'linear-gradient(135deg,#3b82f6,#6366f1)',
    'linear-gradient(135deg,#ef4444,#f97316)',
    'linear-gradient(135deg,#0ea5e9,#6366f1)',
    'linear-gradient(135deg,#7c3aed,#a855f7)',
    'linear-gradient(135deg,#06b6d4,#3b82f6)',
    'linear-gradient(135deg,#84cc16,#10b981)',
  ];
  const seed = (nombre + apellido).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[seed % GRADIENTS.length];
}

interface AvatarProps {
  /** Sólo se usa si es una foto subida por el usuario (data: URL) */
  src?: string | null;
  nombre: string;
  apellido: string;
  size?: number;
  /** Sobrescribe el gradiente calculado */
  gradient?: string;
}

export default function Avatar({ src, nombre, apellido, size = 36, gradient }: AvatarProps) {
  const initials = `${(nombre?.[0] ?? '').toUpperCase()}${(apellido?.[0] ?? '').toUpperCase()}`;
  const bg = gradient ?? colorForName(nombre, apellido);

  // Solo usar imagen real si el cliente subió una (base64 / blob)
  const isRealPhoto = src && (src.startsWith('data:') || src.startsWith('blob:'));

  if (isRealPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${nombre} ${apellido}`}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    );
  }

  // Iniciales con gradiente de color
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: Math.max(10, Math.floor(size * 0.36)),
      flexShrink: 0,
      userSelect: 'none',
      letterSpacing: '0.02em',
    }}>
      {initials || '?'}
    </div>
  );
}
