// Supabase Edge Function (stub) - payment-webhook
// Demo: verify provider signature and update order/invoice status. Replace with secure verification logic.

export default async (req: Request) => {
  try {
    const raw = await req.text();
    // In production: verify signature header and parse provider payload (Stripe/Razorpay/PayU)

    // For demo, accept any POST and return success
    return new Response(JSON.stringify({ ok: true, received: raw.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};
