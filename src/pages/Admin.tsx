import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

export default function Admin() {
  const { user, profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Admin Dashboard (Role protected)</h1>
        <p className="text-sm text-muted-foreground mt-2">This is a placeholder admin area. Implement RBAC and secure server-side checks before production.</p>

        <div className="mt-6">
          <pre className="bg-muted p-3 rounded">{JSON.stringify({ user: user?.id, profile: profile?.id }, null, 2)}</pre>
        </div>
      </div>
    </DashboardLayout>
  );
}
