import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { NotificationsProvider } from '@/hooks/useNotifications';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'LavaYa — Panel de Administración',
  description: 'Panel administrativo LavaYa',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

// Script que se ejecuta ANTES de que React hidrate — evita el flash
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('lavaya_theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <html lang="es" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
        <head>
          {/* Inyectar tema antes de que se pinte el HTML — elimina el flash */}
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          <link rel="icon" href="/favicon.ico" sizes="any" />
        </head>
        <body className="min-h-full" suppressHydrationWarning>
          <ThemeProvider>
            <AuthProvider>
              <NotificationsProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{ duration: 4000, style: { fontSize: '14px' } }}
                />
              </NotificationsProvider>
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </GoogleOAuthProvider>
  );
}
