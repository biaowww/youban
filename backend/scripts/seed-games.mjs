/* ============================================================
   游伴 YouBan · 游戏内容 seed 脚本
   把仓库 src/data/games/*.json 全量 upsert 到线上 games 表。
   零依赖（Node 18+ 自带 fetch），在仓库任意位置可跑：

     SUPABASE_URL=https://api.example.com \
     SERVICE_ROLE_KEY=eyJ... \
     node backend/scripts/seed-games.mjs

   说明：
   - SERVICE_ROLE_KEY 只在服务端/运维机使用，绝不进客户端。
   - upsert 以 id 为冲突键（merge-duplicates），幂等可重复跑。
   - 每次跑会把 version +1 交给数据库端？——否：version 由本脚本按
     内容哈希判断，内容没变不动行（避免客户端缓存无谓失效）。
   ============================================================ */
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('缺少环境变量：SUPABASE_URL / SERVICE_ROLE_KEY');
  process.exit(1);
}

const GAMES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'games');
const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// jsonb 回读会重排对象键序 → 哈希前先做键序无关的规范化，否则每次重跑都误判内容变更
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const hashOf = (obj) => createHash('sha256').update(JSON.stringify(canon(obj))).digest('hex').slice(0, 16);

async function main() {
  const files = readdirSync(GAMES_DIR).filter((f) => f.endsWith('.json')).sort();
  console.log(`发现 ${files.length} 个游戏 JSON`);

  // 拉现有行（id, version, data 哈希比对用 meta 字段不存在 → 直接拉 data 太重；拉 id+version 即可，内容比对在库端做不了就全量 upsert）
  const existing = await fetch(`${REST}/games?select=id,version,data`, { headers: HEADERS }).then((r) => r.json());
  const byId = new Map((Array.isArray(existing) ? existing : []).map((r) => [r.id, r]));

  let upserted = 0, skipped = 0;
  for (const f of files) {
    const g = JSON.parse(readFileSync(path.join(GAMES_DIR, f), 'utf8'));
    const prev = byId.get(g.id);
    if (prev && hashOf(prev.data) === hashOf(g)) { skipped++; continue; }

    const row = {
      id: g.id,
      steam_app_id: g.steamAppId ?? null,
      name: g.name,
      title_main: g.titleMain ?? g.name,
      title_sub: g.titleSub ?? '',
      short: g.short ?? g.name,
      genre: g.genre ?? '',
      developer: g.developer ?? null,
      year: g.year ?? null,
      total_hours_main: g.totalHoursMain ?? null,
      data: g,
      version: prev ? prev.version + 1 : 1,
      published: true,
    };
    const res = await fetch(`${REST}/games?on_conflict=id`, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.error(`✗ ${g.id}: HTTP ${res.status} ${await res.text()}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`✓ ${g.id} → version ${row.version}`);
    upserted++;
  }
  console.log(`完成：upsert ${upserted} · 内容未变跳过 ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
