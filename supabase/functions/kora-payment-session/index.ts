import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const KORA_SECRET_KEY = Deno.env.get("KORA_SECRET_KEY") || "";
const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("APP_URL") || "https://real-nexa.vercel.app";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const plans: Record<string, number> = { premium: 1000, gold: 3000, elite: 5000 };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  try {
    if (!SERVICE_KEY || !SUPABASE_URL) return json({ error: "Supabase server configuration is missing." }, 503);
    if (!KORA_SECRET_KEY) return json({ error: "KORA_SECRET_KEY is not configured in Supabase Secrets." }, 503);
    const h = req.headers.get("Authorization") || "";
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const body = await req.json();
    const plan = String(body.plan || "").toLowerCase();
    const amount = plans[plan];
    if (!amount) return json({ error: "Invalid plan. Use premium, gold or elite." }, 400);
    const reference = `NEXA-${plan.toUpperCase()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const name = String(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "NEXA User").slice(0, 100);
    const email = user.email || "";
    const redirectUrl = typeof body.redirect_url === "string" && body.redirect_url.startsWith("https://") ? body.redirect_url : `${APP_URL}/home?payment=complete&reference=${encodeURIComponent(reference)}`;
    const notificationUrl = `${SUPABASE_URL}/functions/v1/kora-webhook`;
    const { error: insertError } = await admin.from("subscription_payments").insert({ user_id: user.id, provider: "kora", plan, amount, currency: "NGN", reference, status: "pending", metadata: { product: "NEXA subscription", plan_name: plan, user_email: email } });
    if (insertError) throw insertError;
    const koraResponse = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KORA_SECRET_KEY}` }, body: JSON.stringify({ amount, currency: "NGN", reference, customer: { name, email }, redirect_url: redirectUrl, notification_url: notificationUrl, narration: `NEXA ${plan} subscription` }) });
    const raw = await koraResponse.text();
    let result: any;
    try { result = JSON.parse(raw); } catch { result = { raw }; }
    if (!koraResponse.ok || result?.status === false || !result?.data?.checkout_url) {
      await admin.from("subscription_payments").update({ status: "failed", metadata: { product: "NEXA subscription", plan_name: plan, kora_error: result } }).eq("reference", reference).eq("user_id", user.id);
      console.error("Kora initialize failed", koraResponse.status, result);
      return json({ error: "Kora could not initialize the payment.", provider_status: koraResponse.status, details: result?.message || result?.error || "No checkout URL returned." }, 502);
    }
    await admin.from("subscription_payments").update({ metadata: { product: "NEXA subscription", plan_name: plan, checkout_url: result.data.checkout_url } }).eq("reference", reference).eq("user_id", user.id);
    return json({ reference, amount, currency: "NGN", plan, checkout_url: result.data.checkout_url, customer: { name, email }, notification_url: notificationUrl });
  } catch (e) {
    console.error("kora-payment-session", e);
    return json({ error: e instanceof Error ? e.message : "Could not create payment session" }, 500);
  }
});
