const GAS_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
const SYNC_SECRET = "your-random-secret";

export default {
  async fetch(request) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = await request.text();

    // ส่งต่อไป GAS พร้อม secret
    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "stripeEvent",
        payload: { secret: SYNC_SECRET, event: JSON.parse(body) }
      }),
      redirect: "follow"
    });

    if (!gasRes.ok) return new Response("GAS error", { status: 500 });

    // ตอบ 200 ให้ Stripe ทันที (ไม่ให้ Stripe เห็น 302)
    return new Response("ok", { status: 200 });
  }
};
