/* Steam OpenID 2.0（stateless / dumb mode）+ Web API 封装。
   纯函数部分（URL 构造 / 应答解析）不碰网络，供单测。 */

export const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export function buildLoginUrl(publicBaseUrl, state) {
  const returnTo = new URL('/api/auth/steam/callback', publicBaseUrl);
  returnTo.searchParams.set('state', state);
  const u = new URL(STEAM_OPENID_ENDPOINT);
  u.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
  u.searchParams.set('openid.mode', 'checkid_setup');
  u.searchParams.set('openid.return_to', returnTo.toString());
  u.searchParams.set('openid.realm', new URL(publicBaseUrl).origin);
  u.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select');
  u.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select');
  return u.toString();
}

/* 从 callback query 提取 openid.* 参数，改 mode 后原样回传 Steam 验签。 */
export function buildVerifyBody(query) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith('openid.')) body.set(k, v);
  }
  body.set('openid.mode', 'check_authentication');
  return body;
}

export function parseSteamId(query) {
  // 防伪造：断言 OP 端点是 Steam 官方，claimed_id 形状严格匹配
  if (query['openid.op_endpoint'] !== STEAM_OPENID_ENDPOINT) return null;
  const m = CLAIMED_ID_RE.exec(query['openid.claimed_id'] ?? '');
  return m ? m[1] : null;
}

export function isVerifyPositive(text) {
  return /(^|\n)is_valid\s*:\s*true\s*($|\n)/.test(text);
}

/* ── 网络侧 ── */

export async function verifyAssertion(query, fetchImpl = fetch) {
  const res = await fetchImpl(STEAM_OPENID_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildVerifyBody(query).toString(),
  });
  if (!res.ok) throw new Error(`steam openid verify HTTP ${res.status}`);
  return isVerifyPositive(await res.text());
}

export class SteamWebApi {
  constructor(apiKey, fetchImpl = fetch) {
    this.key = apiKey;
    this.fetch = fetchImpl;
  }

  async #get(path, params) {
    const u = new URL(`https://api.steampowered.com${path}`);
    u.searchParams.set('key', this.key);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    const res = await this.fetch(u.toString());
    // Steam 对私密资料 / 无效参数返回 403 或 400，body 里不带 key，可安全透传状态
    if (!res.ok) {
      const err = new Error(`steam api HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async ownedGames(steamId) {
    const j = await this.#get('/IPlayerService/GetOwnedGames/v1/', {
      steamid: steamId, include_appinfo: 1, include_played_free_games: 1,
    });
    return j.response?.games ?? [];
  }

  async playerAchievements(steamId, appId) {
    const j = await this.#get('/ISteamUserStats/GetPlayerAchievements/v1/', {
      steamid: steamId, appid: appId, l: 'schinese',
    });
    return j.playerstats ?? {};
  }
}
