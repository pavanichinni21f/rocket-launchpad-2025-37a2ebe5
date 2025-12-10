import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, CreditCard, Shield, CheckCircle } from 'lucide-react';
import { initiatePayUPayment, redirectToPayU } from '@/services/payuService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const checkoutSchema = z.object({
  firstName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

interface PayUCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    name: string;
    price: number;
    planId: 'starter' | 'business' | 'enterprise';
  };
}

export function PayUCheckout({ isOpen, onClose, plan }: PayUCheckoutProps) {
  const { user, profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: profile?.full_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
    },
  });

  const handleSubmit = async (data: CheckoutForm) => {
    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    setIsProcessing(true);

    try {
      const { data: paymentData, error } = await initiatePayUPayment({
        amount: plan.price,
        productInfo: `KSFoundation ${plan.name} Plan`,
        firstName: data.firstName,
        email: data.email,
        phone: data.phone,
        userId: user.id,
        plan: plan.planId,
      });

      if (error || !paymentData) {
        toast.error('Failed to initiate payment');
        setIsProcessing(false);
        return;
      }

      // Redirect to PayU payment page
      redirectToPayU(paymentData.paymentUrl, paymentData.params);
    } catch (error) {
      toast.error('An error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Upgrade to {plan.name}
          </DialogTitle>
          <DialogDescription>
            Complete your payment with PayU
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardContent className="p-0 pt-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted mb-6">
              <div>
                <p className="font-medium">{plan.name} Plan</p>
                <p className="text-sm text-muted-foreground">Monthly subscription</p>
              </div>
              <p className="text-2xl font-bold">₹{plan.price}</p>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Full Name</Label>
                <Input
                  id="firstName"
                  placeholder="John Doe"
                  {...form.register('firstName')}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  {...form.register('phone')}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full btn-rocket" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Pay ₹{plan.price} with PayU
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Secured by PayU</span>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}