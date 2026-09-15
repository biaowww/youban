/* Supabase 自托管访问层：PostgREST（经 kong）+ GoTrue admin。
   service role key 只活在本进程 env，绝不下发客户端。 */

export class Supabase {
  constructor(baseUrl, serviceRoleKey, fetchImpl = fetch) {
    this.base = baseUrl.replace(/\/$/, '');
    this.key = serviceRoleKey;
    this.fetch = fetchImpl;
  }

  #headers(extra = {}) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async rest(pathAndQuery, init = {}) {
    const res = await this.fetch(`${this.base}/rest/v1${pathAndQuery}`, {
      ...init,
      headers: this.#headers(init.headers),
    });
    if (!res.ok) throw new Error(`postgrest ${init.method ?? 'GET'} ${pathAndQuery} HTTP ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }

  /* 匿名先行：经 GoTrue admin 造正式 auth.users 行（满足业务表外键），
     不开全局 anonymous sign-in，避免动共享 Supabase 配置。 */
  async createAnonUser() {
    const res = await this.fetch(`${this.base}/auth/v1/admin/users`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify({
        email: `${crypto.randomUUID()}@anon.youban.local`,
        email_confirm: true,
        user_metadata: { anon: true, created_by: 'youban-bff' },
      }),
    });
    if (!res.ok) throw new Error(`gotrue admin create user HTTP ${res.status}: ${await res.text()}`);
    const j = await res.json();
    if (!j.id) throw new Error('gotrue admin create user: no id in response');
    return j.id;
  }

  async upsertSteamLink(userId, steamId, meta = {}) {
    await this.rest('/user_platform_links?on_conflict=user_id,platform', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, platform: 'steam', platform_uid: steamId, meta }),
    });
  }

  async steamLinkOf(userId) {
    const rows = await this.rest(`/user_platform_links?user_id=eq.${userId}&platform=eq.steam&select=platform_uid,meta,linked_at`);
    return rows[0] ?? null;
  }

  async gameById(gameId) {
    const rows = await this.rest(`/games?id=eq.${encodeURIComponent(gameId)}&select=id,steam_app_id,name`);
    return rows[0] ?? null;
  }

  async gamesSteamAppIds() {
    return this.rest('/games?select=id,steam_app_id,name&published=eq.true');
  }
}
