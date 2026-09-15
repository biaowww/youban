/* 最小 HS256 JWT——BFF 会话与 OpenID state 都用它签。
   不引第三方库：面积小、可审计，密钥只在服务器 env。 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data, secret) => b64u(createHmac('sha256', secret).update(data).digest());

export function jwtSign(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + ttlSeconds, ...payload };
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = b64u(JSON.stringify(body));
  return `${head}.${claims}.${sign(`${head}.${claims}`, secret)}`;
}

export function jwtVerify(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, claims, sig] = parts;
  const expect = sign(`${head}.${claims}`, secret);
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8'));
  } catch { return null; }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
