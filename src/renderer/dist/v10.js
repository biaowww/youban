/* ============================================================
   游伴 v10 新版 UI（feature/v10-ui）
   来源：design/游伴 v10 新版UI完整稿.html + design/v10-新版UI-实施说明.md
   边界（铁律）：
   - 只重做 进度/历程 两个一级 Tab 的呈现层；舆情沿用 v9 SentimentScreen
   - 二级抽屉（BossDrawer/EntryDetail）复用 v9，本文件只负责“打开”
   - 数据全部来自 adaptGame() 视图模型，不碰 schema
   - v9 组件只加不改；本文件是唯一新增 UI 入口，经 app.jsx 开关挂载
   hooks（useState 等）由 components.js 全局声明，直接复用。
   ============================================================ */

/* ───────── 历程 Tab：蜿蜒旅程图（步骤 2，v10-C 定稿 + v10-B 里程碑元素） ───────── */
const V10_ICONS = ['🛠', '🤖', '⚔', '🤝', '🏛', '🌟', '🔥', '🗝'];
function V10Journey({
  game,
  value,
  openBoss,
  openEntry
}) {
  const wrapRef = useRef(null);
  const baseRef = useRef(null);
  const trodRef = useRef(null);
  const youRef = useRef(null);
  const ptsRef = useRef([]); // 各节点圆心坐标（相对 wrap）
  const pctsRef = useRef([]); // 各节点对应进度
  const valRef = useRef(value);
  const [peeked, setPeeked] = useState({});

  /* 节点序列：里程碑(journey) + 推荐起点(entries)，按进度排序（同进度 🎁 在前） */
  const nodes = React.useMemo(() => {
    const ms = (game.journey || []).map((j, i) => ({
      type: 'm',
      ...j,
      ico: V10_ICONS[i % V10_ICONS.length]
    }));
    const es = (game.entries || []).map(e => ({
      type: 'e',
      ...e
    }));
    return [...ms, ...es].sort((a, b) => a.pct - b.pct || (a.type === 'e' ? -1 : 1));
  }, [game.id]);

  /* 里程碑 → 下一站进度、就近 ⚔ 存档（每段最多 1 个） */
  const milestonePcts = (game.journey || []).map(j => j.pct);
  const nextOf = pct => {
    const i = milestonePcts.indexOf(pct);
    return milestonePcts[i + 1] != null ? milestonePcts[i + 1] : 100;
  };
  const segBossOf = pct => (game.bosses || []).filter(b => b.pct >= pct && b.pct < nextOf(pct)).slice(0, 1);

  /* 路径绘制（量 DOM 圆心 → 三次贝塞尔） */
  const paint = () => {
    const base = baseRef.current,
      trod = trodRef.current,
      you = youRef.current;
    if (!base || !trod || !you || !base.getAttribute('d')) return;
    if (typeof base.getTotalLength !== 'function') return; // jsdom 等无 SVG 几何实现的环境
    const pts = ptsRef.current,
      pcts = pctsRef.current,
      pct = valRef.current;
    const total = base.getTotalLength();
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) * 1.02);
    const scale = total / Math.max(1e-6, lens[lens.length - 1]);
    let l = total;
    if (pct <= pcts[0]) l = 0;else {
      for (let i = 1; i < pcts.length; i++) {
        if (pct <= pcts[i]) {
          const t = (pct - pcts[i - 1]) / Math.max(1e-6, pcts[i] - pcts[i - 1]);
          l = (lens[i - 1] + t * (lens[i] - lens[i - 1])) * scale;
          break;
        }
      }
    }
    trod.setAttribute('stroke-dasharray', `${l} ${total}`);
    const p = base.getPointAtLength(l);
    you.style.left = p.x + 'px';
    you.style.top = p.y + 'px';
    const lbl = you.querySelector('.yl');
    if (lbl) lbl.textContent = `你在这里 · ${pct}%`;
  };
  const draw = () => {
    const wrap = wrapRef.current,
      base = baseRef.current,
      trod = trodRef.current;
    if (!wrap || !base || !trod) return;
    const r = wrap.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    base.ownerSVGElement.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    const pts = [],
      pcts = [];
    wrap.querySelectorAll('.j-row').forEach(row => {
      const d = row.querySelector('.j-dot');
      if (!d) return;
      const b = d.getBoundingClientRect();
      pts.push({
        x: b.left + b.width / 2 - r.left,
        y: b.top + b.height / 2 - r.top
      });
      pcts.push(+row.dataset.pct);
    });
    if (pts.length < 2) return;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        my = (a.y + b.y) / 2;
      d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
    }
    base.setAttribute('d', d);
    trod.setAttribute('d', d);
    ptsRef.current = pts;
    pctsRef.current = pcts;
    paint();
  };
  useEffect(() => {
    draw();
    const t1 = setTimeout(draw, 150),
      t2 = setTimeout(draw, 600); // 字体/图片落定后再校
    window.addEventListener('resize', draw);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', draw);
    };
  }, [game.id]);
  useEffect(() => {
    valRef.current = value;
    paint();
  }, [value]);

  /* 当前里程碑 = 最后一个 pct<=value 的里程碑节点 */
  let curIdx = -1;
  nodes.forEach((n, i) => {
    if (n.type === 'm' && n.pct <= value) curIdx = i;
  });
  const STATE_TXT = {
    done: '已解锁',
    current: '进行中',
    future: '锁定'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "journey-wrap",
    ref: wrapRef
  }, /*#__PURE__*/React.createElement("svg", {
    className: "route"
  }, /*#__PURE__*/React.createElement("path", {
    className: "base",
    ref: baseRef
  }), /*#__PURE__*/React.createElement("path", {
    className: "trod",
    ref: trodRef
  })), /*#__PURE__*/React.createElement("div", {
    className: "you",
    ref: youRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }), /*#__PURE__*/React.createElement("div", {
    className: "yl"
  }, "\u4F60\u5728\u8FD9\u91CC \xB7 ", value, "%")), nodes.map((n, i) => {
    const side = i % 2 === 0 ? 'L' : 'R';
    if (n.type === 'e') {
      const done = n.pct <= value;
      return /*#__PURE__*/React.createElement("div", {
        key: 'e' + n.pct,
        className: `j-row entry-row ${side} ${done ? 'done' : 'future'}`,
        "data-pct": n.pct
      }, /*#__PURE__*/React.createElement("div", {
        className: "e-card"
      }, /*#__PURE__*/React.createElement("div", {
        className: "el"
      }, "\uD83C\uDF81 ", n.label, /*#__PURE__*/React.createElement("span", {
        className: "mono",
        style: {
          fontSize: 10,
          opacity: .7
        }
      }, n.pct, "%")), /*#__PURE__*/React.createElement("div", {
        className: "ew"
      }, n.reason), /*#__PURE__*/React.createElement("span", {
        className: "go",
        onClick: () => openEntry && openEntry(n)
      }, '从这里进入 →')), /*#__PURE__*/React.createElement("div", {
        className: "j-node"
      }, /*#__PURE__*/React.createElement("div", {
        className: "j-dot"
      }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDF81")), /*#__PURE__*/React.createElement("span", {
        className: "j-pct mono"
      }, n.pct, "%")));
    }
    const state = i === curIdx ? 'current' : n.pct <= value ? 'done' : 'future';
    const nextPct = nextOf(n.pct);
    const seg = segBossOf(n.pct);
    const glW = state === 'done' ? 100 : state === 'future' ? 0 : Math.min(100, (value - n.pct) / Math.max(1, nextPct - n.pct) * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: 'm' + n.pct,
      className: `j-row ${side} ${state}${peeked[i] ? ' peeked' : ''}`,
      "data-pct": n.pct
    }, /*#__PURE__*/React.createElement("div", {
      className: "j-card"
    }, state === 'future' && /*#__PURE__*/React.createElement("span", {
      className: "peek",
      onClick: () => setPeeked(p => ({
        ...p,
        [i]: !p[i]
      }))
    }, "\u5077\u770B\u4E00\u773C \uD83D\uDC40"), /*#__PURE__*/React.createElement("div", {
      className: "ico"
    }, n.ico), /*#__PURE__*/React.createElement("div", {
      className: "bd2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ev"
    }, n.event, /*#__PURE__*/React.createElement("span", {
      className: "st"
    }, STATE_TXT[state])), /*#__PURE__*/React.createElement("div", {
      className: "desc"
    }, n.desc), n.unlocks.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "tags"
    }, n.unlocks.map((u, k) => /*#__PURE__*/React.createElement("span", {
      key: k,
      className: "tag"
    }, "\u2726 ", u))), /*#__PURE__*/React.createElement("div", {
      className: "j-next"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gl"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: glW + '%'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "pc mono"
    }, '→ 下一站 ' + nextPct + '%')), seg.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "j-save"
    }, seg.map(b => /*#__PURE__*/React.createElement("div", {
      key: b.id || b.pct,
      className: 'sv' + (b.hi ? ' hi' : '') + (b.pct > value ? ' locked' : '')
    }, /*#__PURE__*/React.createElement("span", {
      className: "swd"
    }, "\u2694"), /*#__PURE__*/React.createElement("span", {
      className: "n",
      onClick: () => openBoss && openBoss(b)
    }, "\u5C31\u8FD1\u5B58\u6863 \xB7 ", b.name), /*#__PURE__*/React.createElement("span", {
      className: "pc2 mono"
    }, b.pct, "%"), /*#__PURE__*/React.createElement("button", {
      className: "dl",
      onClick: () => openBoss && openBoss(b)
    }, "\u2913")))))), /*#__PURE__*/React.createElement("div", {
      className: "j-node"
    }, /*#__PURE__*/React.createElement("div", {
      className: "j-dot"
    }, /*#__PURE__*/React.createElement("span", null, state === 'current' ? '⟡' : state === 'done' ? '✓' : '◆')), /*#__PURE__*/React.createElement("span", {
      className: "j-pct mono"
    }, n.pct, "%")));
  }));
}

