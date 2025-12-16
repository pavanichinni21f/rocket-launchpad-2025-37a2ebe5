import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  // If profile has role_id or role field, check it; fallback: allow if email is admin@example.com
  const userRole = (profile as any)?.role || (profile as any)?.role_id || null;
  const isAdminByEmail = user?.email === 'admin@example.com';

  if (isAdminByEmail) return <>{children}</>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!userRole) return <Navigate to="/" replace />;

  // simple check: role string equality or role contains
  if (typeof userRole === 'string' && userRole === role) return <>{children}</>;
  if (Array.isArray(userRole) && userRole.includes(role)) return <>{children}</>;

  return <Navigate to="/" replace />;
}
