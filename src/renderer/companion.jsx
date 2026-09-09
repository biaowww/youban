/* ============================================================
   游伴 YouBan · 攻略簿（Companion AI）客户端
   ────────────────────────────────────────────────────────────
   一款游戏一本簿。对话经 youban-bff（backend/bff）走 SSE 流式；
   进度(value) 与防剧透(guard) 随每次请求带上，服务端据此切游戏简报——
   客户端不组 prompt、不持任何密钥。
   身份：内测期用本机生成的设备 uuid（localStorage yb_device）。
   无服务器（GitHub Pages / 未启动 bff）时优雅降级为「未连接」面板。
   一期以 v10 Tab 形式接入；二期加浮动按钮（同一组件）。
   hooks 来自 components.jsx 全局；本文件经 build:ui 编译进 dist/companion.js。
   ============================================================ */

/* BFF 地址：window.__YB_BFF__ > localStorage yb_bff > 本机默认 */
function ybBffBase() {
  if (window.__YB_BFF__) return String(window.__YB_BFF__).replace(/\/$/, '');
  try { const v = localStorage.getItem('yb_bff'); if (v) return v.replace(/\/$/, ''); } catch (e) { /* noop */ }
  return 'http://127.0.0.1:8787';
}

/* 设备 ID：首次生成后固定；存储不可用时给个会话级临时值 */
function ybDeviceId() {
  try {
    let d = localStorage.getItem('yb_device');
    if (!d) {
      d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('yb_device', d);
    }
    return d;
  } catch (e) { return 'dev-volatile-' + Date.now().toString(36); }
}

function ybHeaders(json) {
  const h = { 'x-yb-device': ybDeviceId() };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

/* 解析 SSE（data: <json>），逐条产出对象 */
async function* ybSse(res) {
  const reader = res.body.getReader();
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
      try { yield JSON.parse(line.slice(5)); } catch (e) { /* 半截行 */ }
    }
  }
}

const CP_QUICK = ['我卡住了，下一步去哪？', '这个 Boss 怎么打？', '帮我回忆一下我到哪了', '记一下：'];

/* 状态卡 → 可读 chips */
function CardChips({ card }) {
  if (!card) return null;
  const rows = [
    ['流派', card.build ? [card.build] : []],
    ['道具', card.keyItems], ['目标', card.goals], ['卡点', card.stuck], ['决定', card.decisions], ['备注', card.notes],
  ].filter(([, v]) => v && v.length);
  /* 没有任何 chips、也没有摘要，才显示空提示——否则摘要会被吞掉 */
  if (!rows.length && !card.lastSummary) return <div className="cp-card-empty">还没记住什么——聊几句，我会把你的流派、道具、卡点记下来。</div>;
  return (
    <div className="cp-card-rows">
      {rows.map(([k, v]) => (
        <div key={k} className="cp-card-row"><span className="ck">{k}</span>
          <span className="cv">{v.map((x, i) => <i key={i}>{x}</i>)}</span></div>
      ))}
      {card.lastSummary ? <div className="cp-card-sum">{card.lastSummary}</div> : null}
    </div>
  );
}