/* ───────── 全局态：防剧透 / 主题（步骤 6 会统一各模块模糊规则） ───────── */
function V10App({
  game,
  games,
  value,
  setValue,
  onBack,
  onSwitchToV9,
  openBoss,
  openEntry
}) {
  const [tab, setTab] = useState('progress');
  const [guard, setGuard] = useState(true); // 防剧透默认开（原型默认 body.guard）
  const [dark, setDark] = useState(false); // 浅色暖调默认
  const [solid, setSolid] = useState(false); // 顶栏滚动加底
  const rootRef = useRef(null);
  const onScroll = () => {
    const el = rootRef.current;
    if (!el) return;
    setSolid(el.scrollTop > el.clientHeight * 0.3);
  };
  const played = value / 100 * game.hoursMain;
  const bossPassed = game.bosses.filter(b => b.pct <= value).length;
  const Senti = window.SentimentScreen;
  return /*#__PURE__*/React.createElement("div", {
    ref: rootRef,
    className: 'v10' + (dark ? ' dark' : '') + (guard ? ' guard' : ''),
    onScroll: onScroll
  }, /*#__PURE__*/React.createElement("nav", {
    className: 'topbar' + (solid ? ' solid' : '')
  }, /*#__PURE__*/React.createElement("button", {
    className: "t-back",
    onClick: onBack
  }, "\u2190"), /*#__PURE__*/React.createElement("div", {
    className: "t-brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/youban-mark.svg",
    alt: "\u6E38\u4F34"
  }), /*#__PURE__*/React.createElement("b", null, game.short)), /*#__PURE__*/React.createElement("div", {
    className: "t-tabs"
  }, [['progress', '进度'], ['journey', '历程'], ['senti', '舆情']].map(([k, n]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: 't-tab' + (tab === k ? ' on' : ''),
    onClick: () => setTab(k)
  }, n))), /*#__PURE__*/React.createElement("button", {
    className: "t-ctl guard-t",
    title: guard ? '防剧透：开' : '防剧透：关',
    onClick: () => setGuard(g => !g)
  }, "\uD83D\uDEE1", /*#__PURE__*/React.createElement("span", {
    className: "sw"
  })), /*#__PURE__*/React.createElement("button", {
    className: "t-ctl",
    title: "\u6D45\u8272 / \u6E38\u620F\u4E3B\u9898\u8272",
    onClick: () => setDark(d => !d)
  }, dark ? '☀' : '🌙'), /*#__PURE__*/React.createElement("button", {
    className: "t-ctl",
    title: "\u5207\u56DE\u65E7\u7248\u754C\u9762",
    onClick: onSwitchToV9
  }, "v9")), /*#__PURE__*/React.createElement("header", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("img", {
    className: "bg",
    src: game.banner,
    alt: "",
    onError: e => {
      e.target.style.display = 'none';
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "greet"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\u6B22\u8FCE\u56DE\u6765 \xB7 \u7EE7\u7EED\u966A ", /*#__PURE__*/React.createElement("b", null, game.short), " \u8D70\u8FD9\u6BB5\u8DEF"), /*#__PURE__*/React.createElement("h1", null, game.titleMain), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, game.titleSub), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, game.developer && /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, game.developer, game.year ? ' · ' + game.year : ''), game.genre && /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, game.genre), game.tagline && /*#__PURE__*/React.createElement("span", {
    className: "chip gold"
  }, "\u26A1 ", game.tagline)), /*#__PURE__*/React.createElement("div", {
    className: "hero-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "cta primary",
    onClick: () => setTab('progress')
  }, '▶ 继续旅程'), /*#__PURE__*/React.createElement("div", {
    className: "hero-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, value, /*#__PURE__*/React.createElement("small", null, "%")), /*#__PURE__*/React.createElement("span", null, "\u5B8C\u6210\u5EA6")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, played.toFixed(1), /*#__PURE__*/React.createElement("small", null, "h")), /*#__PURE__*/React.createElement("span", null, "\u5DF2\u966A\u8DD1")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, Math.max(0, game.hoursMain - played).toFixed(1), /*#__PURE__*/React.createElement("small", null, "h")), /*#__PURE__*/React.createElement("span", null, "\u5269\u4F59(\u4E3B\u7EBF)")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, bossPassed, /*#__PURE__*/React.createElement("small", null, "/", game.bosses.length)), /*#__PURE__*/React.createElement("span", null, "Boss \u5DF2\u8FC7")))))), /*#__PURE__*/React.createElement("main", null, tab === 'progress' && /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Hype Wave"), /*#__PURE__*/React.createElement("h2", null, "\u5267\u60C5\u5F20\u529B\u66F2\u7EBF")), /*#__PURE__*/React.createElement("div", {
    className: "ph"
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, "\uD83D\uDEA7"), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "\u8FDB\u5EA6 Tab \u65BD\u5DE5\u4E2D"), "\uFF08\u6B65\u9AA4 3-4\uFF1A\u6CE2\u5F62 / \u5750\u6807\u8F74 / \u90BB\u8FD1\u91CC\u7A0B\u7891 / \u7AE0\u8282\u5899\uFF09"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 6,
      fontSize: 12
    }
  }, "\u53F3\u4E0B\u89D2\u6ED1\u6746\u5DF2\u63A5\u771F\u5B9E\u8FDB\u5EA6\uFF0CHero \u7EDF\u8BA1\u5168\u8054\u52A8\u3002"))), tab === 'journey' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Journey"), /*#__PURE__*/React.createElement("h2", null, "\u6210\u957F\u65C5\u7A0B")), /*#__PURE__*/React.createElement("p", {
    className: "p-sub"
  }, "\u91D1\u8272\u662F\u8D70\u8FC7\u7684\u8DEF\uFF0C\u865A\u7EBF\u662F\u524D\u65B9\u3002\uD83C\uDF81 \u662F\u63A8\u8350\u8D77\u70B9\uFF1B\u5404\u6BB5\u5C31\u8FD1\u7684 \u2694 \u5B58\u6863\u76F4\u63A5\u6302\u5728\u8282\u70B9\u5361\u91CC\u3002"), game.journey && game.journey.length > 0 ? /*#__PURE__*/React.createElement(V10Journey, {
    game: game,
    value: value,
    openBoss: openBoss,
    openEntry: openEntry
  }) : /*#__PURE__*/React.createElement("div", {
    className: "panel ph"
  }, /*#__PURE__*/React.createElement("p", null, "\u672C\u4F5C\u6682\u65E0\u6210\u957F\u5386\u7A0B\u6570\u636E"))), tab === 'senti' && (Senti ? /*#__PURE__*/React.createElement("div", {
    className: "v9-senti-host"
  }, /*#__PURE__*/React.createElement(Senti, {
    game: game
  })) : /*#__PURE__*/React.createElement("div", {
    className: "panel ph"
  }, /*#__PURE__*/React.createElement("p", null, "v9 \u8206\u60C5\u7EC4\u4EF6\u672A\u52A0\u8F7D")))), /*#__PURE__*/React.createElement("div", {
    className: "sim"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sl"
  }, "\u8FDB\u5EA6"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: value,
    onChange: e => setValue(+e.target.value)
  }), /*#__PURE__*/React.createElement("output", {
    className: "mono"
  }, value, "%")));
}
Object.assign(window, {
  V10App,
  V10Journey
});