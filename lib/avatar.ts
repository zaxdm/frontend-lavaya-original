// lib/avatar.ts — Utilidades para avatares de usuario
// Usa ui-avatars.com para generar avatares con iniciales cuando no hay foto
export function getAvatarUrl(opts: {
  nombre: string;
  apellido: string;
  fotoPerfil?: string | null;
  size?: number;
}): string {
  const { nombre, apellido, fotoPerfil, size = 128 } = opts;

  // Si tiene foto personalizada, usarla
  if (fotoPerfil && fotoPerfil.startsWith('http')) return fotoPerfil;

  // Colores vibrantes para los avatares aleatorios (deterministas por nombre)
  const PALETTES = [
    { bg: '6366f1', fg: 'ffffff' }, // indigo
    { bg: '8b5cf6', fg: 'ffffff' }, // violet
    { bg: 'ec4899', fg: 'ffffff' }, // pink
    { bg: 'f59e0b', fg: 'ffffff' }, // amber
    { bg: '10b981', fg: 'ffffff' }, // emerald
    { bg: '3b82f6', fg: 'ffffff' }, // blue
    { bg: 'ef4444', fg: 'ffffff' }, // red
    { bg: '14b8a6', fg: 'ffffff' }, // teal
    { bg: 'f97316', fg: 'ffffff' }, // orange
    { bg: '06b6d4', fg: 'ffffff' }, // cyan
  ];

  // Elegir paleta de forma determinista basada en el nombre
  const seed = (nombre + apellido).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palette = PALETTES[seed % PALETTES.length];

  const initials = encodeURIComponent(`${nombre[0] ?? ''}${apellido[0] ?? ''}`);

  return `https://ui-avatars.com/api/?name=${initials}&size=${size}&background=${palette.bg}&color=${palette.fg}&bold=true&format=svg`;
}

// Genera una URL de avatar aleatorio decorativo (para cuando no hay usuario definido)
export function getRandomAvatar(seed: string, size = 128): string {
  const PALETTES = [
    '6366f1','8b5cf6','ec4899','f59e0b','10b981','3b82f6','ef4444','14b8a6',
  ];
  const idx = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTES.length;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&size=${size}&background=${PALETTES[idx]}&color=ffffff&bold=true&format=svg`;
}

// Grid de avatares predefinidos para el picker
export function buildPresetAvatars(nombre: string, apellido: string): string[] {
  const SEEDS = ['LY','AX','MR','JK','PQ','ZN','WS','HB','TF','CV'];
  const COLORS = [
    ['6366f1','ffffff'],['8b5cf6','ffffff'],['ec4899','ffffff'],['f59e0b','ffffff'],
    ['10b981','ffffff'],['ef4444','ffffff'],['14b8a6','ffffff'],['f97316','ffffff'],
    ['06b6d4','ffffff'],['3b82f6','ffffff'],
  ];
  const real = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre[0]+apellido[0])}&size=120&background=${COLORS[0][0]}&color=${COLORS[0][1]}&bold=true&format=svg`;
  const presets = SEEDS.map((s, i) =>
    `https://ui-avatars.com/api/?name=${s}&size=120&background=${COLORS[i][0]}&color=${COLORS[i][1]}&bold=true&format=svg`
  );
  return [real, ...presets];
}
