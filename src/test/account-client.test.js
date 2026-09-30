/* ============================================================
   账号客户端（renderer/account.js）· 单测（jsdom；服务器用假 fetch 顶替）
   覆盖：进度合并规则、换账号不串数据、断网入队与补发、token 续期与失效清会话。
   ============================================================ */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'renderer', 'account.js'), 'utf8');
const nowSec = () => Math.floor(Date.now() / 1000);

/* 每个用例一套全新环境：独立的 localStorage / fetch / 模块实例 */
function boot({ session = null, storage = {}, handler } = {}) {
  const mem = new Map(Object.entries(storage));
  if (session) mem.set('yb_session', JSON.stringify(session));
  const calls = [];
  const root = {
    localStorage: { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
    crypto: { randomUUID: () => 'device-uuid-0001' },
    __YB_BFF__: 'https://api.test/yb/',
    fetch: async (url, init) => {
      const c = { url, method: init.method, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined };
      calls.push(c);
      const out = await handler(c);
      if (out === 'NETWORK') throw new TypeError('Failed to fetch');
      return { ok: out.status < 300, status: out.status, json: async () => out.body };
    },
  };
  const mod = { exports: {} };
  new Function('window', 'module', SRC.replace("typeof window !== 'undefined' ? window : globalThis", 'window'))(root, mod);
  return { A: mod.exports, calls, mem };
}
const sess = (over = {}) => ({ accessToken: 'AT1', refreshToken: 'RT1', expiresAt: nowSec() + 3600, user: { id: 'user-1', account: 'biao', nickname: '彪' }, ...over });

describe('mergeProgress · 合并规则', () => {
  const { A } = boot({ handler: async () => ({ status: 200, body: {} }) });
  it('云端有 → 用云端；本机独有 → 保留并列入待推', () => {
    const r = A.mergeProgress({ bloodborne: 40, jedi_fo: 12 }, { bloodborne: 55, wukong: 61 });
    expect(r.merged).toEqual({ bloodborne: 55, wukong: 61, jedi_fo: 12 });
    expect(r.toPush).toEqual(['jedi_fo']);
  });
  it('adoptLocal=false（换了账号）→ 本机数据一条都不带', () => {
    const r = A.mergeProgress({ bloodborne: 40, jedi_fo: 12 }, { wukong: 61 }, { adoptLocal: false });
    expect(r.merged).toEqual({ wukong: 61 });
    expect(r.toPush).toEqual([]);
  });
});

describe('会话 · 地址与身份', () => {
  it('服务地址去尾斜杠；未登录时 current/tokenSync 为空', () => {
    const { A } = boot({ handler: async () => ({ status: 200, body: {} }) });
    expect(A.base()).toBe('https://api.test/yb');
    expect(A.current()).toBeNull();
    expect(A.tokenSync()).toBeNull();
    expect(A.deviceId()).toBe('device-uuid-0001');
  });
  it('登录成功 → 存会话、通知监听者；退出 → 清会话', async () => {
    const { A, mem } = boot({ handler: async (c) => (c.url.endsWith('/api/auth/login') ? { status: 200, body: sess() } : { status: 404, body: {} }) });
    const seen = [];
    A.onChange(u => seen.push(u ? u.account : null));
    const u = await A.login({ account: 'biao', password: 'x'.repeat(8) });
    expect(u.account).toBe('biao');
    expect(JSON.parse(mem.get('yb_session')).refreshToken).toBe('RT1');
    A.logout();
    expect(mem.has('yb_session')).toBe(false);
    expect(seen).toEqual(['biao', null]);
  });
  it('登录失败 → 抛出服务端给的中文原因，不存会话', async () => {
    const { A, mem } = boot({ handler: async () => ({ status: 401, body: { error: '账号或密码不对', code: 'bad_credentials' } }) });
    await expect(A.login({ account: 'biao', password: 'wrong-wrong' })).rejects.toMatchObject({ message: '账号或密码不对', status: 401 });
    expect(mem.has('yb_session')).toBe(false);
  });
  it('损坏的本机会话 → 视为未登录', () => {
    const { A } = boot({ storage: { yb_session: '{"accessToken":"x"}' }, handler: async () => ({ status: 200, body: {} }) });
    expect(A.current()).toBeNull();
  });
});

describe('续期', () => {
  it('离过期 > 60s 不续；快过期才续，且并发只发一次', async () => {
    let n = 0;
    const { A, calls } = boot({
      session: sess({ expiresAt: nowSec() + 20 }),
      handler: async (c) => { if (c.url.endsWith('/refresh')) { n++; return { status: 200, body: sess({ accessToken: 'AT2', refreshToken: 'RT2' }) }; } return { status: 200, body: {} }; },
    });
    const [a, b] = await Promise.all([A.ensureFresh(), A.ensureFresh()]);
    expect([a, b]).toEqual(['AT2', 'AT2']);
    expect(n).toBe(1);
    expect(calls[0].body).toEqual({ refreshToken: 'RT1' });
    await A.ensureFresh();
    expect(n).toBe(1);
  });
  it('续期被拒 401 → 清会话（回到未登录）', async () => {
    const { A } = boot({ session: sess({ expiresAt: nowSec() - 5 }), handler: async () => ({ status: 401, body: { error: '登录已过期' } }) });
    expect(await A.ensureFresh()).toBeNull();
    expect(A.current()).toBeNull();
  });
  it('续期时断网 → 不清会话（等联网再说）', async () => {
    const { A } = boot({ session: sess({ expiresAt: nowSec() + 20 }), handler: async () => 'NETWORK' });
    await A.ensureFresh();
    expect(A.current().account).toBe('biao');
  });
});

describe('进度同步', () => {
  const server = (remote) => async (c) => {
    if (c.url.endsWith('/api/me/progress') && c.method === 'GET') return { status: 200, body: { progress: Object.entries(remote).map(([gameId, pct]) => ({ gameId, pct })) } };
    if (c.method === 'PUT') { remote[decodeURIComponent(c.url.split('/').pop())] = c.body.pct; return { status: 200, body: {} }; }
    return { status: 404, body: {} };
  };
  it('首次登录（本机是游客数据）→ 云端为准 + 本机独有的推上去；请求都带 Bearer', async () => {
    const remote = { bloodborne: 55 };
    const { A, calls, mem } = boot({ session: sess(), handler: server(remote) });
    const merged = await A.syncProgress({ bloodborne: 40, jedi_fo: 12 });
    expect(merged).toEqual({ bloodborne: 55, jedi_fo: 12 });
    expect(remote).toEqual({ bloodborne: 55, jedi_fo: 12 });
    expect(mem.get('yb_progress_owner')).toBe('user-1');
    expect(calls.every(c => c.headers.Authorization === 'Bearer AT1')).toBe(true);
  });
  it('换账号登录 → 上一个人的本机进度与待发队列都不带过来', async () => {
    const remote = { wukong: 61 };
    const { A, mem } = boot({
      session: sess({ user: { id: 'user-2', account: 'other' } }),
      storage: { yb_progress_owner: 'user-1', yb_progress_pending: JSON.stringify({ bloodborne: 99 }) },
      handler: server(remote),
    });
    const merged = await A.syncProgress({ bloodborne: 40 });
    expect(merged).toEqual({ wukong: 61 });
    expect(remote).toEqual({ wukong: 61 });
    expect(mem.has('yb_progress_pending')).toBe(false);
    expect(mem.get('yb_progress_owner')).toBe('user-2');
  });
  it('断网时推送 → 进待发队列；联网后补发并清队列', async () => {
    let online = false; const remote = {};
    const { A, mem } = boot({ session: sess(), handler: async (c) => (online ? server(remote)(c) : 'NETWORK') });
    expect(await A.pushProgress('bloodborne', 37)).toBe(false);
    expect(JSON.parse(mem.get('yb_progress_pending'))).toEqual({ bloodborne: 37 });
    await A.pushProgress('bloodborne', 41);           // 同一款只留最新值
    online = true;
    expect(await A.flushPending()).toBe(true);
    expect(remote).toEqual({ bloodborne: 41 });
    expect(JSON.parse(mem.get('yb_progress_pending'))).toEqual({});
  });
  it('未登录时 pushProgress 什么都不做', async () => {
    const { A, calls } = boot({ handler: async () => ({ status: 200, body: {} }) });
    expect(await A.pushProgress('bloodborne', 10)).toBe(false);
    expect(calls.length).toBe(0);
  });
  it('请求被拒 401 → 强制续期后重试一次', async () => {
    let first = true;
    const { A, calls } = boot({
      session: sess(),
      handler: async (c) => {
        if (c.url.endsWith('/refresh')) return { status: 200, body: sess({ accessToken: 'AT2' }) };
        if (first) { first = false; return { status: 401, body: { error: '登录已过期' } }; }
        return { status: 200, body: { progress: [] } };
      },
    });
    expect(await A.pullProgress()).toEqual({});
    expect(calls.map(c => c.headers.Authorization).filter(Boolean)).toEqual(['Bearer AT1', 'Bearer AT2']);
  });
});
