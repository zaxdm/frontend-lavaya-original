'use client';
// components/ui/AvatarUpload.tsx
// Componente reutilizable para subir foto de perfil a Cloudinary.
// Muestra el avatar actual, botón de cámara, spinner durante la subida
// y llama a onSuccess(url) cuando termina.

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { uploadImagen } from '@/lib/api';
import toast from 'react-hot-toast';

interface AvatarUploadProps {
  /** URL actual de la foto (puede ser null/undefined si no tiene) */
  currentUrl?: string | null;
  /** Iniciales de fallback (ej: "JS" para Juan Suárez) */
  initials?: string;
  /** Gradiente para el avatar de iniciales */
  gradient?: string;
  /** Tamaño en px del círculo del avatar */
  size?: number;
  /** Callback con la nueva URL tras subir exitosamente */
  onSuccess: (url: string) => void;
}

export default function AvatarUpload({
  currentUrl,
  initials = '?',
  gradient = 'linear-gradient(135deg,#3b82f6,#6366f1)',
  size = 96,
  onSuccess,
}: AvatarUploadProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const url = preview ?? currentUrl;

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview inmediato antes de subir
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setLoading(true);
    try {
      const { url: newUrl } = await uploadImagen('/upload/foto-perfil', file);
      setPreview(newUrl);
      onSuccess(newUrl);
      toast.success('Foto actualizada');
    } catch (err: unknown) {
      setPreview(null); // revertir preview
      toast.error(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setLoading(false);
      // Limpiar el input para poder seleccionar el mismo archivo de nuevo
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div
      style={{ position: 'relative', width: size, height: size, cursor: 'pointer' }}
      onClick={() => !loading && inputRef.current?.click()}
      title="Cambiar foto de perfil"
    >
      {/* Avatar */}
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '3px solid rgba(255,255,255,0.25)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Foto de perfil"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: size * 0.35, fontWeight: 700, color: '#fff' }}>
            {initials}
          </span>
        )}
      </div>

      {/* Botón cámara / spinner */}
      <div style={{
        position: 'absolute', bottom: 2, right: 2,
        width: size * 0.33, height: size * 0.33, borderRadius: '50%',
        backgroundColor: '#0ea5e9', border: '2px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(14,165,233,0.5)',
        transition: 'transform 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {loading
          ? <Loader2 style={{ width: size * 0.17, height: size * 0.17, color: '#fff', animation: 'spin 1s linear infinite' }} />
          : <Camera style={{ width: size * 0.17, height: size * 0.17, color: '#fff' }} />}
      </div>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
