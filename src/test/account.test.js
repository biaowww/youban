/* ============================================================
   账号 / 进度 / 认领 · 服务端纯逻辑单测（不出网：GoTrue 用假 fetch 顶替）
   覆盖：JWT 验签的拒绝面、注册登录的参数与错误映射、登录节流、
        进度钳制、设备簿认领规则（账号已有则保留账号的）。
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { jwtSign, jwtVerify } from '../../backend/bff/lib/jwt.mjs';
import { createAuth, normalizeAccount, checkPassword, AuthError } from '../../backend/bff/lib/auth.mjs';
import { createMemoryProgress, clampPct } from '../../backend/bff/lib/progress.mjs';
import { createFileStore } from '../../backend/bff/lib/store/file.mjs';

const SECRET = 'test-secret-at-least-32-chars-long-000000';

describe('jwt · HS256 验签', () => {
  it('签发后可验；payload 原样取回', () => {
    const t = jwtSign({ sub: 'u1', role: 'authenticated' }, SECRET, 60);
    expect(jwtVerify(t, SECRET).sub).toBe('u1');
  });
  it('拒绝：错 secret / 篡改 / 过期 / alg=none / 残缺', () => {
    const t = jwtSign({ sub: 'u1' }, SECRET, 60);
    expect(jwtVerify(t, SECRET + 'x')).toBeNull();
    const [h, b, s] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9999999999 })).toString('base64url');
    expect(jwtVerify(`${h}.${forged}.${s}`, SECRET)).toBeNull();
    expect(jwtVerify(jwtSign({ sub: 'u1' }, SECRET, -10), SECRET)).toBeNull();
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    expect(jwtVerify(`${none}.${b}.`, SECRET)).toBeNull();
    expect(jwtVerify('not-a-jwt', SECRET)).toBeNull();
    expect(jwtVerify('', SECRET)).toBeNull();
  });
});

/* 假 GoTrue：记录调用，按路径回包 */
function fakeGoTrue({ existing = new Set(), password = 'correct-horse' } = {}) {
  const calls = [];
  const users = new Map();
  const mkSession = (email) => ({
    access_token: jwtSign({ sub: 'uid-' + email, role: 'authenticated', email, user_metadata: { account: email.split('@')[0] } }, SECRET, 3600),
    refresh_token: 'r-' + email, expires_in: 3600,
    user: { id: 'uid-' + email, email, user_metadata: users.get(email) || { account: email.split('@')[0] } },
  });
  const res = (status, obj) => ({ ok: status < 300, status, text: async () => JSON.stringify(obj) });
  const fetchImpl = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({ url, key: init.headers.apikey, body });
    if (url.endsWith('/admin/users')) {
      if (existing.has(body.email)) return res(422, { msg: 'A user with this email address has already been registered' });
      existing.add(body.email); users.set(body.email, body.user_metadata);
      return res(200, { id: 'uid-' + body.email, email: body.email });
    }
    if (url.includes('grant_type=password')) {
      if (!existing.has(body.email) || body.password !== password) return res(400, { error_description: 'Invalid login credentials' });
      return res(200, mkSession(body.email));
    }
    if (url.includes('grant_type=refresh_token')) {
      if (!String(body.refresh_token).startsWith('r-')) return res(400, { error: 'invalid_grant' });
      return res(200, mkSession(String(body.refresh_token).slice(2)));
    }
    return res(404, {});
  };
  return { fetchImpl, calls };
}
const mkAuth = (over = {}) => {
  const g = fakeGoTrue(over.gotrue);
  const auth = createAuth({ url: 'http://sb', anonKey: 'ANON', serviceKey: 'SERVICE', jwtSecret: SECRET, inviteCodes: ['YB-2026'], fetchImpl: g.fetchImpl, ...over });
  return { auth, calls: g.calls };
};

describe('auth · 参数校验', () => {
  it('账号名规范化与非法拒绝', () => {
    expect(normalizeAccount('  WangBiao_01 ')).toBe('wangbiao_01');
    for (const bad of ['ab', '_abc', '有中文', 'a b c', 'x'.repeat(21), '']) expect(() => normalizeAccount(bad)).toThrow(AuthError);
  });
  it('密码长度', () => {
    expect(() => checkPassword('1234567')).toThrow(AuthError);
    expect(checkPassword('12345678')).toBe('12345678');
  });
});

