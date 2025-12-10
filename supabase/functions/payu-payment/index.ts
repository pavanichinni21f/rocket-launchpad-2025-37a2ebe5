import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayUPaymentRequest {
  amount: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  userId: string;
  plan: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYU_MERCHANT_KEY = Deno.env.get("PAYU_MERCHANT_KEY");
    const PAYU_MERCHANT_SALT = Deno.env.get("PAYU_MERCHANT_SALT");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
      console.error("PayU credentials not configured");
      return new Response(
        JSON.stringify({ error: "PayU credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { action, ...body } = await req.json();

    console.log("PayU payment action:", action);

    if (action === "initiate") {
      const { amount, productInfo, firstName, email, phone, userId, plan } = body as PayUPaymentRequest;

      // Generate unique transaction ID
      const txnid = `TXN${Date.now()}${Math.random().toString(36).substring(7)}`;

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          amount_cents: Math.round(amount * 100),
          plan: plan,
          status: "pending",
          billing_cycle: "monthly",
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        return new Response(
          JSON.stringify({ error: "Failed to create order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // PayU parameters
      const params: Record<string, string> = {
        key: PAYU_MERCHANT_KEY,
        txnid: txnid,
        amount: amount.toString(),
        productinfo: productInfo,
        firstname: firstName,
        email: email,
        phone: phone || "",
        surl: `${req.headers.get("origin") || ""}/billing?payment=success`,
        furl: `${req.headers.get("origin") || ""}/billing?payment=failed`,
        udf1: order.id, // Store order ID for reference
        udf2: userId,
        udf3: plan,
      };

      // Generate hash using SHA-512
      const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${PAYU_MERCHANT_SALT}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(hashString);
      const hashBuffer = await crypto.subtle.digest("SHA-512", data);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      params.hash = hash;

      // Update order with transaction ID
      await supabase
        .from("orders")
        .update({ stripe_payment_intent_id: txnid }) // Using this field for PayU txnid
        .eq("id", order.id);

      console.log("PayU payment initiated for order:", order.id);

      return new Response(
        JSON.stringify({
          paymentUrl: "https://secure.payu.in/_payment", // Use https://test.payu.in/_payment for testing
          params,
          orderId: order.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      const { txnid, status, mihpayid, hash: receivedHash, amount, productinfo, firstname, email, udf1 } = body;

      // Verify hash (reverse hash for response)
      const reverseHashString = `${PAYU_MERCHANT_SALT}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_MERCHANT_KEY}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(reverseHashString);
      const hashBuffer = await crypto.subtle.digest("SHA-512", data);
      const calculatedHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (calculatedHash !== receivedHash) {
        console.error("Hash verification failed");
        return new Response(
          JSON.stringify({ error: "Hash verification failed", success: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update order status
      const orderId = udf1;
      const newStatus = status === "success" ? "paid" : "failed";

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          paid_at: status === "success" ? new Date().toISOString() : null,
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Order update error:", updateError);
      }

      // If payment successful, update user's subscription
      if (status === "success") {
        const { data: orderData } = await supabase
          .from("orders")
          .select("user_id, plan")
          .eq("id", orderId)
          .single();

        if (orderData) {
          await supabase
            .from("profiles")
            .update({ subscription_plan: orderData.plan })
            .eq("id", orderData.user_id);

          // Log activity
          await supabase
            .from("activity_log")
            .insert({
              user_id: orderData.user_id,
              action: "subscription_upgraded",
              details: { plan: orderData.plan, payment_id: mihpayid },
            });

          // Create notification
          await supabase
            .from("notifications")
            .insert({
              user_id: orderData.user_id,
              type: "payment",
              title: "Payment Successful",
              message: `Your subscription has been upgraded to ${orderData.plan} plan.`,
            });
        }
      }

      console.log("PayU payment verified:", { orderId, status: newStatus });

      return new Response(
        JSON.stringify({ success: status === "success", orderId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("PayU payment error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});