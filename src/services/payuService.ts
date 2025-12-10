import { supabase } from '@/integrations/supabase/client';

export interface PayUPaymentParams {
  amount: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone?: string;
  userId: string;
  plan: 'starter' | 'business' | 'enterprise';
}

export interface PayUResponse {
  paymentUrl: string;
  params: Record<string, string>;
  orderId: string;
}

export async function initiatePayUPayment(params: PayUPaymentParams): Promise<{ data: PayUResponse | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('payu-payment', {
      body: {
        action: 'initiate',
        ...params,
      },
    });

    if (error) {
      console.error('PayU initiation error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    console.error('PayU service error:', error);
    return { data: null, error: error as Error };
  }
}

export async function verifyPayUPayment(params: Record<string, string>): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('payu-payment', {
      body: {
        action: 'verify',
        ...params,
      },
    });

    if (error) {
      console.error('PayU verification error:', error);
      return { success: false, error: error.message };
    }

    return { success: data.success, orderId: data.orderId };
  } catch (error) {
    console.error('PayU verification service error:', error);
    return { success: false, error: (error as Error).message };
  }
}

export function redirectToPayU(paymentUrl: string, params: Record<string, string>) {
  // Create a form and submit it to PayU
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;

  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}