/**
 * PayU provider wrapper (stub).
 * To enable: set VITE_PAYMENT_PROVIDER=payu and provide keys in environment variables.
 * This file is a safe stub so the app does not require keys to run locally.
 */
export async function createPayUCheckoutSession(payload: { userId: string; items: any[]; currency?: string }) {
  const key = import.meta.env.VITE_PAYU_KEY as string | undefined;
  const secret = import.meta.env.VITE_PAYU_SECRET as string | undefined;
  if (!key || !secret) {
    throw new Error('PayU keys not configured');
  }

  // Real implementation would call PayU server-side APIs to create a checkout/session.
  return { id: `payu_${Date.now()}`, url: window.location.origin };
}
