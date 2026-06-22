// app/admin/layout.tsx
import RouteGuard from '@/components/layout/RouteGuard';
import AppShell from '@/components/layout/AppShell';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['ADMIN']}>
      <AppShell title="LavaYa Admin" sidebar={<Sidebar variant="admin" />}>
        {children}
      </AppShell>
    </RouteGuard>
  );
}
