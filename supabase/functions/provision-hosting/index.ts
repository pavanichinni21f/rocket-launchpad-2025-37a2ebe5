// Supabase Edge Function (stub) - provision-hosting
// This is a demo stub. Implement provider SDKs and secure authentication before using in production.

export default async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    // Expected input: { userId, planId, provider }
    const userId = body.userId || null;
    const planId = body.planId || 'starter';
    const provider = body.provider || 'demo';

    // In production: validate JWT, fetch profile, call provider API (AWS/Hetzner/Custom), persist hosting_account

    // Return a mock hosting account
    const mock = {
      id: `mock-hosting-${Date.now()}`,
      user_id: userId,
      provider,
      plan: planId,
      status: 'active',
      metadata: { demo: true },
      created_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ ok: true, hosting: mock }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};
