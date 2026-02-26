/**
 * Authentication: login endpoint + middleware
 * Uses PBKDF2 via Web Crypto API for password hashing
 */

import { signJWT, verifyJWT } from './jwt.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token } or { error }
 */
export async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return jsonResponse({ error: 'Email et mot de passe requis' }, 400);
  }

  const adminUsers = (env.ADMIN_USERS || '').split(',').map(e => e.trim().toLowerCase());
  const normalizedEmail = email.trim().toLowerCase();

  if (!adminUsers.includes(normalizedEmail)) {
    return jsonResponse({ error: 'Identifiants incorrects' }, 401);
  }

  // Get the stored hash for this user
  const userKey = normalizedEmail.split('@')[0].replace(/[^a-z0-9]/g, '_').toUpperCase();
  const storedHash = env[`ADMIN_PASSWORD_HASH_${userKey}`];

  if (!storedHash) {
    return jsonResponse({ error: 'Identifiants incorrects' }, 401);
  }

  // Hash the provided password and compare
  const salt = `aixleaders_${normalizedEmail}`;
  const computedHash = await hashPassword(password, salt);

  if (computedHash !== storedHash) {
    return jsonResponse({ error: 'Identifiants incorrects' }, 401);
  }

  const token = await signJWT({ email: normalizedEmail }, env.JWT_SECRET);
  return jsonResponse({ token, email: normalizedEmail });
}

/**
 * POST /api/auth/hash
 * Utility endpoint to generate password hash (remove in production or protect)
 * Body: { email, password }
 */
export async function handleHashPassword(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return jsonResponse({ error: 'Email et mot de passe requis' }, 400);
  }

  const salt = `aixleaders_${email.trim().toLowerCase()}`;
  const hash = await hashPassword(password, salt);

  return jsonResponse({
    email: email.trim().toLowerCase(),
    hash,
    secretName: `ADMIN_PASSWORD_HASH_${email.trim().toLowerCase().split('@')[0].replace(/[^a-z0-9]/g, '_').toUpperCase()}`,
  });
}

/**
 * Auth middleware: wraps a handler, validates JWT
 */
export async function withAuth(request, env, handler) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Non autorise' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    const adminUsers = (env.ADMIN_USERS || '').split(',').map(e => e.trim().toLowerCase());

    if (!adminUsers.includes(payload.email)) {
      return jsonResponse({ error: 'Acces interdit' }, 403);
    }

    return handler(request, env, payload);
  } catch (err) {
    return jsonResponse({ error: 'Token invalide ou expire' }, 401);
  }
}

export { CORS_HEADERS, jsonResponse };
