import { createNeonAuth } from '@neondatabase/neon-js/auth/next/server';

export function getAuthConfig() {
  const baseUrlRaw = process.env.NEON_AUTH_BASE_URL ?? process.env.VITE_NEON_AUTH_URL;
  const cookieSecretRaw = process.env.NEON_AUTH_COOKIE_SECRET;
  const baseUrl = baseUrlRaw?.trim().replace(/\/+$/, '');
  const cookieSecret = cookieSecretRaw?.trim();

  if (!baseUrl || !cookieSecret) {
    return null;
  }

  return {
    baseUrl,
    cookies: {
      secret: cookieSecret,
    },
  };
}

export function getAuth() {
  const config = getAuthConfig();
  if (!config) {
    return null;
  }
  try {
    return createNeonAuth(config);
  } catch (error) {
    console.error('[auth] Failed to initialize Neon auth', error);
    return null;
  }
}
