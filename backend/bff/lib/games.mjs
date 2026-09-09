/* ============================================================
   游伴 YouBan · BFF · 游戏内容读取
   直接读 src/data/games/*.json（与客户端同一真相源），启动时载入内存。
   不依赖 Supabase games 表，本地/线上行为一致；内容更新 = 换文件 + 重启。
   ============================================================ */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function loadGames(dir) {
  const map = new Map();
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
    try {
      const g = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
      if (g && g.id) map.set(g.id, g);
    } catch (e) {
      console.warn(`[games] 跳过无法解析的 ${f}: ${e.message}`);
    }
  }
  return map;
}

/* 给客户端核对用的精简清单（不含全量内容） */
export function listGames(map) {
  return [...map.values()].map(g => ({
    id: g.id, short: g.short || g.name, titleMain: g.titleMain || g.name, platforms: g.platforms || [],
  }));
}
