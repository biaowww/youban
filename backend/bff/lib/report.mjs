/* ============================================================
   游伴 YouBan · 攻略簿 · 战报导出（纯函数 → Markdown）
   把「进度推导 + 状态卡」渲染成一份可分享/可存档的玩家进度战报。
   ============================================================ */
import { deriveState } from './gameBrief.mjs';

const li = (arr) => (arr && arr.length ? arr.map(x => `- ${x}`).join('\n') : '- （无）');

export function renderReport({ game, pct, card, turns = 0, guard = true, now = new Date() }) {
  const st = deriveState(game, pct);
  const term = game.bossTerm || 'Boss 战';
  const c = card || {};
  const date = now.toISOString().slice(0, 10);

  const L = [];
  L.push(`# 《${game.titleMain || game.name}》攻略簿 · 战报`);
  L.push('');
  L.push(`> ${date} · 进度 **${pct}%** · 对话 ${turns} 轮 · 防剧透 ${guard ? '开' : '关'}`);
  L.push('');
  L.push('## 我在哪');
  if (st.current) {
    L.push(`**${st.current.name}**（${st.current.progressStart}–${st.current.progressEnd}%）· ${st.current.planet || ''}`);
    if (st.current.playerGoals) L.push(`本章目标：${st.current.playerGoals}`);
  } else L.push('（尚未开始）');
  L.push('');
  L.push(`## 已经历的${term}`);
  L.push(li(st.passedBosses.map(b => `${b.name} · ${b.progressPct}%`)));
  L.push('');
  L.push('## 下一步');
  L.push(st.nextBoss ? `下一个${term}：**${st.nextBoss.name}**（${st.nextBoss.planet || ''}，${st.nextBoss.progressPct}%）` : '（主线已走到尾声）');
  L.push('');
  L.push('## 我的流派 / 配装');
  L.push(c.build ? c.build : '（无）');
  L.push('');
  L.push('## 关键道具');
  L.push(li(c.keyItems));
  L.push('');
  L.push('## 当前目标');
  L.push(li(c.goals));
  L.push('');
  L.push('## 卡点');
  L.push(li(c.stuck));
  L.push('');
  L.push('## 做过的选择');
  L.push(li(c.decisions));
  L.push('');
  L.push('## 备注');
  L.push(li(c.notes));
  if (c.lastSummary) { L.push(''); L.push('## 最近'); L.push(c.lastSummary); }
  L.push('');
  L.push('---');
  L.push('*由 游伴 YouBan · 攻略簿 导出*');
  return L.join('\n') + '\n';
}
