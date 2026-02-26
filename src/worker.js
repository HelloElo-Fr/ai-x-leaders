/**
 * Cloudflare Worker — AI x Leaders CMS
 * Routes:
 *   /api/rss          — Proxy RSS Substack (existant)
 *   /api/auth/login   — Authentification admin
 *   /api/auth/hash    — Utilitaire hash password (dev only)
 *   /api/content/*    — CRUD contenu CMS (auth requise)
 *   /api/images/*     — Gestion images R2 (auth requise)
 *   /cms-images/*     — Servir images R2 (public)
 *   /admin*           — SPA admin
 *   /*                — Assets statiques + injection SSR contenu
 */

import { handleLogin, handleHashPassword, withAuth, CORS_HEADERS, jsonResponse } from './lib/auth.js';
import { handleContentAPI } from './lib/content-api.js';
import { handleImageAPI, serveImage } from './lib/image-api.js';
import { injectContent } from './lib/ssr.js';

// --- RSS Feed proxy (preservé de l'existant) ---

const FEEDS = {
  aixleaders: 'https://aixleaders.substack.com/feed',
  uglytruth: 'https://nashsuglytruth.substack.com/feed',
};

async function handleRSS(request, env) {
  const url = new URL(request.url);
  const feedKey = url.searchParams.get('feed');
  const feedUrl = FEEDS[feedKey];

  if (!feedUrl) {
    return jsonResponse({ error: 'Feed inconnu' }, 400);
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
    return jsonResponse({ error: err.message }, 500);
  }
}

// --- Main Worker ---

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // --- API Routes ---

    // RSS proxy (existant)
    if (path === '/api/rss') {
      return handleRSS(request, env);
    }

    // Auth
    if (path === '/api/auth/login') {
      return handleLogin(request, env);
    }

    // Password hash utility (dev/setup only)
    if (path === '/api/auth/hash') {
      return handleHashPassword(request, env);
    }

    // Content API (auth required)
    if (path.startsWith('/api/content')) {
      return withAuth(request, env, handleContentAPI);
    }

    // Image API (auth required) — requires R2
    if (path.startsWith('/api/images')) {
      if (!env.CMS_IMAGES) {
        return jsonResponse({ error: 'R2 non configuré. Activez R2 dans le dashboard Cloudflare.' }, 503);
      }
      return withAuth(request, env, handleImageAPI);
    }

    // --- Serve R2 images (public) ---
    if (path.startsWith('/cms-images/')) {
      if (!env.CMS_IMAGES) {
        return new Response('R2 non configuré', { status: 503 });
      }
      const key = path.replace('/cms-images/', '');
      return serveImage(key, env);
    }

    // --- Admin SPA ---
    if (path === '/admin' || path.startsWith('/admin/') || path === '/admin/index.html') {
      const adminResponse = await env.ASSETS.fetch(
        new Request(new URL('/admin/index.html', url.origin), request)
      );
      return adminResponse;
    }

    // --- Static assets with SSR content injection ---
    const response = await env.ASSETS.fetch(request);

    // Only inject content into HTML pages (not CSS, JS, images, etc.)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html') && !path.startsWith('/admin')) {
      try {
        return await injectContent(request, response, env);
      } catch (err) {
        // If SSR fails, serve original HTML
        console.error('SSR injection error:', err);
        return env.ASSETS.fetch(request);
      }
    }

    return response;
  },
};
