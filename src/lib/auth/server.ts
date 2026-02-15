import { createNeonAuth } from '@neondatabase/neon-js/auth/next/server';

export function getAuthConfig() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL ?? process.env.VITE_NEON_AUTH_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

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
  return createNeonAuth(config);
}
