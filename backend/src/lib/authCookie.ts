import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import type { CookieOptions } from 'hono/utils/cookie';

export const AUTH_COOKIE = 'auth_token';
export const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

/**
 * O cookie só vai com `Secure` (trafega apenas por HTTPS) quando o app é
 * servido por HTTPS, o que se lê do FRONTEND_URL: o CORS já exige que ele
 * seja exatamente o endereço do navegador. Em dev e no CI (http://localhost)
 * fica sem `Secure`, senão o navegador não guardaria a sessão.
 */
export function isSecureCookie(frontendUrl = process.env.FRONTEND_URL): boolean {
  return (frontendUrl ?? '').trim().toLowerCase().startsWith('https://');
}

function options(): CookieOptions {
  return {
    httpOnly: true, // o JS do front não lê o token (protege contra XSS)
    secure: isSecureCookie(),
    sameSite: 'Lax', // não vai em requisições de outros sites (CSRF básico)
    path: '/',
  };
}

export function setAuthCookie(c: Context, token: string) {
  setCookie(c, AUTH_COOKIE, token, { ...options(), maxAge: SESSION_SECONDS });
}

/** Apaga com os mesmos atributos com que foi criado (senão o navegador mantém o original). */
export function clearAuthCookie(c: Context) {
  deleteCookie(c, AUTH_COOKIE, options());
}

/** Produção servida sem HTTPS: a sessão trafegaria sem criptografia. Avisa ao subir. */
export function warnIfInsecureProduction(env = process.env) {
  if (env.NODE_ENV === 'production' && !isSecureCookie(env.FRONTEND_URL)) {
    console.warn(`⚠️  FRONTEND_URL (${env.FRONTEND_URL ?? 'vazio'}) não é https: o cookie de sessão vai sem "Secure".`);
  }
}
