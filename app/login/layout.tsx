// app/login/layout.tsx — Layout compartido para los tres logins
// Está FUERA de los layouts protegidos, por lo que no aplica RouteGuard
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
