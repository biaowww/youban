/* ============================================================
   游伴 YouBan · 账号与跨端同步（客户端侧，可测、双环境）
   - 会话：登录 / 注册 / 续期 / 退出；token 存 localStorage（yb_session）
   - 进度同步：登录后拉取 → 与本机合并 → 之后每次改动推送；断网时入待发队列
   - 认领：把这台设备未登录时写的攻略簿归到账号名下
   说明：普通脚本（同 adapt.js），不经 build:ui；浏览器里挂 window.YBAccount，
        Node/Vitest 里经 module.exports 导出。服务端契约见 backend/bff/README.md。
   密钥纪律：这里只有用户自己的 token，没有任何服务端密钥。
   ============================================================ */
(function (root) {
  const LOCAL_DEFAULT = 'http://127.0.0.1:8787';
  const K_SESSION = 'yb_session', K_PENDING = 'yb_progress_pending', K_OWNER = 'yb_progress_owner', K_DEVICE = 'yb_device';

  const store = {
    get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* noop */ } },
    del(k) { try { root.localStorage.removeItem(k); } catch (e) { /* noop */ } },
    json(k, d) { try { const v = JSON.parse(this.get(k)); return v == null ? d : v; } catch (e) { return d; } },
  };
  const nowSec = () => Math.floor(Date.now() / 1000);

  function base() {
    const v = store.get('yb_bff');
    if (v) return v.replace(/\/$/, '');
    if (root.__YB_BFF__) return String(root.__YB_BFF__).replace(/\/$/, '');
    return LOCAL_DEFAULT;
  }
  function deviceId() {
    let d = store.get(K_DEVICE);
    if (!d) {
      d = (root.crypto && root.crypto.randomUUID) ? root.crypto.randomUUID()
        : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      store.set(K_DEVICE, d);
    }
    return d || ('dev-volatile-' + Date.now().toString(36));
  }

  /* ───────── 会话 ───────── */
  let session = store.json(K_SESSION, null);
  if (session && !(session.accessToken && session.refreshToken && session.user)) session = null;
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(current()); } catch (e) { /* noop */ } });
  function setSession(s) {
    session = s || null;
    if (session) store.set(K_SESSION, JSON.stringify(session)); else store.del(K_SESSION);
    emit();
    return session;
  }
  function current() { return session ? session.user : null; }
  function tokenSync() { return session && session.expiresAt - nowSec() > 5 ? session.accessToken : null; }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  class ApiError extends Error {
    constructor(message, status, code) { super(message); this.status = status; this.code = code; }
  }
  async function call(method, path, body, headers) {
    if (typeof root.fetch !== 'function') throw new ApiError('当前环境无法联网', 0, 'no_fetch');
    let r;
    try {
      r = await root.fetch(base() + path, {
        method, headers: Object.assign(body === undefined ? {} : { 'Content-Type': 'application/json' }, headers || {}),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) { throw new ApiError('连不上服务器，检查网络后再试', 0, 'network'); }
    let j = null; try { j = await r.json(); } catch (e) { /* 非 JSON */ }
    if (!r.ok) throw new ApiError((j && j.error) || ('请求失败（' + r.status + '）'), r.status, j && j.code);
    return j;
  }

  async function signup(form) { return setSession(await call('POST', '/api/auth/signup', form)).user; }
  async function login(form) { return setSession(await call('POST', '/api/auth/login', form)).user; }
  function logout() { setSession(null); }

  /* 续期：离过期不足 60 秒才换；并发只发一次。续期被拒（401）= 登录失效 → 清会话 */
  let refreshing = null;
  async function ensureFresh(force) {
    if (!session) return null;
    if (!force && session.expiresAt - nowSec() > 60) return session.accessToken;
    if (!refreshing) {
      const rt = session.refreshToken;
      refreshing = call('POST', '/api/auth/refresh', { refreshToken: rt })
        .then(s => setSession(s).accessToken)
        .catch(e => { if (e.status === 401) setSession(null); return tokenSync(); })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function authCall(method, path, body, extraHeaders) {
    let t = await ensureFresh();
    if (!t) throw new ApiError('未登录', 401, 'unauthorized');
    const h = (tok) => Object.assign({ Authorization: 'Bearer ' + tok }, extraHeaders || {});
    try { return await call(method, path, body, h(t)); } catch (e) {
      if (e.status !== 401) throw e;
      t = await ensureFresh(true);
      if (!t) throw e;
      return call(method, path, body, h(t));
    }
  }

  /* ───────── 进度同步 ─────────
     合并规则（纯函数，单测覆盖）：
       云端有 → 以云端为准（跨端互通的那份才是真相）；
       云端没有、本机有 → 保留本机并推上去——但仅当本机这份数据属于「游客」或「同一账号」，
         换了账号登录时绝不把上一个人的进度灌进新账号。 */
  function mergeProgress(local, remote, opts) {
    const adoptLocal = !opts || opts.adoptLocal !== false;
    const merged = {}, toPush = [];
    Object.keys(remote || {}).forEach(id => { merged[id] = remote[id]; });
    if (adoptLocal) {
      Object.keys(local || {}).forEach(id => {
        if (merged[id] === undefined && typeof local[id] === 'number') { merged[id] = local[id]; toPush.push(id); }
      });
    }
    return { merged, toPush };
  }
  async function pullProgress() {
    const j = await authCall('GET', '/api/me/progress');
    const out = {};
    (j.progress || []).forEach(r => { out[r.gameId] = Math.round(Number(r.pct)); });
    return out;
  }
  async function pushProgress(gameId, pct, source) {
    if (!session || !gameId) return false;
    const pending = store.json(K_PENDING, {});
    pending[gameId] = pct;
    store.set(K_PENDING, JSON.stringify(pending));
    return flushPending(source);
  }
  let flushing = null;
  async function flushPending(source) {
    if (!session) return false;
    if (flushing) return flushing;
    flushing = (async () => {
      const pending = store.json(K_PENDING, {});
      const ids = Object.keys(pending);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i], pct = pending[id];
        try { await authCall('PUT', '/api/me/progress/' + encodeURIComponent(id), { pct, source: source || 'manual' }); }
        catch (e) { if (e.status === 404) { /* 云端没有这款游戏：丢弃该条 */ } else return false; }
        const cur = store.json(K_PENDING, {});
        if (cur[id] === pct) { delete cur[id]; store.set(K_PENDING, JSON.stringify(cur)); }
      }
      return true;
    })().finally(() => { flushing = null; });
    return flushing;
  }
  /* 登录后的一次性对账：返回合并后的 {gameId: pct}，并把本机独有的推上去 */
  async function syncProgress(local) {
    const me = current();
    if (!me) return null;
    const owner = store.get(K_OWNER);
    const adoptLocal = !owner || owner === me.id;
    if (!adoptLocal) store.del(K_PENDING);          // 上一个账号的待发队列不能带过来
    else await flushPending();                      // 先把自己断网时攒的发掉，再拉
    const remote = await pullProgress();
    const { merged, toPush } = mergeProgress(local, remote, { adoptLocal });
    store.set(K_OWNER, me.id);
    for (let i = 0; i < toPush.length; i++) await pushProgress(toPush[i], merged[toPush[i]]);
    return merged;
  }
  async function claimDevice() {
    return authCall('POST', '/api/me/claim-device', {}, { 'x-yb-device': deviceId() });
  }
  async function serverInfo() {
    try { return await call('GET', '/health'); } catch (e) { return null; }
  }

  const api = {
    base, deviceId, current, tokenSync, onChange, signup, login, logout, ensureFresh,
    mergeProgress, pullProgress, pushProgress, flushPending, syncProgress, claimDevice, serverInfo,
    _setSessionForTest: setSession,
  };
  root.YBAccount = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