describe('auth · 注册 / 登录 / 续期', () => {
  it('注册：邀请码对 → 用 service key 建用户、用 anon key 登录，回会话', async () => {
    const { auth, calls } = mkAuth();
    const s = await auth.signup({ account: 'Biao', password: 'correct-horse', invite: 'YB-2026', nickname: '彪' });
    expect(s.user.account).toBe('biao');
    expect(s.user.nickname).toBe('彪');
    expect(s.accessToken && s.refreshToken).toBeTruthy();
    expect(calls[0].url).toContain('/admin/users');
    expect(calls[0].key).toBe('SERVICE');
    expect(calls[0].body.email).toBe('biao@u.youban.app');
    expect(calls[0].body.email_confirm).toBe(true);
    expect(calls[1].key).toBe('ANON');
    /* 回包里绝不能带服务端密钥 */
    expect(JSON.stringify(s)).not.toContain('SERVICE');
  });
  it('邀请码错 → 403，且根本不去碰 GoTrue', async () => {
    const { auth, calls } = mkAuth();
    await expect(auth.signup({ account: 'biao', password: 'correct-horse', invite: 'nope' })).rejects.toMatchObject({ code: 'bad_invite', status: 403 });
    expect(calls.length).toBe(0);
  });
  it('账号已存在 → 409', async () => {
    const { auth } = mkAuth({ gotrue: { existing: new Set(['biao@u.youban.app']) } });
    await expect(auth.signup({ account: 'biao', password: 'correct-horse', invite: 'YB-2026' })).rejects.toMatchObject({ code: 'account_taken', status: 409 });
  });
  it('密码错 → 401；连错 5 次后第 6 次直接 429（不再回源）', async () => {
    const { auth, calls } = mkAuth({ gotrue: { existing: new Set(['biao@u.youban.app']) } });
    for (let i = 0; i < 5; i++) await expect(auth.login({ account: 'biao', password: 'wrong-wrong' })).rejects.toMatchObject({ code: 'bad_credentials' });
    const n = calls.length;
    await expect(auth.login({ account: 'biao', password: 'correct-horse' })).rejects.toMatchObject({ code: 'too_many_attempts', status: 429 });
    expect(calls.length).toBe(n);
  });
  it('续期：有效 refreshToken 换新会话；无效 → 401', async () => {
    const { auth } = mkAuth({ gotrue: { existing: new Set(['biao@u.youban.app']) } });
    const s = await auth.login({ account: 'biao', password: 'correct-horse' });
    expect((await auth.refresh({ refreshToken: s.refreshToken })).user.account).toBe('biao');
    await expect(auth.refresh({ refreshToken: 'garbage' })).rejects.toMatchObject({ code: 'session_expired', status: 401 });
  });
  it('verify：只认 role=authenticated 的有效 token（service_role / anon token 不算登录）', async () => {
    const { auth } = mkAuth();
    expect(auth.verify(jwtSign({ sub: 'u1', role: 'authenticated', email: 'a@u.youban.app' }, SECRET))).toMatchObject({ userId: 'u1', account: 'a' });
    expect(auth.verify(jwtSign({ role: 'service_role' }, SECRET))).toBeNull();
    expect(auth.verify(jwtSign({ sub: 'u1', role: 'anon' }, SECRET))).toBeNull();
    expect(auth.verify('junk')).toBeNull();
  });
  it('未配置 → enabled=false，端点抛 503，verify 恒 null', async () => {
    const auth = createAuth({ url: '', anonKey: '', serviceKey: '', jwtSecret: '' });
    expect(auth.enabled).toBe(false);
    await expect(auth.login({ account: 'biao', password: 'x'.repeat(8) })).rejects.toMatchObject({ status: 503 });
    expect(auth.verify(jwtSign({ sub: 'u', role: 'authenticated' }, SECRET))).toBeNull();
  });
});

describe('progress · 进度存取', () => {
  it('钳制到 0–100 的整数；非法来源回落 manual；按用户隔离', async () => {
    expect([clampPct(-5), clampPct(133), clampPct('61.6'), clampPct('abc')]).toEqual([0, 100, 62, 0]);
    const p = createMemoryProgress();
    await p.upsert('u1', 'bloodborne', 250, 'hack');
    await p.upsert('u1', 'bloodborne', 40, 'manual');
    await p.upsert('u2', 'bloodborne', 9, 'steam');
    const mine = await p.list('u1');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ gameId: 'bloodborne', pct: 40, source: 'manual' });
    expect((await p.list('u2'))[0].pct).toBe(9);
    expect(JSON.stringify(mine)).not.toContain('u1');
  });
});

describe('store · 设备簿认领', () => {
  it('账号没有的游戏 → 归账号；账号已有的 → 保留账号的，设备簿不动', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'yb-claim-'));
    try {
      const store = createFileStore(dir);
      const dev = { deviceId: 'device-abc-123' }, user = { userId: 'user-1' };
      const d1 = await store.openSession(dev, 'bloodborne');
      await store.appendMessages(d1.sessionId, [{ role: 'user', content: '设备上问的', pct: 8 }, { role: 'assistant', content: '答', pct: 8 }]);
      await store.openSession(dev, 'jedi_fo');
      const u2 = await store.openSession(user, 'jedi_fo');
      await store.appendMessages(u2.sessionId, [{ role: 'user', content: '账号上问的', pct: 30 }, { role: 'assistant', content: '答', pct: 30 }]);

      const r = await store.claimDevice('user-1', 'device-abc-123');
      expect(r.claimed).toEqual(['bloodborne']);
      expect(r.kept).toEqual(['jedi_fo']);

      const mineBB = await store.openSession(user, 'bloodborne');
      expect(mineBB.messages[0].content).toBe('设备上问的');
      expect(mineBB.turns).toBe(1);
      const mineJedi = await store.openSession(user, 'jedi_fo');
      expect(mineJedi.messages[0].content).toBe('账号上问的');
      /* 幂等：再认领一次不出错、不重复 */
      const again = await store.claimDevice('user-1', 'device-abc-123');
      expect(again.claimed).toEqual([]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
