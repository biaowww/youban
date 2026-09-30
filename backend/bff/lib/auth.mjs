/* ============================================================
   游伴 YouBan · BFF · 账号（内测期：账号名 + 密码 + 邀请码）
   ────────────────────────────────────────────────────────────
   底座 = Supabase Auth（GoTrue）。BFF 是唯一入口，客户端不直连 GoTrue：
     注册  → GoTrue admin API 建用户（service_role，email_confirm=true，免邮件）
     登录  → GoTrue password grant（anon key）
     续期  → GoTrue refresh_token grant
     校验  → 本地 HS256 验签（JWT_SECRET），不回源
   账号名映射为内部邮箱 <账号>@<emailDomain>（GoTrue 需要 email 或 phone 作主键）。
   之后接手机号 / 微信时，是给**同一个 user_id** 挂新的登录方式，业务表不动。
   密钥纪律：service_role / JWT_SECRET 只在服务端；回给客户端的只有用户自己的 token。
   ============================================================ */
import { jwtVerify } from './jwt.mjs';

export class AuthError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

const ACCOUNT_RE = /^[a-z0-9][a-z0-9_]{2,19}$/;

export function normalizeAccount(raw) {
  const a = String(raw || '').trim().toLowerCase();
  if (!ACCOUNT_RE.test(a)) throw new AuthError('bad_account', '账号需为 3–20 位小写字母 / 数字 / 下划线，且以字母或数字开头');
  return a;
}
export function checkPassword(pw) {
  const p = String(pw || '');
  if (p.length < 8 || p.length > 72) throw new AuthError('bad_password', '密码长度需 8–72 位');
  return p;
}

export function createAuth({ url, anonKey, serviceKey, jwtSecret, inviteCodes = [], emailDomain = 'u.youban.app', fetchImpl = fetch, now = () => Date.now() }) {
  const enabled = Boolean(url && anonKey && serviceKey && jwtSecret);
  const AUTH = String(url || '').replace(/\/$/, '') + '/auth/v1';
  const invites = new Set(inviteCodes.map(s => String(s).trim()).filter(Boolean));

  /* 登录失败节流：同一账号 10 分钟内错 5 次 → 锁 10 分钟（内存态，单实例够用） */
  const fails = new Map();
  const WINDOW = 10 * 60 * 1000, MAX_FAILS = 5;
  function guardThrottle(account) {
    const f = fails.get(account);
    if (f && f.n >= MAX_FAILS && now() - f.first < WINDOW) throw new AuthError('too_many_attempts', '尝试次数过多，请 10 分钟后再试', 429);
    if (f && now() - f.first >= WINDOW) fails.delete(account);
  }
  function noteFail(account) {
    const f = fails.get(account);
    if (!f || now() - f.first >= WINDOW) fails.set(account, { n: 1, first: now() });
    else f.n += 1;
  }

  async function call(path, { method = 'POST', key, body }) {
    const r = await fetchImpl(`${AUTH}${path}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const t = await r.text().catch(() => '');
    let j = null; try { j = t ? JSON.parse(t) : null; } catch { /* 非 JSON */ }
    return { ok: r.ok, status: r.status, json: j, text: t };
  }

  const publicUser = (u) => ({
    id: u.id,
    account: (u.user_metadata && u.user_metadata.account) || String(u.email || '').split('@')[0],
    nickname: (u.user_metadata && u.user_metadata.nickname) || '',
    createdAt: u.created_at || null,
  });
  const session = (j) => ({
    accessToken: j.access_token, refreshToken: j.refresh_token,
    expiresIn: j.expires_in, expiresAt: Math.floor(now() / 1000) + (j.expires_in || 3600),
    user: publicUser(j.user || {}),
  });

  function mustEnabled() { if (!enabled) throw new AuthError('auth_not_configured', '账号服务未配置', 503); }

  return {
    enabled,
    inviteRequired: invites.size > 0,

    async signup({ account, password, invite, nickname }) {
      mustEnabled();
      const acc = normalizeAccount(account);
      const pw = checkPassword(password);
      if (invites.size > 0 && !invites.has(String(invite || '').trim())) throw new AuthError('bad_invite', '邀请码无效', 403);
      const nick = String(nickname || '').trim().slice(0, 24);

      const r = await call('/admin/users', {
        key: serviceKey,
        body: { email: `${acc}@${emailDomain}`, password: pw, email_confirm: true, user_metadata: { account: acc, nickname: nick } },
      });
      if (!r.ok) {
        const msg = (r.json && (r.json.msg || r.json.message || r.json.error_description)) || r.text || '';
        if (r.status === 422 || /already|registered|exists/i.test(msg)) throw new AuthError('account_taken', '这个账号已被注册', 409);
        throw new AuthError('signup_failed', `注册失败（${r.status}）`, 502);
      }
      return this.login({ account: acc, password: pw });
    },

    async login({ account, password }) {
      mustEnabled();
      const acc = normalizeAccount(account);
      guardThrottle(acc);
      const r = await call('/token?grant_type=password', { key: anonKey, body: { email: `${acc}@${emailDomain}`, password: String(password || '') } });
      if (!r.ok) {
        if (r.status === 400 || r.status === 401) { noteFail(acc); throw new AuthError('bad_credentials', '账号或密码不对', 401); }
        throw new AuthError('login_failed', `登录失败（${r.status}）`, 502);
      }
      fails.delete(acc);
      return session(r.json);
    },

    async refresh({ refreshToken }) {
      mustEnabled();
      if (!refreshToken) throw new AuthError('bad_refresh', '缺少 refreshToken');
      const r = await call('/token?grant_type=refresh_token', { key: anonKey, body: { refresh_token: String(refreshToken) } });
      if (!r.ok) throw new AuthError('session_expired', '登录已过期，请重新登录', 401);
      return session(r.json);
    },

    /* 本地验签。返回 {userId, account} 或 null */
    verify(token) {
      if (!enabled) return null;
      const p = jwtVerify(token, jwtSecret, now);
      if (!p || !p.sub || p.role !== 'authenticated') return null;
      const account = (p.user_metadata && p.user_metadata.account) || String(p.email || '').split('@')[0];
      return { userId: p.sub, account };
    },
  };
}
