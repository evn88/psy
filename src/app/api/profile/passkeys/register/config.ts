/**
 * Получение домена приложения (Relying Party ID)
 * @returns {string} rpID для WebAuthn
 */
export function getRPID() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
    } catch {}
  }
  return 'localhost';
}

export const rpName = 'Vershkov App';
export const rpID = getRPID();
