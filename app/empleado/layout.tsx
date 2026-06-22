// app/empleado/layout.tsx
import RouteGuard from '@/components/layout/RouteGuard';
import AppShell from '@/components/layout/AppShell';
import EmpleadoSidebar from '@/components/layout/EmpleadoSidebar';

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['EMPLEADO']} loginHref="/login/empleado">
      <AppShell title="LavaYa Empleado" sidebar={<EmpleadoSidebar />}>
        {children}
      </AppShell>
    </RouteGuard>
  );
}
