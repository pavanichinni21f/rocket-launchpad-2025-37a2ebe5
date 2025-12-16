// Supabase Edge Function (stub) - create-order
// Demo stub: validate input and return a mock order. Replace with server-side DB inserts and payment initiation logic.

export default async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || null;
    const items = Array.isArray(body.items) ? body.items : [];
    const amount = Number(body.amount || items.reduce((s: number, it: any) => s + (it.price || 0), 0));

    const order = {
      id: `mock-order-${Date.now()}`,
      user_id: userId,
      amount,
      currency: body.currency || 'USD',
      status: 'pending',
      items,
      created_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ ok: true, order }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};
