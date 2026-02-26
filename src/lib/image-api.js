/**
 * Image management API — upload/list/delete via Cloudflare R2
 */

import { jsonResponse } from './auth.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/images/upload — upload an image to R2
 * Expects multipart/form-data with a "file" field
 */
async function uploadImage(request, env) {
  const contentType = request.headers.get('Content-Type') || '';

  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/octet-stream')) {
    return jsonResponse({ error: 'Content-Type multipart/form-data ou application/octet-stream requis' }, 400);
  }

  let file, filename, mimeType;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    file = formData.get('file');
    if (!file || typeof file === 'string') {
      return jsonResponse({ error: 'Champ "file" requis' }, 400);
    }
    filename = file.name || 'upload';
    mimeType = file.type;
  } else {
    file = await request.arrayBuffer();
    filename = new URL(request.url).searchParams.get('filename') || 'upload';
    mimeType = contentType;
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return jsonResponse({ error: `Type non autorise: ${mimeType}. Types acceptes: ${ALLOWED_TYPES.join(', ')}` }, 400);
  }

  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_SIZE) {
    return jsonResponse({ error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} MB)` }, 400);
  }

  // Sanitize filename and add timestamp
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const key = `${Date.now()}-${sanitized}`;

  await env.CMS_IMAGES.put(key, arrayBuffer, {
    httpMetadata: { contentType: mimeType },
  });

  return jsonResponse({
    success: true,
    key,
    url: `/cms-images/${key}`,
    size: arrayBuffer.byteLength,
    type: mimeType,
  });
}

/**
 * GET /api/images — list all uploaded images
 */
async function listImages(env) {
  const list = await env.CMS_IMAGES.list({ limit: 500 });
  const images = list.objects.map(obj => ({
    key: obj.key,
    url: `/cms-images/${obj.key}`,
    size: obj.size,
    uploaded: obj.uploaded,
  }));

  return jsonResponse({ images });
}

/**
 * DELETE /api/images/{key} — delete an image from R2
 */
async function deleteImage(key, env) {
  await env.CMS_IMAGES.delete(key);
  return jsonResponse({ success: true, deleted: key });
}

/**
 * Serve an image from R2 (public, no auth required)
 * GET /cms-images/{key}
 */
export async function serveImage(key, env) {
  const object = await env.CMS_IMAGES.get(key);
  if (!object) {
    return new Response('Image introuvable', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

/**
 * Main router for /api/images/*
 */
export async function handleImageAPI(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/images', '');

  if (path === '/upload' && request.method === 'POST') {
    return uploadImage(request, env);
  }

  if ((path === '' || path === '/') && request.method === 'GET') {
    return listImages(env);
  }

  if (path.length > 1 && request.method === 'DELETE') {
    const key = path.slice(1);
    return deleteImage(key, env);
  }

  return jsonResponse({ error: 'Route non trouvee' }, 404);
}
