import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jwtSign, jwtVerify } from '../src/lib/jwt.js';
import { buildLoginUrl, buildVerifyBody, parseSteamId, isVerifyPositive, STEAM_OPENID_ENDPOINT } from '../src/lib/steam.js';

const SECRET = 'test-secret';

test('jwt 往返 + 篡改拒签 + 过期拒签', () => {
  const t = jwtSign({ sub: 'u1' }, SECRET, 60);
  assert.equal(jwtVerify(t, SECRET).sub, 'u1');
  assert.equal(jwtVerify(t + 'x', SECRET), null);
  assert.equal(jwtVerify(t, 'wrong'), null);
  const expired = jwtSign({ sub: 'u1', exp: Math.floor(Date.now() / 1000) - 10 }, SECRET, 60);
  // 注意 jwtSign 的展开顺序让显式 exp 覆盖默认值
  assert.equal(jwtVerify(expired, SECRET), null);
});

test('openid login url 构造', () => {
  const u = new URL(buildLoginUrl('http://127.0.0.1:8302', 'STATE123'));
  assert.equal(u.origin + u.pathname, STEAM_OPENID_ENDPOINT);
  assert.equal(u.searchParams.get('openid.mode'), 'checkid_setup');
  const returnTo = new URL(u.searchParams.get('openid.return_to'));
  assert.equal(returnTo.pathname, '/api/auth/steam/callback');
  assert.equal(returnTo.searchParams.get('state'), 'STATE123');
  assert.equal(u.searchParams.get('openid.realm'), 'http://127.0.0.1:8302');
});

test('claimed_id 解析：只认 steam 官方 op_endpoint + 17 位数字', () => {
  const good = {
    'openid.op_endpoint': STEAM_OPENID_ENDPOINT,
    'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000001',
  };
  assert.equal(parseSteamId(good), '76561198000000001');
  assert.equal(parseSteamId({ ...good, 'openid.op_endpoint': 'https://evil.example/openid' }), null);
  assert.equal(parseSteamId({ ...good, 'openid.claimed_id': 'https://evil.example/openid/id/76561198000000001' }), null);
  assert.equal(parseSteamId({ ...good, 'openid.claimed_id': 'https://steamcommunity.com/openid/id/123' }), null);
});

test('check_authentication 回传体构造：仅 openid.* 且 mode 覆写', () => {
  const body = buildVerifyBody({
    'openid.sig': 'abc', 'openid.mode': 'id_res', state: 'S', other: 'x',
  });
  assert.equal(body.get('openid.mode'), 'check_authentication');
  assert.equal(body.get('openid.sig'), 'abc');
  assert.equal(body.get('state'), null);
  assert.equal(body.get('other'), null);
});

test('is_valid 应答解析', () => {
  assert.equal(isVerifyPositive('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'), true);
  assert.equal(isVerifyPositive('ns:...\nis_valid:false\n'), false);
  assert.equal(isVerifyPositive('is_valid:truefake'), false);
});
