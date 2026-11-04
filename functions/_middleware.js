// Password lock for the whole site, run by Cloudflare Pages before any page,
// photo or file is sent. GitHub Pages ignores this folder entirely.
//
// - On/off comes from `access.passwordLock` in config.json, so the studio's
//   switch controls it.
// - The password is the SITE_PASSWORD secret in the Cloudflare Pages project
//   settings. It is never in the repo.
// - A correct password sets a signed, HttpOnly cookie for 30 days. Changing
//   SITE_PASSWORD invalidates every existing cookie, since they are signed with it.
// - Visit /__site-logout to sign out on a shared computer.

const COOKIE = "site_auth";
const LOGIN_PATH = "/__site-login";
const LOGOUT_PATH = "/__site-logout";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const CONFIG_TTL_MS = 30 * 1000;

const encoder = new TextEncoder();

let cachedConfig;
let cachedAt = 0;

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const config = await readConfig(env, url);

  if (!lockEnabled(config)) {
    if (url.pathname === LOGIN_PATH || url.pathname === LOGOUT_PATH) return redirect("/");
    return next();
  }

  const secret = env.SITE_PASSWORD;
  if (!secret) return page(503, setupNeededHtml(config));

  if (url.pathname === LOGOUT_PATH) return redirect("/", clearCookie());

  if (url.pathname === LOGIN_PATH) {
    if (request.method !== "POST") return redirect("/");
    const form = await request.formData();
    const target = safeNext(form.get("next"));
    if (await passwordMatches(String(form.get("password") || ""), secret)) {
      return redirect(target, await sessionCookie(secret));
    }
    return page(401, loginHtml(config, target, true));
  }

  if (await hasValidSession(request, secret)) {
    const res = await next();
    // Keep shared caches (corporate proxies and the like) from storing a copy
    // that a later, signed-out visitor could be handed.
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    out.headers.append("Vary", "Cookie");
    return out;
  }

  return page(401, loginHtml(config, url.pathname + url.search, false));
}

// ---------- config ----------

// Read straight from the static files, bypassing this middleware. Cached briefly
// per worker; a publish from the studio redeploys, which starts fresh workers.
async function readConfig(env, url) {
  const now = Date.now();
  if (cachedConfig !== undefined && now - cachedAt < CONFIG_TTL_MS) return cachedConfig;
  try {
    const res = await env.ASSETS.fetch(new URL("/config.json", url));
    cachedConfig = res.ok ? await res.json() : null;
  } catch {
    cachedConfig = null;
  }
  cachedAt = now;
  return cachedConfig;
}

// An unreadable config fails closed: asking for the password by mistake is far
// better than exposing the site by mistake.
function lockEnabled(config) {
  if (!config) return true;
  return Boolean(config.access && config.access.passwordLock === true);
}

// ---------- auth ----------

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64url(new Uint8Array(sig));
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

function base64url(bytes) {
  let s = "";
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Constant-time, so response timing can't reveal how much of a guess was right.
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Hashing both first makes the comparison length-independent too.
async function passwordMatches(guess, secret) {
  return sameBytes(await sha256(guess), await sha256(secret));
}

async function sessionCookie(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const sig = await hmac(secret, `site-access:v1:${expires}`);
  return `${COOKIE}=${expires}.${sig}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function hasValidSession(request, secret) {
  const header = request.headers.get("cookie") || "";
  const match = header.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  if (!match) return false;

  const [expires, sig] = match.slice(COOKIE.length + 1).split(".");
  if (!/^\d+$/.test(expires || "") || !sig) return false;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;

  const expected = await hmac(secret, `site-access:v1:${expires}`);
  return sameBytes(encoder.encode(sig), encoder.encode(expected));
}

// Only same-site paths, so the login form can't be used to bounce someone to
// another website after they sign in.
function safeNext(value) {
  const s = String(value || "");
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) return "/";
  if (s.startsWith(LOGIN_PATH) || s.startsWith(LOGOUT_PATH)) return "/";
  return s;
}

// ---------- responses ----------

function redirect(location, cookie) {
  const headers = { Location: location, "Cache-Control": "no-store" };
  if (cookie) headers["Set-Cookie"] = cookie;
  return new Response(null, { status: 303, headers });
}

function page(status, html) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer"
    }
  });
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Colours and display font come from config.json, so the login page matches
// the site. Only a colour that is a plain hex value is used, so nothing in the
// config can inject CSS.
function themeFrom(config) {
  const c = (config && config.theme && config.theme.colors) || {};
  const hex = (v, d) => (/^#[0-9a-f]{3,8}$/i.test(String(v || "")) ? v : d);
  const display = (config && config.theme && config.theme.fonts && config.theme.fonts.display) || "Fraunces";
  return {
    name: (config && config.site && config.site.name) || "",
    bg: hex(c.background, "#f6f4ee"),
    text: hex(c.text, "#1c1b18"),
    muted: hex(c.muted, "#8a8577"),
    accent: hex(c.accent, "#5c6b52"),
    border: hex(c.border, "#dcd8cb"),
    display: /^[A-Za-z0-9 ]+$/.test(display) ? display : "Fraunces"
  };
}

function shell(t, inner) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(t.name || "private")}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.display).replace(/%20/g, "+")}&display=swap">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100vh; background: ${t.bg}; color: ${t.text};
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  main { min-height: 100vh; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; padding: 2rem; }
  h1 { font-family: "${t.display}", Georgia, serif; font-style: italic; font-weight: 500;
    font-size: clamp(2.2rem, 7vw, 3.6rem); margin: 0 0 2.2rem; }
  form { display: flex; gap: 0.5rem; width: 100%; max-width: 320px; }
  input { flex: 1; min-width: 0; font: inherit; font-size: 0.95rem; padding: 0.65rem 0.8rem;
    border: 1px solid ${t.border}; border-radius: 8px; background: transparent; color: ${t.text}; }
  input:focus { outline: none; border-color: ${t.accent}; }
  button { font: inherit; font-size: 0.85rem; letter-spacing: 0.06em; padding: 0.65rem 1rem;
    border: 1px solid ${t.text}; border-radius: 8px; background: ${t.text}; color: ${t.bg}; cursor: pointer; }
  button:hover { opacity: 0.85; }
  p { font-size: 0.82rem; color: ${t.muted}; margin: 1rem 0 0; letter-spacing: 0.04em; line-height: 1.6; max-width: 40ch; }
  p.err { color: #a8462f; }
</style>
</head>
<body><main>${inner}</main></body>
</html>`;
}

function loginHtml(config, next, failed) {
  const t = themeFrom(config);
  return shell(t, `
  <h1>${esc(t.name)}</h1>
  <form method="post" action="${LOGIN_PATH}">
    <input type="hidden" name="next" value="${esc(next)}">
    <input type="password" name="password" placeholder="password" aria-label="password"
           autocomplete="current-password" autofocus required>
    <button type="submit">enter</button>
  </form>
  ${failed ? '<p class="err" role="alert">that\'s not it. try again.</p>' : ""}`);
}

function setupNeededHtml(config) {
  const t = themeFrom(config);
  return shell(t, `
  <h1>${esc(t.name)}</h1>
  <p>This site is locked, but no password has been set yet. Add a <strong>SITE_PASSWORD</strong>
     secret in the Cloudflare Pages project's settings and redeploy.</p>`);
}
