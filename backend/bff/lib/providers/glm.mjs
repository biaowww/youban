/* ============================================================
   游伴 YouBan · BFF · 智谱 GLM 适配器（OpenAI 兼容协议，零依赖）
   端点：{baseUrl}/chat/completions  ｜ 流式：stream:true，SSE `data: {...}` / `[DONE]`
   统一接口（换 Claude/Gemini 只需再写一个同形 provider）：
     chat({model, messages, temperature, maxTokens, signal})  → {text, usage}
     stream({...同上})                                        → async 迭代 delta 字符串
   ============================================================ */

export function createGlmProvider({ apiKey, baseUrl = 'https://open.bigmodel.cn/api/paas/v4', fetchImpl = fetch }) {
  if (!apiKey) throw new Error('GLM_API_KEY 未配置');
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';

  async function request(body, signal) {
    const r = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal,
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`GLM ${r.status}: ${t.slice(0, 300)}`);
    }
    return r;
  }

  return {
    name: 'glm',
    async chat({ model, messages, temperature = 0.7, maxTokens, signal }) {
      const r = await request({ model, messages, temperature, max_tokens: maxTokens, stream: false }, signal);
      const j = await r.json();
      const text = j?.choices?.[0]?.message?.content || '';
      return { text, usage: j.usage || null };
    },
    async *stream({ model, messages, temperature = 0.7, maxTokens, signal }) {
      const r = await request({ model, messages, temperature, max_tokens: maxTokens, stream: true }, signal);
      yield* parseSse(r.body);
    },
  };
}

/* 解析 OpenAI 风格 SSE 流，逐段产出 delta 文本。导出以便单测。 */
export async function* parseSse(body) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const j = JSON.parse(data);
        const d = j?.choices?.[0]?.delta?.content;
        if (d) yield d;
      } catch { /* 半截 JSON 或心跳行，忽略 */ }
    }
  }
}
