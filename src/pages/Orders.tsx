import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function Orders() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground mt-2">Order history and management will appear here. This is a demo scaffold.</p>
      </div>
    </DashboardLayout>
  );
}
