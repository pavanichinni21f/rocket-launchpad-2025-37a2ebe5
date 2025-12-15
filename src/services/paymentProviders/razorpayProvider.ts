/**
 * Razorpay provider wrapper (stub).
 * To enable: set VITE_PAYMENT_PROVIDER=razorpay and provide keys in environment variables.
 * This file is a safe stub so the app does not require keys to run locally.
 */
export async function createRazorpayCheckoutSession(payload: { userId: string; items: any[]; currency?: string }) {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
  const secret = import.meta.env.VITE_RAZORPAY_KEY_SECRET as string | undefined;
  if (!key || !secret) {
    throw new Error('Razorpay keys not configured');
  }

  // Real implementation would call Razorpay Orders API server-side.
  // Keep keys server-side and create an order then return checkout options.
  return { id: `razorpay_${Date.now()}`, url: window.location.origin };
}
