/* ============================================================
   游伴 YouBan · BFF · JWT（HS256，零依赖）
   用途：本地校验 Supabase Auth（GoTrue）签发的 access_token。
   GoTrue 用 JWT_SECRET 做 HS256 签名 → BFF 拿同一把 secret 本地验签，
   不必每个请求回源 /auth/v1/user（省一跳，也不依赖 Kong 在线）。
   sign 仅供测试与内部 state 使用。
   ============================================================ */
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function jwtSign(payload, secret, ttlSec = 3600, now = () => Date.now()) {
  const iat = Math.floor(now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iat, exp: iat + ttlSec, ...payload }));
  const sig = b64u(createHmac('sha256', secret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

/* 返回 payload；任何不合法（格式 / 算法 / 签名 / 过期）一律返回 null，不抛 */
export function jwtVerify(token, secret, now = () => Date.now()) {
  try {
    if (!token || !secret) return null;
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const [head, body, sig] = parts;
    const h = JSON.parse(unb64u(head).toString('utf8'));
    if (h.alg !== 'HS256') return null;               // 拒绝 none / RS* 等算法混淆
    const expect = createHmac('sha256', secret).update(`${head}.${body}`).digest();
    const got = unb64u(sig);
    if (got.length !== expect.length || !timingSafeEqual(got, expect)) return null;
    const p = JSON.parse(unb64u(body).toString('utf8'));
    if (typeof p.exp === 'number' && p.exp * 1000 < now()) return null;
    return p;
  } catch { return null; }
}
