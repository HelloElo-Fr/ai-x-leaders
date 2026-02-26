/**
 * Content CRUD API — reads/writes page content from Cloudflare KV
 * KV key pattern: content:{page-id}
 */

import { jsonResponse } from './auth.js';

// All managed pages
const PAGES = [
  { id: 'index', label: 'Accueil', file: 'index.html' },
  { id: 'qui-sommes-nous', label: 'Qui sommes-nous', file: 'qui-sommes-nous.html' },
  { id: 'a-propos', label: 'A propos', file: 'a-propos.html' },
  { id: 'ressources', label: 'Ressources', file: 'ressources.html' },
  { id: 'entreprises', label: 'Studio IA', file: 'entreprises.html' },
  { id: 'event-ia', label: 'Event IA', file: 'event-ia.html' },
  { id: 'contact', label: 'Contact', file: 'contact.html' },
  { id: 'merci', label: 'Merci', file: 'merci.html' },
  { id: 'programmes/ai-leadership', label: 'AI Leadership Program', file: 'programmes/ai-leadership.html' },
  { id: 'programmes/ai-governance', label: 'AI Governance Program', file: 'programmes/ai-governance.html' },
  { id: 'programmes/sprints', label: 'Sprints', file: 'programmes/sprints.html' },
  { id: 'programmes/masterclass', label: 'Masterclass', file: 'programmes/masterclass.html' },
  { id: '_shared', label: 'Contenu partagé (header, footer, newsletter)', file: null },
];

/**
 * GET /api/content — list all pages with metadata
 */
async function listPages(request, env) {
  const pages = [];
  for (const page of PAGES) {
    const meta = await env.CMS_KV.get(`meta:${page.id}`, 'json');
    pages.push({
      ...page,
      lastModified: meta?.lastModified || null,
      modifiedBy: meta?.modifiedBy || null,
    });
  }
  return jsonResponse({ pages });
}

/**
 * GET /api/content/{page-id} — get content for a page
 */
async function getContent(pageId, env) {
  const content = await env.CMS_KV.get(`content:${pageId}`, 'json');
  if (!content) {
    return jsonResponse({ pageId, content: {} });
  }
  return jsonResponse({ pageId, content });
}

/**
 * PUT /api/content/{page-id} — save content for a page
 */
async function putContent(pageId, request, env, user) {
  const validIds = PAGES.map(p => p.id);
  if (!validIds.includes(pageId)) {
    return jsonResponse({ error: `Page inconnue: ${pageId}` }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON invalide' }, 400);
  }

  const { content } = body;
  if (!content || typeof content !== 'object') {
    return jsonResponse({ error: 'Le champ "content" est requis et doit etre un objet' }, 400);
  }

  // Save previous version for undo
  const previous = await env.CMS_KV.get(`content:${pageId}`, 'text');
  if (previous) {
    const timestamp = Date.now();
    await env.CMS_KV.put(`history:${pageId}:${timestamp}`, previous, {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // Save content
  await env.CMS_KV.put(`content:${pageId}`, JSON.stringify(content));

  // Update metadata
  await env.CMS_KV.put(`meta:${pageId}`, JSON.stringify({
    lastModified: new Date().toISOString(),
    modifiedBy: user.email,
  }));

  return jsonResponse({ success: true, pageId });
}

/**
 * GET /api/content/{page-id}/history — get version history
 */
async function getHistory(pageId, env) {
  const list = await env.CMS_KV.list({ prefix: `history:${pageId}:` });
  const versions = list.keys.map(k => {
    const timestamp = parseInt(k.name.split(':').pop());
    return { key: k.name, timestamp, date: new Date(timestamp).toISOString() };
  }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

  return jsonResponse({ pageId, versions });
}

/**
 * POST /api/content/{page-id}/restore/{timestamp} — restore a version
 */
async function restoreVersion(pageId, timestamp, env, user) {
  const historyKey = `history:${pageId}:${timestamp}`;
  const content = await env.CMS_KV.get(historyKey, 'text');
  if (!content) {
    return jsonResponse({ error: 'Version introuvable' }, 404);
  }

  // Save current as new history entry before restoring
  const current = await env.CMS_KV.get(`content:${pageId}`, 'text');
  if (current) {
    await env.CMS_KV.put(`history:${pageId}:${Date.now()}`, current, {
      expirationTtl: 60 * 60 * 24 * 30,
    });
  }

  await env.CMS_KV.put(`content:${pageId}`, content);
  await env.CMS_KV.put(`meta:${pageId}`, JSON.stringify({
    lastModified: new Date().toISOString(),
    modifiedBy: user.email,
    restoredFrom: timestamp,
  }));

  return jsonResponse({ success: true, pageId, restoredFrom: timestamp });
}

/**
 * Main router for /api/content/*
 */
export async function handleContentAPI(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/content', '');

  // GET /api/content — list pages
  if (path === '' || path === '/') {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
    return listPages(request, env);
  }

  // Match /api/content/{page-id}/history
  const historyMatch = path.match(/^\/(.+)\/history$/);
  if (historyMatch) {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
    return getHistory(historyMatch[1], env);
  }

  // Match /api/content/{page-id}/restore/{timestamp}
  const restoreMatch = path.match(/^\/(.+)\/restore\/(\d+)$/);
  if (restoreMatch) {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
    return restoreVersion(restoreMatch[1], restoreMatch[2], env, user);
  }

  // GET or PUT /api/content/{page-id}
  const pageId = path.slice(1); // remove leading /
  if (request.method === 'GET') {
    return getContent(pageId, env);
  }
  if (request.method === 'PUT') {
    return putContent(pageId, request, env, user);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
