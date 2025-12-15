import * as mock from './mockProvider';
import * as razorpay from './razorpayProvider';
import * as payu from './payuProvider';

const PROVIDER = (import.meta.env.VITE_PAYMENT_PROVIDER as string) || 'mock';

export async function createCheckoutSession(payload: { userId: string; items: any[]; currency?: string; metadata?: any }) {
  if (PROVIDER === 'razorpay') {
    try {
      return await razorpay.createRazorpayCheckoutSession(payload as any);
    } catch (e) {
      console.warn('Razorpay provider failed, falling back to mock:', e);
      return mock.createMockCheckoutSession(payload);
    }
  }

  if (PROVIDER === 'payu') {
    try {
      return await payu.createPayUCheckoutSession(payload as any);
    } catch (e) {
      console.warn('PayU provider failed, falling back to mock:', e);
      return mock.createMockCheckoutSession(payload);
    }
  }

  // Default: mock
  return mock.createMockCheckoutSession(payload);
}

export async function verifyPayment(sessionId: string) {
  if (PROVIDER === 'razorpay') {
    // Razorpay verification should be implemented server-side
    return { success: false };
  }
  if (PROVIDER === 'payu') {
    return { success: false };
  }
  return mock.verifyMockPayment(sessionId);
}
