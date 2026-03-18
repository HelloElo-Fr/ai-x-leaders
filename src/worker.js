/**
 * Cloudflare Worker — AI x Leaders
 * - Proxy RSS Substack (/api/rss)
 * - Dashboard bootcamp protege par mot de passe (/bootcamp-dashboard)
 */

const FEEDS = {
  aixleaders: 'https://aixleaders.substack.com/feed',
  uglytruth: 'https://nashsuglytruth.substack.com/feed',
};

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 jours en secondes
const COOKIE_NAME = 'dashboard_session';

// ── Helpers crypto HMAC ──

async function hmacSign(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(message, signature, secret) {
  const expected = await hmacSign(message, secret);
  return expected === signature;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(pair => {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name.trim()] = rest.join('=').trim();
  });
  return cookies;
}

async function createSessionCookie(secret) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = await hmacSign(ts, secret);
  const value = `${ts}.${sig}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

async function verifySession(cookieHeader, secret) {
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;
  const valid = await hmacVerify(ts, sig, secret);
  if (!valid) return false;
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  return age < SESSION_MAX_AGE;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// ── Page de login HTML ──

function loginPage(error = '') {
  const errorHtml = error
    ? `<div class="error">${error}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Connexion — Bootcamp AI Leadership</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --pink: #FF48AA;
    --pink-light: #FF6FBF;
    --pink-glow: rgba(255, 72, 170, 0.15);
    --bg: #191B1F;
    --bg-card: #22252A;
    --text: #FFFFFF;
    --text-muted: #9CA3AF;
    --border: rgba(255, 255, 255, 0.08);
  }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bg-gradient {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background:
      radial-gradient(ellipse at 30% 0%, rgba(255, 72, 170, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 100%, rgba(255, 72, 170, 0.05) 0%, transparent 50%);
    z-index: 0;
  }
  .login-card {
    position: relative;
    z-index: 1;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 48px 40px;
    max-width: 420px;
    width: 90%;
    text-align: center;
  }
  .logo {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .logo span { color: var(--pink); }
  h1 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    font-style: italic;
    margin-bottom: 8px;
  }
  h1 em { color: var(--pink); font-style: italic; }
  .subtitle {
    color: var(--text-muted);
    font-size: 0.88rem;
    margin-bottom: 32px;
    line-height: 1.6;
  }
  .error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #FCA5A5;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 0.85rem;
    margin-bottom: 20px;
  }
  input[type="password"] {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 18px;
    color: var(--text);
    font-size: 1rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.3s;
    margin-bottom: 16px;
  }
  input[type="password"]::placeholder { color: var(--text-muted); }
  input[type="password"]:focus { border-color: var(--pink); }
  button {
    width: 100%;
    background: var(--pink);
    border: none;
    border-radius: 12px;
    padding: 14px;
    color: white;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.25s;
    font-family: inherit;
  }
  button:hover {
    background: var(--pink-light);
    box-shadow: 0 8px 30px var(--pink-glow);
  }
  .back-link {
    display: inline-block;
    margin-top: 24px;
    color: var(--text-muted);
    font-size: 0.8rem;
    text-decoration: none;
  }
  .back-link:hover { color: var(--pink); }
</style>
</head>
<body>
<div class="bg-gradient"></div>
<div class="login-card">
  <div class="logo">AI <span>x</span> Leaders</div>
  <h1>Bootcamp <em>#4</em></h1>
  <p class="subtitle">Entre le mot de passe pour acceder a ton espace bootcamp.</p>
  ${errorHtml}
  <form method="POST" action="/bootcamp-dashboard/login">
    <input type="password" name="password" placeholder="Mot de passe" autofocus required>
    <button type="submit">Entrer</button>
  </form>
  <a href="/" class="back-link">&larr; Retour au site</a>
</div>
</body>
</html>`;
}

// ── Worker principal ──

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const secret = env.DASHBOARD_PASSWORD || '';

    // ── Bloquer l'acces direct aux fichiers proteges ──
    if (url.pathname.startsWith('/_protected/')) {
      return new Response('Not Found', { status: 404 });
    }

    // ── POST /bootcamp-dashboard/login ──
    if (url.pathname === '/bootcamp-dashboard/login' && request.method === 'POST') {
      if (!secret) {
        return new Response('DASHBOARD_PASSWORD non configure.', { status: 500 });
      }
      const formData = await request.formData();
      const password = formData.get('password') || '';

      if (password === secret) {
        const cookie = await createSessionCookie(secret);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/bootcamp-dashboard',
            'Set-Cookie': cookie,
          },
        });
      }

      return new Response(loginPage('Mot de passe incorrect.'), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── GET /bootcamp-dashboard/logout ──
    if (url.pathname === '/bootcamp-dashboard/logout') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/',
          'Set-Cookie': clearSessionCookie(),
        },
      });
    }

    // ── GET /bootcamp-dashboard ──
    if (url.pathname === '/bootcamp-dashboard') {
      if (!secret) {
        return new Response('DASHBOARD_PASSWORD non configure. Lancez: wrangler secret put DASHBOARD_PASSWORD', { status: 500 });
      }

      const isAuth = await verifySession(request.headers.get('Cookie'), secret);

      if (!isAuth) {
        return new Response(loginPage(), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // Servir le dashboard depuis les assets proteges
      const dashboardUrl = new URL('/_protected/bootcamp-dashboard.html', url.origin);
      const dashboardReq = new Request(dashboardUrl.toString(), {
        headers: request.headers,
      });
      const dashboardRes = await env.ASSETS.fetch(dashboardReq);
      const html = await dashboardRes.text();

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, no-cache',
        },
      });
    }

    // ── API : proxy RSS ──
    if (url.pathname === '/api/rss') {
      const feedKey = url.searchParams.get('feed');
      const feedUrl = FEEDS[feedKey];

      if (!feedUrl) {
        return new Response(JSON.stringify({ error: 'Feed inconnu' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      try {
        const res = await fetch(feedUrl, {
          headers: { 'User-Agent': 'AI-x-Leaders-RSS/1.0' },
          cf: { cacheTtl: 3600 },
        });
        const xml = await res.text();

        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && items.length < 2) {
          const itemXml = match[1];
          const title = (itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                         itemXml.match(/<title>(.*?)<\/title>/) || [])[1] || '';
          const link = (itemXml.match(/<link>(.*?)<\/link>/) || [])[1] || '';
          const pubDate = (itemXml.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
          items.push({ title, link, pubDate });
        }

        return new Response(JSON.stringify({ items }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // ── Tout le reste : assets statiques ──
    return env.ASSETS.fetch(request);
  },
};
