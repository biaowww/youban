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
  try {
    const v = localStorage.getItem('yb_bff');
    if (v) return v.replace(/\/$/, '');
  } catch (e) {/* noop */}
  return 'http://127.0.0.1:8787';
}

/* 设备 ID：首次生成后固定；存储不可用时给个会话级临时值 */
function ybDeviceId() {
  try {
    let d = localStorage.getItem('yb_device');
    if (!d) {
      d = window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('yb_device', d);
    }
    return d;
  } catch (e) {
    return 'dev-volatile-' + Date.now().toString(36);
  }
}
function ybHeaders(json) {
  const h = {
    'x-yb-device': ybDeviceId()
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

/* 解析 SSE（data: <json>），逐条产出对象 */
async function* ybSse(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const {
      value,
      done
    } = await reader.read();
    if (done) break;
    buf += dec.decode(value, {
      stream: true
    });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      try {
        yield JSON.parse(line.slice(5));
      } catch (e) {/* 半截行 */}
    }
  }
}
const CP_QUICK = ['我卡住了，下一步去哪？', '这个 Boss 怎么打？', '帮我回忆一下我到哪了', '记一下：'];

/* 状态卡 → 可读 chips */
function CardChips({
  card
}) {
  if (!card) return null;
  const rows = [['流派', card.build ? [card.build] : []], ['道具', card.keyItems], ['目标', card.goals], ['卡点', card.stuck], ['决定', card.decisions], ['备注', card.notes]].filter(([, v]) => v && v.length);
  /* 没有任何 chips、也没有摘要，才显示空提示——否则摘要会被吞掉 */
  if (!rows.length && !card.lastSummary) return /*#__PURE__*/React.createElement("div", {
    className: "cp-card-empty"
  }, "\u8FD8\u6CA1\u8BB0\u4F4F\u4EC0\u4E48\u2014\u2014\u804A\u51E0\u53E5\uFF0C\u6211\u4F1A\u628A\u4F60\u7684\u6D41\u6D3E\u3001\u9053\u5177\u3001\u5361\u70B9\u8BB0\u4E0B\u6765\u3002");
  return /*#__PURE__*/React.createElement("div", {
    className: "cp-card-rows"
  }, rows.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "cp-card-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ck"
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "cv"
  }, v.map((x, i) => /*#__PURE__*/React.createElement("i", {
    key: i
  }, x))))), card.lastSummary ? /*#__PURE__*/React.createElement("div", {
    className: "cp-card-sum"
  }, card.lastSummary) : null);
}
function CompanionPane({
  game,
  value,
  guard
}) {
  const [status, setStatus] = useState('checking'); // checking | offline | ready
  const [card, setCard] = useState(null);
  const [messages, setMessages] = useState([]);
  const [turns, setTurns] = useState(0);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState(''); // 流式中的助手草稿
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [cardOpen, setCardOpen] = useState(true);
  const listRef = useRef(null);
  const aliveRef = useRef(true);
  const base = ybBffBase();

  /* 拉这本簿 */
  const load = useCallback(async () => {
    setErr('');
    if (typeof fetch !== 'function') {
      setStatus('offline');
      return;
    }
    try {
      const AC = window.AbortController || globalThis.AbortController;
      const ac = AC ? new AC() : null;
      const t = ac ? setTimeout(() => ac.abort(), 2500) : null;
      const h = await fetch(base + '/health', {
        signal: ac ? ac.signal : undefined
      });
      if (t) clearTimeout(t);
      if (!h.ok) throw new Error('health ' + h.status);
      const r = await fetch(`${base}/api/companion/${game.id}`, {
        headers: ybHeaders()
      });
      if (!r.ok) throw new Error('load ' + r.status);
      const j = await r.json();
      if (!aliveRef.current) return;
      setCard(j.card);
      setMessages(j.messages || []);
      setTurns(j.turns || 0);
      setStatus('ready');
    } catch (e) {
      if (!aliveRef.current) return;
      setStatus('offline');
    }
  }, [base, game.id]);
  useEffect(() => {
    aliveRef.current = true;
    setStatus('checking');
    setMessages([]);
    setDraft('');
    load();
    return () => {
      aliveRef.current = false;
    };
  }, [load]);

  /* 新消息 / 草稿更新时滚到底 */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, draft]);
  const send = useCallback(async textIn => {
    const text = String(textIn == null ? input : textIn).trim();
    if (!text || busy || status !== 'ready') return;
    setInput('');
    setErr('');
    setBusy(true);
    setDraft('');
    setMessages(m => [...m, {
      role: 'user',
      content: text,
      pct: value
    }]);
    let full = '';
    try {
      const r = await fetch(`${base}/api/companion/${game.id}/chat`, {
        method: 'POST',
        headers: ybHeaders(true),
        body: JSON.stringify({
          message: text,
          pct: value,
          guard: !!guard
        })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'HTTP ' + r.status);
      let refreshing = false;
      for await (const ev of ybSse(r)) {
        if (!aliveRef.current) return;
        if (ev.delta) {
          full += ev.delta;
          setDraft(full);
        } else if (ev.error) throw new Error(ev.error);else if (ev.done) {
          setTurns(ev.turns || 0);
          refreshing = !!ev.cardRefreshing;
        }
      }
      setMessages(m => [...m, {
        role: 'assistant',
        content: full,
        pct: value
      }]);
      setDraft('');
      /* 状态卡在服务端后台刷新，稍后回读一次 */
      if (refreshing) setTimeout(async () => {
        try {
          const rr = await fetch(`${base}/api/companion/${game.id}`, {
            headers: ybHeaders()
          });
          if (rr.ok && aliveRef.current) {
            const j = await rr.json();
            setCard(j.card);
          }
        } catch (e) {/* noop */}
      }, 3000);
    } catch (e) {
      if (!aliveRef.current) return;
      setDraft('');
      if (full) setMessages(m => [...m, {
        role: 'assistant',
        content: full + '（…中断）',
        pct: value
      }]);
      setErr(e.message || '请求失败');
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  }, [input, busy, status, base, game.id, value, guard]);
  const exportMd = useCallback(async () => {
    try {
      const r = await fetch(`${base}/api/companion/${game.id}/export.md?pct=${value}&guard=${guard ? 1 : 0}`, {
        headers: ybHeaders()
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${game.short || game.id}-攻略簿战报.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      setErr('导出失败：' + e.message);
    }
  }, [base, game.id, game.short, value, guard]);
  const reset = useCallback(async () => {
    if (!window.confirm('清空这本攻略簿？对话与状态卡都会删除。')) return;
    try {
      await fetch(`${base}/api/companion/${game.id}`, {
        method: 'DELETE',
        headers: ybHeaders()
      });
      load();
    } catch (e) {
      setErr('清空失败：' + e.message);
    }
  }, [base, game.id, load]);
  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ── 未连接 ── */
  if (status === 'offline') {
    return /*#__PURE__*/React.createElement("div", {
      className: "panel cp cp-offline"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Companion"), /*#__PURE__*/React.createElement("h2", null, "\u653B\u7565\u7C3F")), /*#__PURE__*/React.createElement("p", {
      className: "cp-off-t"
    }, "\u653B\u7565\u7C3F\u670D\u52A1\u672A\u8FDE\u63A5\u3002"), /*#__PURE__*/React.createElement("p", {
      className: "cp-off-d"
    }, "\u8FD9\u662F\u4E00\u672C\u968F\u4F60\u8FDB\u5EA6\u8D70\u3001\u4E0D\u5267\u900F\u7684\u79C1\u6709\u653B\u7565\u7C3F\uFF1A\u95EE\u8DEF\u3001\u95EE Boss\u3001\u8BB0\u6D41\u6D3E\u4E0E\u5361\u70B9\uFF0C\u5B83\u90FD\u8BB0\u5F97\u3002"), /*#__PURE__*/React.createElement("p", {
      className: "cp-off-h mono"
    }, "\u672C\u673A\u542F\u52A8\uFF1A", /*#__PURE__*/React.createElement("code", null, "cd backend/bff && npm run dev"), "\uFF08\u9ED8\u8BA4 ", base, "\uFF09"), /*#__PURE__*/React.createElement("div", {
      className: "cp-actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "cp-btn",
      onClick: load
    }, "\u91CD\u8BD5\u8FDE\u63A5")));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "cp"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel cp-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Companion"), /*#__PURE__*/React.createElement("h2", null, "\u653B\u7565\u7C3F"), /*#__PURE__*/React.createElement("span", {
    className: "note"
  }, game.short, " \xB7 ", value, "% \xB7 ", guard ? '防剧透开' : '防剧透关', " \xB7 ", turns, " \u8F6E"), /*#__PURE__*/React.createElement("button", {
    className: "cp-mini",
    onClick: () => setCardOpen(o => !o),
    title: "\u5C55\u5F00/\u6536\u8D77\u72B6\u6001\u5361"
  }, cardOpen ? '收起' : '状态卡')), cardOpen && (status === 'checking' ? /*#__PURE__*/React.createElement("div", {
    className: "cp-card-empty"
  }, "\u8FDE\u63A5\u4E2D\u2026") : /*#__PURE__*/React.createElement(CardChips, {
    card: card
  })), cardOpen && status === 'ready' && /*#__PURE__*/React.createElement("div", {
    className: "cp-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "cp-btn ghost",
    onClick: exportMd
  }, "\u5BFC\u51FA\u6218\u62A5"), /*#__PURE__*/React.createElement("button", {
    className: "cp-btn ghost danger",
    onClick: reset
  }, "\u6E05\u7A7A"))), /*#__PURE__*/React.createElement("div", {
    className: "panel cp-chat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-list",
    ref: listRef
  }, messages.length === 0 && !draft && status === 'ready' && /*#__PURE__*/React.createElement("div", {
    className: "cp-hello"
  }, /*#__PURE__*/React.createElement("b", null, "\u8FD9\u672C\u7C3F\u662F\u300A", game.titleMain, "\u300B\u4E13\u5C5E\u7684\u3002"), /*#__PURE__*/React.createElement("span", null, "\u544A\u8BC9\u6211\u4F60\u5728\u54EA\u3001\u60F3\u5E72\u4EC0\u4E48\u3002\u6211\u77E5\u9053\u4F60\u73B0\u5728 ", value, "%\uFF0C\u4E0D\u4F1A\u8BF4\u540E\u9762\u7684\u4E8B\u3002")), messages.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'cp-msg ' + m.role
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-bubble"
  }, m.content), m.role === 'user' && m.pct != null ? /*#__PURE__*/React.createElement("span", {
    className: "cp-pct mono"
  }, m.pct, "%") : null)), draft ? /*#__PURE__*/React.createElement("div", {
    className: "cp-msg assistant streaming"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-bubble"
  }, draft, /*#__PURE__*/React.createElement("i", {
    className: "cp-cursor"
  }))) : null, busy && !draft ? /*#__PURE__*/React.createElement("div", {
    className: "cp-msg assistant"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cp-bubble cp-thinking"
  }, "\u2026")) : null), err ? /*#__PURE__*/React.createElement("div", {
    className: "cp-err"
  }, err) : null, /*#__PURE__*/React.createElement("div", {
    className: "cp-quick"
  }, CP_QUICK.map(q => /*#__PURE__*/React.createElement("button", {
    key: q,
    className: "cp-chip",
    disabled: busy || status !== 'ready',
    onClick: () => q.endsWith('：') ? setInput(q) : send(q)
  }, q))), /*#__PURE__*/React.createElement("div", {
    className: "cp-input"
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 1,
    value: input,
    placeholder: status === 'ready' ? '问路 / 问 Boss / 记一笔…（Enter 发送）' : '连接中…',
    disabled: busy || status !== 'ready',
    onChange: e => setInput(e.target.value),
    onKeyDown: onKey
  }), /*#__PURE__*/React.createElement("button", {
    className: "cp-send",
    disabled: busy || status !== 'ready' || !input.trim(),
    onClick: () => send()
  }, "\u53D1\u9001"))));
}
Object.assign(window, {
  CompanionPane
});