function CompanionPane({ game, value, guard }) {
  const [status, setStatus] = useState('checking');   // checking | offline | ready
  const [card, setCard] = useState(null);
  const [messages, setMessages] = useState([]);
  const [turns, setTurns] = useState(0);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState('');              // 流式中的助手草稿
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [cardOpen, setCardOpen] = useState(true);
  const listRef = useRef(null);
  const aliveRef = useRef(true);
  const base = ybBffBase();

  /* 拉这本簿 */
  const load = useCallback(async () => {
    setErr('');
    if (typeof fetch !== 'function') { setStatus('offline'); return; }
    try {
      const AC = window.AbortController || globalThis.AbortController;
      const ac = AC ? new AC() : null;
      const t = ac ? setTimeout(() => ac.abort(), 2500) : null;
      const h = await fetch(base + '/health', { signal: ac ? ac.signal : undefined });
      if (t) clearTimeout(t);
      if (!h.ok) throw new Error('health ' + h.status);
      const r = await fetch(`${base}/api/companion/${game.id}`, { headers: ybHeaders() });
      if (!r.ok) throw new Error('load ' + r.status);
      const j = await r.json();
      if (!aliveRef.current) return;
      setCard(j.card); setMessages(j.messages || []); setTurns(j.turns || 0); setStatus('ready');
    } catch (e) {
      if (!aliveRef.current) return;
      setStatus('offline');
    }
  }, [base, game.id]);

  useEffect(() => { aliveRef.current = true; setStatus('checking'); setMessages([]); setDraft(''); load(); return () => { aliveRef.current = false; }; }, [load]);

  /* 新消息 / 草稿更新时滚到底 */
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, draft]);

  const send = useCallback(async (textIn) => {
    const text = String(textIn == null ? input : textIn).trim();
    if (!text || busy || status !== 'ready') return;
    setInput(''); setErr(''); setBusy(true); setDraft('');
    setMessages(m => [...m, { role: 'user', content: text, pct: value }]);
    let full = '';
    try {
      const r = await fetch(`${base}/api/companion/${game.id}/chat`, {
        method: 'POST', headers: ybHeaders(true),
        body: JSON.stringify({ message: text, pct: value, guard: !!guard }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || ('HTTP ' + r.status));
      let refreshing = false;
      for await (const ev of ybSse(r)) {
        if (!aliveRef.current) return;
        if (ev.delta) { full += ev.delta; setDraft(full); }
        else if (ev.error) throw new Error(ev.error);
        else if (ev.done) { setTurns(ev.turns || 0); refreshing = !!ev.cardRefreshing; }
      }
      setMessages(m => [...m, { role: 'assistant', content: full, pct: value }]);
      setDraft('');
      /* 状态卡在服务端后台刷新，稍后回读一次 */
      if (refreshing) setTimeout(async () => {
        try {
          const rr = await fetch(`${base}/api/companion/${game.id}`, { headers: ybHeaders() });
          if (rr.ok && aliveRef.current) { const j = await rr.json(); setCard(j.card); }
        } catch (e) { /* noop */ }
      }, 3000);
    } catch (e) {
      if (!aliveRef.current) return;
      setDraft('');
      if (full) setMessages(m => [...m, { role: 'assistant', content: full + '（…中断）', pct: value }]);
      setErr(e.message || '请求失败');
    } finally { if (aliveRef.current) setBusy(false); }
  }, [input, busy, status, base, game.id, value, guard]);

  const exportMd = useCallback(async () => {
    try {
      const r = await fetch(`${base}/api/companion/${game.id}/export.md?pct=${value}&guard=${guard ? 1 : 0}`, { headers: ybHeaders() });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${game.short || game.id}-攻略簿战报.md`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { setErr('导出失败：' + e.message); }
  }, [base, game.id, game.short, value, guard]);

  const reset = useCallback(async () => {
    if (!window.confirm('清空这本攻略簿？对话与状态卡都会删除。')) return;
    try {
      await fetch(`${base}/api/companion/${game.id}`, { method: 'DELETE', headers: ybHeaders() });
      load();
    } catch (e) { setErr('清空失败：' + e.message); }
  }, [base, game.id, load]);

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  /* ── 未连接 ── */
  if (status === 'offline') {
    return (
      <div className="panel cp cp-offline">
        <div className="p-head"><span className="k">Companion</span><h2>攻略簿</h2></div>
        <p className="cp-off-t">攻略簿服务未连接。</p>
        <p className="cp-off-d">这是一本随你进度走、不剧透的私有攻略簿：问路、问 Boss、记流派与卡点，它都记得。</p>
        <p className="cp-off-h mono">本机启动：<code>cd backend/bff && npm run dev</code>（默认 {base}）</p>
        <div className="cp-actions"><button className="cp-btn" onClick={load}>重试连接</button></div>
      </div>
    );
  }

  return (
    <div className="cp">
      {/* 状态卡 */}
      <div className="panel cp-card">
        <div className="p-head">
          <span className="k">Companion</span><h2>攻略簿</h2>
          <span className="note">{game.short} · {value}% · {guard ? '防剧透开' : '防剧透关'} · {turns} 轮</span>
          <button className="cp-mini" onClick={() => setCardOpen(o => !o)} title="展开/收起状态卡">{cardOpen ? '收起' : '状态卡'}</button>
        </div>
        {cardOpen && (status === 'checking' ? <div className="cp-card-empty">连接中…</div> : <CardChips card={card} />)}
        {cardOpen && status === 'ready' && (
          <div className="cp-actions">
            <button className="cp-btn ghost" onClick={exportMd}>导出战报</button>
            <button className="cp-btn ghost danger" onClick={reset}>清空</button>
          </div>
        )}
      </div>

      {/* 对话 */}
      <div className="panel cp-chat">
        <div className="cp-list" ref={listRef}>
          {messages.length === 0 && !draft && status === 'ready' && (
            <div className="cp-hello">
              <b>这本簿是《{game.titleMain}》专属的。</b>
              <span>告诉我你在哪、想干什么。我知道你现在 {value}%，不会说后面的事。</span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={'cp-msg ' + m.role}>
              <div className="cp-bubble">{m.content}</div>
              {m.role === 'user' && m.pct != null ? <span className="cp-pct mono">{m.pct}%</span> : null}
            </div>
          ))}
          {draft ? <div className="cp-msg assistant streaming"><div className="cp-bubble">{draft}<i className="cp-cursor" /></div></div> : null}
          {busy && !draft ? <div className="cp-msg assistant"><div className="cp-bubble cp-thinking">…</div></div> : null}
        </div>
        {err ? <div className="cp-err">{err}</div> : null}
        <div className="cp-quick">
          {CP_QUICK.map(q => (
            <button key={q} className="cp-chip" disabled={busy || status !== 'ready'}
              onClick={() => (q.endsWith('：') ? setInput(q) : send(q))}>{q}</button>
          ))}
        </div>
        <div className="cp-input">
          <textarea rows={1} value={input} placeholder={status === 'ready' ? '问路 / 问 Boss / 记一笔…（Enter 发送）' : '连接中…'}
            disabled={busy || status !== 'ready'} onChange={e => setInput(e.target.value)} onKeyDown={onKey} />
          <button className="cp-send" disabled={busy || status !== 'ready' || !input.trim()} onClick={() => send()}>发送</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CompanionPane });
