/* ============================================================
   游伴 YouBan · BFF 配置（全部来自环境变量，零依赖）
   本地开发：backend/bff/.env（已 gitignore），用 node --env-file 注入。
   线上：/opt/youban/bff/.env（600），systemd EnvironmentFile。
   密钥纪律：GLM_API_KEY / SERVICE_ROLE_KEY 只在这里读，绝不回传客户端。
   ============================================================ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);
const num = (k, d) => { const v = Number(env(k, d)); return Number.isFinite(v) ? v : d; };

export const config = {
  port: num('PORT', 8787),
  corsOrigin: env('CORS_ORIGIN', '*'),            // Electron renderer 是 file:// → Origin "null"，默认放开

  /* 大模型：provider=glm（默认）| mock（无 key 本地开发/跑 UI 用） */
  provider: env('PROVIDER', 'glm'),
  glm: {
    apiKey: env('GLM_API_KEY', ''),
    baseUrl: env('GLM_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4'),
    modelChat: env('GLM_MODEL_CHAT', 'glm-5'),          // 对话：付费旗舰
    modelLite: env('GLM_MODEL_LITE', 'glm-4.5-flash'),  // 状态卡合并：便宜/免费档（按控制台实际可用改）
  },

  /* 记忆策略 */
  historyMessages: num('HISTORY_MESSAGES', 10),  // prompt 里带最近多少条消息（5 轮）
  profileEveryTurns: num('PROFILE_EVERY_TURNS', 3), // 每几轮助手回复后刷新一次状态卡
  briefMaxChars: num('BRIEF_MAX_CHARS', 3200),
  maxMessageChars: num('MAX_MESSAGE_CHARS', 4000),

  /* 存储：file（默认，本地 JSON）| supabase（线上，service_role 经 REST） */
  store: env('COMPANION_STORE', 'file'),
  dataDir: env('COMPANION_DATA_DIR', path.join(HERE, 'data')),
  supabase: {
    url: env('SUPABASE_URL', ''),
    serviceKey: env('SERVICE_ROLE_KEY', ''),
  },

  /* 游戏内容：读仓库 JSON（服务器上 /opt/youban/repo 也有一份），与客户端同一真相源 */
  gamesDir: env('GAMES_DIR', path.join(HERE, '..', '..', 'src', 'data', 'games')),
};
