// Newsletter sign up (2026-11-09, Krishna: newsletter on Zoho Campaigns, the key kept on Cloudflare, not on the site).
// Cloudflare Pages runs this file at /api/subscribe. The browser sends only the email; this adds the email to the
// Zoho Campaigns list "Website newsletter" through Zoho's official API. The Zoho keys live in the Cloudflare project
// settings (Settings, Variables and Secrets), never in this file or on GitHub:
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN  (Zoho API Console, Self Client, India data center)
//   ZOHO_LIST_KEY                                          (Zoho Campaigns, the list's key)
// Single opt in (double opt in is off in Zoho, Krishna 2026-11-09). Nothing is stored here.

const ACCOUNTS = "https://accounts.zoho.in";   // India data center, like Zoho Mail and Bookings
const CAMPAIGNS = "https://campaigns.zoho.in";
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

let cached = { token: "", until: 0 };   // an access token lasts an hour; reuse it while this worker is warm

async function accessToken(env) {
  if (cached.token && Date.now() < cached.until) return cached.token;
  const res = await fetch(`${ACCOUNTS}/oauth/v2/token`, {
    method: "POST",
    body: new URLSearchParams({
      refresh_token: env.ZOHO_REFRESH_TOKEN,
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error("token: " + (data.error || res.status));
  cached = { token: data.access_token, until: Date.now() + ((data.expires_in || 3600) - 300) * 1000 };
  return cached.token;
}

async function addToList(env, email, page) {
  const token = await accessToken(env);
  const url = new URL(`${CAMPAIGNS}/api/v1.1/json/listsubscribe`);
  url.search = new URLSearchParams({
    resfmt: "JSON",
    listkey: env.ZOHO_LIST_KEY,
    contactinfo: JSON.stringify({ "Contact Email": email }),
    source: "Website " + page,
  }).toString();
  const res = await fetch(url, { method: "POST", headers: { Authorization: "Zoho-oauthtoken " + token } });
  const data = await res.json().catch(() => ({}));
  if (data.status !== "success") throw new Error("zoho: " + (data.message || data.code || res.status));
}

function reply(request, ok, status = 200) {
  // Without JavaScript the form posts here directly: send the visitor back to the newsletter section.
  if (!(request.headers.get("accept") || "").includes("application/json")) {
    return Response.redirect(new URL(ok ? "/?subscribed=1#free-guide" : "/?subscribed=0#free-guide", request.url), 303);
  }
  return new Response(JSON.stringify({ ok }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  let form;
  try { form = await request.formData(); } catch { return reply(request, false, 400); }
  const email = String(form.get("email") || "").trim().toLowerCase();
  const page = String(form.get("page") || "").slice(0, 40).replace(/[^\w /-]/g, "");
  if (form.get("botcheck")) return reply(request, true);          // the hidden trap was filled: a bot; say ok, add nothing
  if (!EMAIL.test(email) || email.length > 99) return reply(request, false, 400);
  if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_LIST_KEY) return reply(request, false, 503);   // keys not set yet: the page falls back
  try {
    await addToList(env, email, page || "form");
    return reply(request, true);
  } catch (err) {
    console.log("subscribe failed", err.message);   // shows in Cloudflare's function logs, without the email
    return reply(request, false, 502);
  }
}

export function onRequest() {
  return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
}
