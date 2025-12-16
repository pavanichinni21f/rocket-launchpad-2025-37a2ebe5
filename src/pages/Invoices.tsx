import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function Invoices() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-2">Invoice list, PDF downloads, and payment status will appear here.</p>
      </div>
    </DashboardLayout>
  );
}
