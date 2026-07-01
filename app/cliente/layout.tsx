// app/cliente/layout.tsx
import RouteGuard from '@/components/layout/RouteGuard';
import AppShell from '@/components/layout/AppShell';
import ClienteSidebar from '@/components/layout/ClienteSidebar';
import ChatbotWidget from '@/components/ChatbotWidget';

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['CLIENTE']} loginHref="/ingresar">
      <AppShell title="LavaYa" sidebar={<ClienteSidebar />}>
        {children}
      </AppShell>
      <ChatbotWidget />
    </RouteGuard>
  );
}
