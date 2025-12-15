/**
 * Mock payment provider for local/demo mode.
 * This simulates provider behavior and returns a checkout URL that points
 * to a local success page. No external API keys are required.
 */
export async function createMockCheckoutSession(payload: { userId: string; items: any[]; currency?: string; metadata?: any }) {
  // Simple simulated session object
  const sessionId = `mock_${Date.now()}`;
  const url = `${window.location.origin}/?mock_payment_success=${sessionId}`;
  return {
    id: sessionId,
    url,
    provider: 'mock',
  };
}

export async function verifyMockPayment(sessionId: string) {
  // For demo, always succeed
  return { success: true, sessionId };
}
