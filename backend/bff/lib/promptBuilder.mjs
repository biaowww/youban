/* ============================================================
   游伴 YouBan · 攻略簿 · Prompt 拼装（纯函数）
   最终输入 = [人设 + 规则] + [游戏简报] + [状态卡] + [最近 N 条] + [本轮提问]
   不做全量历史追加：长程记忆靠状态卡，近程靠最近 N 条。
   ============================================================ */
import { buildGameBrief } from './gameBrief.mjs';

export const PERSONA = [
  '你是「游伴」App 里的攻略簿助手，正陪一位玩家走完一款游戏。',
  '像一个打过这款游戏的老玩家坐在旁边说话：直接、具体、不啰嗦、不端着。',
].join('');

export const RULES = [
  '- 用简体中文回答。',
  '- 先基于「玩家进度」判断他此刻在哪、刚经历了什么，再回答；判断不了就问一句，不要瞎猜。',
  '- 给可执行的步骤：去哪、打谁、怎么打、带什么、注意什么。少空谈。',
  '- 严格遵守「剧透边界」。',
  '- 不知道就说不知道，绝不编造地点、道具、机制或数值。',
  '- 玩家提到的 build / 关键道具 / 卡点 / 做过的选择 / 备注，记下来（会写进状态卡）。',
  '- 默认控制在 200 字内；玩家要求详细时再展开。',
].join('\n');

function cardBlock(card) {
  if (!card) return '（空——这是这本簿的第一次对话）';
  const pick = ['build', 'keyItems', 'goals', 'stuck', 'decisions', 'notes', 'lastSummary'];
  const o = {};
  for (const k of pick) {
    const v = card[k];
    if (v && (Array.isArray(v) ? v.length : String(v).trim())) o[k] = v;
  }
  return Object.keys(o).length ? JSON.stringify(o, null, 0) : '（空——这是这本簿的第一次对话）';
}

/**
 * @param {object} p
 * @param {object} p.game        原始游戏 JSON
 * @param {number} p.pct         玩家进度（客户端为准）
 * @param {boolean} p.guard      防剧透开关
 * @param {object|null} p.card   状态卡
 * @param {Array<{role,content}>} p.history  历史消息（会被截到最近 N 条）
 * @param {string} p.userMessage 本轮提问
 */
export function buildMessages({ game, pct, guard = true, card, history = [], userMessage, historyMessages = 10, briefMaxChars }) {
  const brief = buildGameBrief(game, pct, guard, { maxChars: briefMaxChars });
  const system = [
    PERSONA, '', '## 规则', RULES, '',
    '## 游戏简报（按玩家当前进度切出，可信）', brief, '',
    '## 玩家状态卡（你此前记住的，可信）', cardBlock(card),
  ].join('\n');

  const recent = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-historyMessages)
    .map(m => ({ role: m.role, content: m.content }));

  return [{ role: 'system', content: system }, ...recent, { role: 'user', content: userMessage }];
}
