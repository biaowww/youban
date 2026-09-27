/* 每设备每日对话轮数上限（内存计数，按 UTC+8 日期重置）。
   目的：公网入口开放后防止单个设备刷爆模型额度；真身份接入后改成按用户。 */
export function createQuota({ dailyTurns = 60, now = () => Date.now() } = {}) {
  const counts = new Map();                  // key: `${day}|${id}` → n
  const dayOf = (t) => new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
  let lastDay = null;
  function sweep(day) {
    if (lastDay === day) return;
    for (const k of counts.keys()) if (!k.startsWith(day + '|')) counts.delete(k);
    lastDay = day;
  }
  return {
    limit: dailyTurns,
    /* 返回 {ok, used, limit}；ok=false 时不计数 */
    take(id) {
      if (!(dailyTurns > 0)) return { ok: true, used: 0, limit: Infinity };
      const day = dayOf(now()); sweep(day);
      const k = `${day}|${id}`;
      const used = counts.get(k) || 0;
      if (used >= dailyTurns) return { ok: false, used, limit: dailyTurns };
      counts.set(k, used + 1);
      return { ok: true, used: used + 1, limit: dailyTurns };
    },
  };
}
