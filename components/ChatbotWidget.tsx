'use client';
// components/ChatbotWidget.tsx
// Widget flotante de chatbot para el portal cliente de Next.js

import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatOption {
  label: string;
  value: string;
}

interface ChatMessage {
  esBot: boolean;
  texto: string;
  opciones: ChatOption[];
  hora: Date;
  pedidoId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lavaya_access_token');
}

// Renderiza *negrita* simple
function RichText({ text, esBot }: { text: string; esBot: boolean }) {
  const color = esBot ? '#0f172a' : '#ffffff';
  const parts = text.split(/\*(.+?)\*/g);
  return (
    <span style={{ color, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ fontWeight: 700 }}>{p}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// Indicador "escribiendo..."
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 2px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#2563eb', opacity: 0.5,
          animation: `bounce 0.9s ${i * 0.15}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

export default function ChatbotWidget() {
  const [abierto, setAbierto] = useState(false);
  const [msgs, setMsgs]       = useState<ChatMessage[]>([]);
  const [input, setInput]     = useState('');
  const [cargando, setCargando] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [opcsUsadas, setOpcsUsadas] = useState(false);
  const [unread, setUnread]   = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const iniciado  = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 80);
  }, []);

  const llamarBot = useCallback(async (mensaje: string, opcion?: string) => {
    if (cargando) return;

    // Agregar mensaje del usuario a la UI
    if (opcion) {
      setMsgs(prev => {
        const last = prev[prev.length - 1];
        if (last?.esBot) {
          const opt = last.opciones.find(o => o.value === opcion);
          if (opt) {
            return [...prev, { esBot: false, texto: opt.label, opciones: [], hora: new Date() }];
          }
        }
        return prev;
      });
      setOpcsUsadas(true);
    } else if (mensaje.trim()) {
      setMsgs(prev => [...prev, { esBot: false, texto: mensaje.trim(), opciones: [], hora: new Date() }]);
      setOpcsUsadas(true);
    }

    setCargando(true);
    scrollToBottom();

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/chatbot/mensaje`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...(sessionId ? { sessionId } : {}),
          mensaje: opcion ? '' : mensaje,
          ...(opcion ? { opcion } : {}),
        }),
      });

      if (!res.ok) throw new Error('Error del servidor');
      const data = await res.json();

      if (data.sessionId) setSessionId(data.sessionId);

      const nuevoMsg: ChatMessage = {
        esBot: true,
        texto: data.text ?? '',
        opciones: data.options ?? [],
        hora: new Date(),
        pedidoId: data.pedidoId,
      };

      setMsgs(prev => [...prev, nuevoMsg]);
      setOpcsUsadas(false);

      // Notificar si el chat está cerrado
      if (!abierto) setUnread(n => n + 1);

      // Si se creó un pedido, mostrar aviso
      if (data.pedidoId) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chatbot:pedido-creado', { detail: data.pedidoId }));
        }, 300);
      }
    } catch {
      setMsgs(prev => [...prev, {
        esBot: true,
        texto: '❌ Error de conexión. Por favor intenta de nuevo.',
        opciones: [{ label: '🔄 Reintentar', value: 'menu' }],
        hora: new Date(),
      }]);
      setOpcsUsadas(false);
    } finally {
      setCargando(false);
      scrollToBottom();
    }
  }, [cargando, sessionId, abierto, scrollToBottom]);

  // Saludo inicial al abrir por primera vez
  useEffect(() => {
    if (abierto && !iniciado.current) {
      iniciado.current = true;
      llamarBot('', 'hola');
    }
    if (abierto) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [abierto, llamarBot]);

  useEffect(() => { scrollToBottom(); }, [msgs, scrollToBottom]);

  const enviarTexto = () => {
    if (!input.trim() || cargando) return;
    const txt = input.trim();
    setInput('');
    llamarBot(txt);
  };

  const hora = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const ultimoMsgBot = [...msgs].reverse().find(m => m.esBot);

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: .4; }
          50%       { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1)  translateY(0);    }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(.9); box-shadow: 0 0 0 0 rgba(37,99,235,.5); }
          70%  { transform: scale(1);  box-shadow: 0 0 0 12px rgba(37,99,235,0); }
          100% { transform: scale(.9); box-shadow: 0 0 0 0  rgba(37,99,235,0); }
        }
        .chatbot-fab       { animation: pulse-ring 2.5s ease-in-out infinite; }
        .chatbot-fab:hover { animation: none; transform: scale(1.08); }
        .chatbot-panel     { animation: fadeIn .25s ease; }
        .chat-input:focus  { outline: none; border-color: #2563eb !important; }
        .chat-opt:hover    { background: #eff6ff !important; border-color: #2563eb !important; }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* ── Panel de chat ── */}
      {abierto && (
        <div className="chatbot-panel" style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 9999,
          width: 370, maxWidth: 'calc(100vw - 32px)',
          height: 560, maxHeight: 'calc(100vh - 120px)',
          display: 'flex', flexDirection: 'column',
          background: '#f8fafc',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,.18), 0 4px 16px rgba(37,99,235,.12)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 20,
              background: 'rgba(255,255,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Asistente LavaYa</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>En línea</span>
              </div>
            </div>
            <button onClick={() => setAbierto(false)} style={{
              background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              flexShrink: 0,
            }}>✕</button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {msgs.map((msg, idx) => {
              const esUltimo = idx === msgs.length - 1;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.esBot ? 'flex-start' : 'flex-end',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '82%' }}>
                    {msg.esBot && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                        background: 'rgba(37,99,235,.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                        marginBottom: 2,
                      }}>🤖</div>
                    )}
                    <div style={{
                      padding: '10px 14px',
                      background: msg.esBot ? '#ffffff' : '#2563eb',
                      borderRadius: msg.esBot
                        ? '18px 18px 18px 4px'
                        : '18px 18px 4px 18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                    }}>
                      <RichText text={msg.texto} esBot={msg.esBot} />
                    </div>
                  </div>

                  {/* Hora */}
                  <div style={{
                    fontSize: 10, color: '#94a3b8', marginTop: 3,
                    paddingLeft: msg.esBot ? 36 : 0,
                  }}>{hora(msg.hora)}</div>

                  {/* Opciones — solo del último mensaje bot */}
                  {msg.esBot && msg.opciones.length > 0 && esUltimo && !opcsUsadas && (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 7,
                      paddingLeft: 36, marginTop: 8,
                    }}>
                      {msg.opciones.map(opt => (
                        <button key={opt.value} className="chat-opt" onClick={() => llamarBot('', opt.value)}
                          style={{
                            padding: '7px 13px',
                            background: '#fff',
                            border: '1.5px solid rgba(37,99,235,.35)',
                            borderRadius: 20,
                            fontSize: 12, fontWeight: 600, color: '#2563eb',
                            cursor: 'pointer', transition: 'all .15s',
                            boxShadow: '0 1px 4px rgba(37,99,235,.08)',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Indicador escribiendo */}
            {cargando && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: 'rgba(37,99,235,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>🤖</div>
                <div style={{
                  padding: '10px 16px', background: '#fff', borderRadius: '18px 18px 18px 4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px 14px',
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviarTexto()}
              placeholder="Escribe un mensaje..."
              disabled={cargando}
              style={{
                flex: 1, padding: '10px 14px',
                borderRadius: 22, border: '1.5px solid #e2e8f0',
                background: '#f8fafc', fontSize: 13,
                color: '#0f172a', transition: 'border-color .15s',
              }}
            />
            <button onClick={enviarTexto} disabled={cargando || !input.trim()} style={{
              width: 40, height: 40, borderRadius: 20, border: 'none',
              background: cargando || !input.trim() ? '#cbd5e1' : '#2563eb',
              color: '#fff', cursor: cargando || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'background .15s', flexShrink: 0,
            }}>➤</button>
          </div>
        </div>
      )}

      {/* ── Botón flotante ── */}
      <button
        onClick={() => setAbierto(o => !o)}
        className={abierto ? '' : 'chatbot-fab'}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 58, height: 58, borderRadius: 29, border: 'none',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(37,99,235,.45)',
          transition: 'transform .2s, box-shadow .2s',
        }}
        title="Asistente LavaYa"
      >
        <span style={{ fontSize: abierto ? 22 : 26, lineHeight: 1 }}>
          {abierto ? '✕' : '🤖'}
        </span>

        {/* Badge de no leídos */}
        {!abierto && unread > 0 && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 18, height: 18, borderRadius: 9,
            background: '#ef4444', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>{unread > 9 ? '9+' : unread}</div>
        )}
      </button>
    </>
  );
}
