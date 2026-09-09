/* ============================================================
   游伴 YouBan · BFF · 模型 provider 选择
   现在：glm（默认）| mock。后续 Premium 路由（如 anthropic）在这里加一行即可，
   对话管线不感知具体厂商。
   ============================================================ */
import { createGlmProvider } from './glm.mjs';
import { createMockProvider } from './mock.mjs';

export function getProvider(config) {
  if (config.provider === 'mock') return createMockProvider();
  if (config.provider === 'glm') {
    if (!config.glm.apiKey) {
      console.warn('[provider] GLM_API_KEY 未配置 → 回退为 mock（对话为本地假回复）');
      return createMockProvider();
    }
    return createGlmProvider({ apiKey: config.glm.apiKey, baseUrl: config.glm.baseUrl });
  }
  throw new Error(`未知 PROVIDER=${config.provider}`);
}
