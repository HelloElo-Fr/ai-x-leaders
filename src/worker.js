/**
 * Cloudflare Worker — AI x Leaders
 * - Proxy RSS Substack (/api/rss)
 * - Dashboard bootcamp protege par mot de passe (/bootcamp-dashboard)
 * - Chatbot Elo IA (/api/chat)
 */

import { SYSTEM_PROMPT } from './knowledge-base.js';

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

// ── Page admin survey ──

function surveyAdminPage(allData) {
  const QUESTIONS = {
    energy: {
      label: 'Comment tu te sens apres cette session ?',
      options: { rocket: '🚀 On fire', star: '⭐ Motive(e)', think: '🤔 Curieux(se)', mind: '🤯 Mind blown' }
    },
    useful: {
      label: 'Le contenu etait utile ?',
      options: { '100': '💯 100%', ok: '👍 Bien', 'so-so': '😐 Moyen', lost: '😵 Perdu(e)' }
    },
    pace: {
      label: 'Le rythme de la session ?',
      options: { perfect: '🎯 Parfait', fast: '⚡ Un peu rapide', slow: '🐢 Trop lent', more: '🤩 J\'en veux plus !' }
    }
  };

  let sessionsHtml = '';
  const sessionKeys = Object.keys(allData).sort();

  if (sessionKeys.length === 0) {
    sessionsHtml = '<div style="text-align:center;color:#9CA3AF;padding:40px;">Aucun vote pour le moment</div>';
  }

  for (const sessionId of sessionKeys) {
    const data = allData[sessionId];
    const num = sessionId.replace('session', '');
    sessionsHtml += `<div class="session-block"><h2>📊 Session ${num} <span class="vote-count">${data.count} vote${data.count > 1 ? 's' : ''}</span></h2>`;

    for (const [qKey, qDef] of Object.entries(QUESTIONS)) {
      // Count votes per option
      const counts = {};
      for (const opt of Object.keys(qDef.options)) counts[opt] = 0;
      for (const vote of data.votes) {
        const val = vote.answers[qKey];
        if (val && counts[val] !== undefined) counts[val]++;
      }
      const total = data.votes.length;

      sessionsHtml += `<div class="question-block"><h3>${qDef.label}</h3><div class="bars">`;
      for (const [opt, label] of Object.entries(qDef.options)) {
        const count = counts[opt];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        sessionsHtml += `<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><div class="bar-value">${count} (${pct}%)</div></div>`;
      }
      sessionsHtml += '</div></div>';
    }
    // Comments
    const comments = data.votes.filter(v => v.answers.comment).map(v => v.answers.comment);
    if (comments.length > 0) {
      sessionsHtml += '<div class="question-block"><h3>Commentaires</h3><div class="comments-list">';
      for (const c of comments) {
        sessionsHtml += `<div class="comment-item">${c.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
      }
      sessionsHtml += '</div></div>';
    }

    sessionsHtml += '</div>';
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Survey — AI Leadership Program</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--pink:#FF48AA;--pink-light:#FF6FBF;--pink-glow:rgba(255,72,170,0.15);--pink-border:rgba(255,72,170,0.25);--bg:#191B1F;--bg-card:#22252A;--text:#FFF;--text-muted:#9CA3AF;--border:rgba(255,255,255,0.08)}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.bg-gradient{position:fixed;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 30% 0%,rgba(255,72,170,0.08) 0%,transparent 50%),radial-gradient(ellipse at 70% 100%,rgba(255,72,170,0.05) 0%,transparent 50%);z-index:0}
.container{max-width:800px;margin:0 auto;padding:32px 24px;position:relative;z-index:1}
.back-link{display:inline-flex;align-items:center;gap:8px;color:var(--text-muted);text-decoration:none;font-size:0.85rem;margin-bottom:24px;transition:color 0.2s}
.back-link:hover{color:var(--pink-light)}
h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.8rem;font-weight:800;margin-bottom:32px}
h1 em{color:var(--pink);font-style:italic}
.session-block{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:28px;margin-bottom:24px}
.session-block h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.15rem;font-weight:700;margin-bottom:24px;display:flex;align-items:center;gap:10px}
.vote-count{background:rgba(255,72,170,0.12);color:var(--pink-light);font-size:0.75rem;font-weight:600;padding:4px 12px;border-radius:20px}
.question-block{margin-bottom:24px}
.question-block:last-child{margin-bottom:0}
.question-block h3{font-size:0.9rem;font-weight:600;margin-bottom:12px;color:var(--text-muted)}
.bars{display:flex;flex-direction:column;gap:8px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-label{width:160px;font-size:0.85rem;flex-shrink:0}
.bar-track{flex:1;height:28px;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden}
.bar-fill{height:100%;background:linear-gradient(90deg,var(--pink),#8B5CF6);border-radius:8px;transition:width 0.5s ease;min-width:2px}
.bar-value{width:70px;text-align:right;font-size:0.8rem;color:var(--text-muted);flex-shrink:0}
.comments-list{display:flex;flex-direction:column;gap:8px}
.comment-item{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 16px;font-size:0.85rem;color:#d1d5db;line-height:1.5;font-style:italic}
@media(max-width:600px){.bar-label{width:100px;font-size:0.75rem}.bar-value{width:55px;font-size:0.72rem}}
</style>
</head>
<body>
<div class="bg-gradient"></div>
<div class="container">
<a href="/bootcamp-dashboard" class="back-link">&larr; Retour au dashboard</a>
<h1>Feedback <em>Survey</em> 📊</h1>
${sessionsHtml}
</div>
</body>
</html>`;
}

// ── Worker principal ──

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const secret = env.DASHBOARD_PASSWORD || '';

    // ── Bloquer l'acces direct aux fichiers proteges et sensibles ──
    if (url.pathname.startsWith('/_protected/') ||
        url.pathname === '/.dev.vars' ||
        url.pathname.startsWith('/.wrangler/') ||
        url.pathname.startsWith('/.claude/') ||
        url.pathname.startsWith('/src/')) {
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

    // ── GET /session1 (et autres pages de session protegees) ──
    const sessionMatch = url.pathname.match(/^\/(session\d+)$/);
    if (sessionMatch) {
      if (!secret) {
        return new Response('DASHBOARD_PASSWORD non configure.', { status: 500 });
      }
      const isAuth = await verifySession(request.headers.get('Cookie'), secret);
      if (!isAuth) {
        return new Response(loginPage(), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      const pageName = sessionMatch[1];
      const pageUrl = new URL(`/_protected/${pageName}.html`, url.origin);
      const pageReq = new Request(pageUrl.toString(), { headers: request.headers });
      const pageRes = await env.ASSETS.fetch(pageReq);
      if (pageRes.status === 404) {
        return new Response('Not Found', { status: 404 });
      }
      const html = await pageRes.text();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, no-cache',
        },
      });
    }

    // ── API : chatbot Elo IA ──
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY non configuree' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verifier que l'utilisateur est authentifie
      const isAuth = await verifySession(request.headers.get('Cookie'), secret);
      if (!isAuth) {
        return new Response(JSON.stringify({ error: 'Non autorise' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        const body = await request.json();
        const userMessage = body.message || '';
        const history = body.history || [];

        if (!userMessage.trim()) {
          return new Response(JSON.stringify({ error: 'Message vide' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Construire les messages pour Claude
        const messages = [];
        for (const msg of history.slice(-10)) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
        messages.push({ role: 'user', content: userMessage });

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 250,
            stream: true,
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            messages,
          }),
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          return new Response(JSON.stringify({ error: 'Erreur API Claude', detail: errText }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Stream the response as SSE
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        (async () => {
          const reader = claudeRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                      await writer.write(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`));
                    }
                  } catch {}
                }
              }
            }
            await writer.write(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ── API : survey votes ──
    if (url.pathname === '/api/survey' && request.method === 'POST') {
      const isAuth = await verifySession(request.headers.get('Cookie'), secret);
      if (!isAuth) {
        return new Response(JSON.stringify({ error: 'Non autorise' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      try {
        const body = await request.json();
        const session = body.session; // e.g. "session1"
        const answers = body.answers; // e.g. { energy: "rocket", useful: "100", pace: "perfect" }
        if (!session || !answers || typeof answers !== 'object') {
          return new Response(JSON.stringify({ error: 'Donnees invalides' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // Get existing data for this session
        const key = `survey_${session}`;
        const existing = await env.SURVEY_KV.get(key, 'json') || { votes: [], count: 0 };
        existing.votes.push({ answers, ts: Date.now() });
        existing.count = existing.votes.length;
        await env.SURVEY_KV.put(key, JSON.stringify(existing));
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Admin : resultats survey ──
    if (url.pathname === '/admin/survey') {
      const isAuth = await verifySession(request.headers.get('Cookie'), secret);
      if (!isAuth) {
        return new Response(loginPage(), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      // Fetch all survey keys
      const list = await env.SURVEY_KV.list({ prefix: 'survey_' });
      const allData = {};
      for (const key of list.keys) {
        const data = await env.SURVEY_KV.get(key.name, 'json');
        allData[key.name.replace('survey_', '')] = data;
      }
      return new Response(surveyAdminPage(allData), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-cache' },
      });
    }

    // ── CORS preflight pour /api/chat ──
    if (url.pathname === '/api/chat' && request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
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
