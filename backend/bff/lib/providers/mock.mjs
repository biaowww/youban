/* ============================================================
   游伴 YouBan · BFF · Mock 大模型（无 key 本地开发 / 跑 UI / 测试用）
   行为确定、离线：把 system 里的进度与下一个 Boss 复述出来，证明管线通了。
   ============================================================ */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function reply(messages) {
  const sys = messages.find(m => m.role === 'system')?.content || '';
  const user = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const pct = (sys.match(/# 玩家进度：(\d+)%/) || [])[1];
  const next = (sys.match(/下一个：([^（\n]+)/) || [])[1];
  const cur = (sys.match(/当前章节：([^（\n]+)/) || [])[1];
  return [
    `（Mock）收到：「${user.slice(0, 40)}」。`,
    pct ? `你现在在 ${pct}%${cur ? '，' + cur.trim() : ''}。` : '',
    next ? `下一个要面对的是 ${next.trim()}——先把补给带够，别贪刀。` : '',
    '这是本地 Mock 回复，接上 GLM key 后会换成真实回答。',
  ].filter(Boolean).join('');
}

export function createMockProvider() {
  return {
    name: 'mock',
    async chat({ messages }) {
      /* 状态卡整理请求：system 以「你是一个记忆整理器」开头 → 返回一个最小补丁 */
      const sys = messages[0]?.content || '';
      if (sys.startsWith('你是一个记忆整理器')) {
        return { text: JSON.stringify({ lastSummary: '（Mock）最近聊了几句攻略。' }), usage: null };
      }
      return { text: reply(messages), usage: null };
    },
    async *stream({ messages, signal }) {
      const text = reply(messages);
      for (const ch of text.match(/.{1,6}/g) || []) {
        if (signal?.aborted) return;
        await sleep(25);
        yield ch;
      }
    },
  };
}
