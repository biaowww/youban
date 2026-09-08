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

/* ───────── 进度 Tab：V10Hype —— v9 HypeProgress 复刻版（v9 原件不动）
   与 v9 的差异仅三处（王彪 2026-07 反馈）：
   ① 静止/拖动都只显示当前前后各 1 个节点（v9 是静止 6 个/拖动 ±3）
   ② Boss 节点内嵌 ⚔ 字形
   ③ 图例只留 Boss战 + 推荐起点，字号缩小 ───────── */
function V10Hype({
  game,
  value,
  onChange,
  onBoss,
  onEntry,
  idBase,
  guard
}) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [tapped, setTapped] = useState(null);
  const gid = idBase || 'v10-' + game.id;
  const pk = game.hype;
  const nodes = React.useMemo(() => buildNodes(game), [game.id]);
  const entries = (game.entries || []).filter(e => e.pct > 0);

  /* 波形：与 v9 完全一致 */
  const Y = s => 100 - Math.max(0, Math.min(10, s)) / 10 * 86 - 7;
  const cps = [{
    x: 0,
    s: 1.1
  }];
  pk.forEach((p, i) => {
    if (i > 0) {
      const pr = pk[i - 1];
      const valley = Math.max(0.8, Math.min(pr.score, p.score) - 3.6 - i % 2 * 0.8);
      cps.push({
        x: (pr.pct + p.pct) / 2,
        s: valley
      });
    }
    cps.push({
      x: p.pct,
      s: p.score
    });
  });
  cps.push({
    x: 100,
    s: 1.1
  });
  const wpts = cps.map(c => ({
    x: c.x,
    y: Y(c.s)
  }));
  const line = smoothPath(wpts);
  const area = line + ' L 100 100 L 0 100 Z';
  const setFromX = useCallback(clientX => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let pct = (clientX - r.left) / r.width * 100;
    pct = Math.max(0, Math.min(100, pct));
    for (const p of pk) if (Math.abs(p.pct - pct) < 1.6) pct = p.pct;
    onChange(Math.round(pct));
  }, [pk, onChange]);
  useEffect(() => {
    if (!drag) return;
    const mv = e => {
      e.preventDefault();
      setFromX(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const up = () => setDrag(false);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, setFromX]);

  /* 差异①：可见节点 = 当前前后各 1 个 */
  const before = nodes.filter(n => n.pct <= value).slice(-1);
  const after = nodes.filter(n => n.pct > value).slice(0, 1);
  const visKeys = new Set([...before, ...after].map(n => n.pct + n.type));
  const tapNode = (n, e) => {
    e.stopPropagation();
    /* 防剧透：未到的 Boss 不直接开抽屉（会剧透），改弹匿名气泡 */
    if (n.type === 'boss' && !(guard && n.pct > value)) {
      onBoss && onBoss(n.boss);
    } else {
      setTapped(t => t && t.pct === n.pct ? null : n);
    }
  };
  const capLabel = n => guard && n.pct > value ? '？？？（防剧透）' : n.label;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "hype",
    ref: ref,
    onPointerDown: e => {
      setTapped(null);
      setDrag(true);
      setFromX(e.clientX);
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "wave",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: 'wg-' + gid,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--g-accent)",
    stopOpacity: ".5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "58%",
    stopColor: "var(--g-accent)",
    stopOpacity: ".14"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--g-accent)",
    stopOpacity: ".02"
  })), /*#__PURE__*/React.createElement("clipPath", {
    id: 'wc-' + gid
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: value,
    height: "100"
  }))), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: 'url(#wg-' + gid + ')',
    opacity: ".34"
  }), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: 'url(#wg-' + gid + ')',
    clipPath: 'url(#wc-' + gid + ')'
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--g-accent)",
    strokeWidth: ".8",
    strokeOpacity: ".3",
    vectorEffect: "non-scaling-stroke"
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--g-accent)",
    strokeWidth: "1.6",
    clipPath: 'url(#wc-' + gid + ')',
    vectorEffect: "non-scaling-stroke"
  })), /*#__PURE__*/React.createElement("div", {
    className: "baseline"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fill",
    style: {
      width: value + '%'
    }
  }), game.chapters.slice(0, -1).map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "tick",
    style: {
      left: c.end + '%'
    }
  })), entries.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: 'e' + i,
    className: "enode",
    style: {
      left: e.pct + '%'
    },
    onPointerDown: ev => ev.stopPropagation(),
    onClick: ev => {
      ev.stopPropagation();
      onEntry && onEntry(e);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 12
  }))), nodes.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'node n-' + NODE_TYPES[n.type].cls + (n.pct < value ? ' passed' : ' upcoming') + (visKeys.has(n.pct + n.type) ? '' : ' hidden') + (tapped && tapped.pct === n.pct ? ' on' : ''),
    style: {
      left: n.pct + '%'
    },
    onPointerDown: e => e.stopPropagation(),
    onClick: e => tapNode(n, e)
  }, n.type === 'boss' && /*#__PURE__*/React.createElement("span", {
    className: "nsw"
  }, '⚔︎'))), tapped && /*#__PURE__*/React.createElement("div", {
    className: 'node-cap n-' + NODE_TYPES[tapped.type].cls,
    style: {
      left: Math.min(80, Math.max(16, tapped.pct)) + '%'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "nc-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: NODE_TYPES[tapped.type].icon,
    size: 11
  })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, nodeLabel(tapped.type, game)), capLabel(tapped))), /*#__PURE__*/React.createElement("div", {
    className: "thumb",
    style: {
      left: value + '%'
    },
    onPointerDown: e => {
      e.stopPropagation();
      setTapped(null);
      setDrag(true);
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "thumb-flag",
    style: {
      left: value + '%'
    }
  }, value, "%")), /*#__PURE__*/React.createElement("div", {
    className: "hype-ends"
  }, /*#__PURE__*/React.createElement("span", null, "\u5F00\u573A"), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "\u7EC8\u7AE0")), /*#__PURE__*/React.createElement("div", {
    className: "node-legend"
  }, !!(game.bosses && game.bosses.length) && /*#__PURE__*/React.createElement("span", {
    className: "leg n-boss"
  }, /*#__PURE__*/React.createElement("i", {
    className: "leg-dot"
  }, '⚔︎'), nodeLabel('boss', game)), /*#__PURE__*/React.createElement("span", {
    className: "leg n-entry"
  }, /*#__PURE__*/React.createElement("i", {
    className: "leg-dot leg-star"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 9
  })), "\u63A8\u8350\u8D77\u70B9")));
}

/* ───────── 进度 Tab：V10Axis —— v10 动态渐变坐标轴（拖动显示当前章节/位置） ───────── */
function V10Axis({
  game,
  value,
  setValue,
  openEntry
}) {
  const barRef = useRef(null);
  const chapters = game.chapters;
  const entries = game.entries || [];
  const curCh = chapters.find(c => value >= c.start && value < c.end) || chapters[chapters.length - 1];
  const shortName = c => c.name.split(/[：:]/)[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "axis"
  }, /*#__PURE__*/React.createElement("div", {
    ref: barRef,
    className: "bar",
    onClick: e => {
      if (e.target !== barRef.current && !e.target.classList.contains('fill') && !e.target.classList.contains('fillclip')) return;
      const r = barRef.current.getBoundingClientRect();
      setValue(Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100))));
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fillclip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fill",
    style: {
      width: value + '%'
    }
  })), chapters.slice(1).map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "tick",
    style: {
      left: c.start + '%'
    }
  })), entries.map((en, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'entry' + (en.pct <= value ? ' done' : ''),
    style: {
      left: en.pct + '%'
    },
    title: `🎁 ${en.label}（${en.pct}%）`,
    onClick: () => openEntry && openEntry(en)
  })), /*#__PURE__*/React.createElement("div", {
    className: "youmk",
    style: {
      left: value + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "axis-cap"
  }, /*#__PURE__*/React.createElement("span", null, shortName(chapters[0])), /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, value, "% \xB7 ", curCh.name), /*#__PURE__*/React.createElement("span", null, shortName(chapters[chapters.length - 1]))));
}

/* ───────── 进度 Tab：高潮节点前后小卡（v9 HypeProgress 的 v10 补充件） ───────── */
function V10PrevNext({
  game,
  value
}) {
  /* 事件源 = ⚔Boss + 🔥名场面（score>=8），只取当前前后各一个 */
  const evs = React.useMemo(() => [...(game.bosses || []).map(b => ({
    pct: b.pct,
    n: b.name,
    t: game.bossTerm || 'Boss 战',
    ic: '⚔'
  })), ...(game.hype || []).filter(p => p.score >= 8).map(p => ({
    pct: p.pct,
    n: p.label,
    t: '名场面',
    ic: '🔥'
  }))].sort((a, b) => a.pct - b.pct), [game.id]);
  const prev = [...evs].reverse().find(e => e.pct <= value);
  const next = evs.find(e => e.pct > value);
  if (!prev && !next) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "nearby"
  }, prev && /*#__PURE__*/React.createElement("div", {
    className: "nb prev"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, prev.ic), /*#__PURE__*/React.createElement("div", {
    className: "tt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tl"
  }, "\u521A\u8D70\u8FC7"), /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, prev.n), /*#__PURE__*/React.createElement("div", {
    className: "mt2"
  }, prev.t, " \xB7 ", prev.pct, "%"))), next && /*#__PURE__*/React.createElement("div", {
    className: "nb next"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, next.ic), /*#__PURE__*/React.createElement("div", {
    className: "tt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tl"
  }, "\u5373\u5C06\u62B5\u8FBE"), /*#__PURE__*/React.createElement("div", {
    className: "nm spoil"
  }, next.n), /*#__PURE__*/React.createElement("div", {
    className: "mt2"
  }, next.t, " \xB7 ", next.pct, "% \xB7 \u7EA6 ", ((next.pct - value) / 100 * game.hoursMain).toFixed(1), "h \u540E"))));
}

/* ───────── 进度 Tab：章节墙（步骤 4，v10-C 大卡 + ⚔ 存档集成，不做独立 Boss 列表） ───────── */
function V10Chapters({
  game,
  value,
  openBoss
}) {
  /* 无每章配图 → 用 banner 按章节序号取不同焦点位，营造差异 */
  const posFor = i => `${i * 37 % 70 + 15}% ${i * 29 % 50 + 20}%`;
  const [peeked, setPeeked] = useState({});
  return /*#__PURE__*/React.createElement("div", {
    className: "ch-grid"
  }, game.chapters.map((c, i) => {
    const saves = (game.bosses || []).filter(b => b.pct >= c.start && b.pct < c.end);
    const state = value >= c.end ? 'done' : value >= c.start ? 'current' : 'future';
    const fillW = state === 'done' ? 100 : state === 'current' ? Math.round((value - c.start) / Math.max(1, c.end - c.start) * 100) : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'ch-card ' + state + (peeked[i] ? ' peeked' : '')
    }, state === 'future' && /*#__PURE__*/React.createElement("span", {
      className: "peek",
      onClick: () => setPeeked(p => ({
        ...p,
        [i]: !p[i]
      }))
    }, "\u5077\u770B\u4E00\u773C \uD83D\uDC40"), /*#__PURE__*/React.createElement("div", {
      className: "ch-thumb"
    }, /*#__PURE__*/React.createElement("img", {
      src: game.banner,
      style: {
        objectPosition: posFor(i)
      },
      alt: "",
      onError: e => {
        e.target.style.display = 'none';
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "tint"
    }), /*#__PURE__*/React.createElement("span", {
      className: "ch-badge"
    }, state === 'done' ? '✓ 已走过' : state === 'current' ? '⟡ 你在这里' : '🔒 未抵达'), /*#__PURE__*/React.createElement("span", {
      className: "planet"
    }, "\uD83E\uDE90 ", c.planet), /*#__PURE__*/React.createElement("span", {
      className: "range mono"
    }, c.start, "\u2013", c.end, "%")), /*#__PURE__*/React.createElement("div", {
      className: "ch-body"
    }, /*#__PURE__*/React.createElement("h3", null, c.name), /*#__PURE__*/React.createElement("div", {
      className: "ch-key"
    }, c.key), /*#__PURE__*/React.createElement("div", {
      className: "ch-foot"
    }, c.hype ? /*#__PURE__*/React.createElement("span", {
      className: "hype-n"
    }, "\uD83D\uDD25 \u70ED\u5EA6 ", c.hype) : null, /*#__PURE__*/React.createElement("div", {
      className: "ch-fill"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: fillW + '%'
      }
    }))), saves.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "ch-saves"
    }, saves.map(b => {
      const locked = b.pct > value;
      return /*#__PURE__*/React.createElement("div", {
        key: b.id || b.pct,
        className: 'sv' + (b.hi ? ' hi' : '') + (locked ? ' locked' : '')
      }, /*#__PURE__*/React.createElement("span", {
        className: "swd"
      }, "\u2694"), /*#__PURE__*/React.createElement("span", {
        className: "n",
        onClick: () => {
          if (!locked && openBoss) openBoss(b);
        }
      }, b.name), b.hi ? /*#__PURE__*/React.createElement("span", {
        className: "hib"
      }, "\u540D\u573A\u9762") : null, /*#__PURE__*/React.createElement("span", {
        className: "pc2 mono"
      }, b.pct, "%"), /*#__PURE__*/React.createElement("button", {
        className: "dl",
        onClick: () => openBoss && openBoss(b)
      }, '⤓ 存档'));
    }))));
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
  openEntry,
  theme,
  setTheme
}) {
  const [tab, setTab] = useState('progress');
  const [guard, setGuard] = useState(true); // 防剧透默认开（原型默认 body.guard）
  const [solid, setSolid] = useState(false); // 顶栏滚动加底
  const [greet, setGreet] = useState(true); // 进入游戏后的打招呼 toast（自动消失）
  const rootRef = useRef(null);
  /* 深色 = v9 的「游戏主题色」机制（同一状态，切 v9/v10 保持一致） */
  const dark = theme === 'game';
  const toggleTheme = () => setTheme && setTheme(dark ? 'light' : 'game');
  useEffect(() => {
    setGreet(true);
    const t = setTimeout(() => setGreet(false), 3900);
    return () => clearTimeout(t);
  }, [game.id]);
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
    title: dark ? '切浅色' : '切游戏主题色',
    onClick: toggleTheme
  }, dark ? '☀' : '🌙'), /*#__PURE__*/React.createElement("button", {
    className: "t-ctl",
    title: "\u5207\u56DE\u65E7\u7248\u754C\u9762",
    onClick: onSwitchToV9
  }, "v9")), greet && /*#__PURE__*/React.createElement("div", {
    className: "greet-toast",
    key: game.id
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\u6B22\u8FCE\u56DE\u6765 \xB7 \u7EE7\u7EED\u966A ", /*#__PURE__*/React.createElement("b", null, game.short), " \u8D70\u8FD9\u6BB5\u8DEF"), /*#__PURE__*/React.createElement("header", {
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
  }, /*#__PURE__*/React.createElement("h1", null, game.titleMain), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, game.titleSub), /*#__PURE__*/React.createElement("div", {
    className: "hero-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, value, /*#__PURE__*/React.createElement("small", null, "%")), /*#__PURE__*/React.createElement("span", null, "\u5B8C\u6210\u5EA6")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, played.toFixed(1), /*#__PURE__*/React.createElement("small", null, "h")), /*#__PURE__*/React.createElement("span", null, "\u5DF2\u966A\u8DD1")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, Math.max(0, game.hoursMain - played).toFixed(1), /*#__PURE__*/React.createElement("small", null, "h")), /*#__PURE__*/React.createElement("span", null, "\u5269\u4F59(\u4E3B\u7EBF)")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, bossPassed, /*#__PURE__*/React.createElement("small", null, "/", game.bosses.length)), /*#__PURE__*/React.createElement("span", null, "Boss \u5DF2\u8FC7"))))), /*#__PURE__*/React.createElement("main", null, tab === 'progress' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ProgressInput, {
    game: game,
    value: value,
    setValue: setValue
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel sec-gap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "About"), /*#__PURE__*/React.createElement("h2", null, "\u6E38\u620F\u7B80\u4ECB")), /*#__PURE__*/React.createElement("div", {
    className: "v10-chiprow"
  }, game.developer ? /*#__PURE__*/React.createElement("span", {
    className: "vchip"
  }, game.developer, game.year ? ' · ' + game.year : '') : null, game.genre ? /*#__PURE__*/React.createElement("span", {
    className: "vchip"
  }, game.genre) : null, game.hoursMain > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "vchip"
  }, "\u4E3B\u7EBF\u7EA6 ", game.hoursMain, "h") : null), /*#__PURE__*/React.createElement(Overview, {
    game: game
  })), /*#__PURE__*/React.createElement("div", {
    className: "panel sec-gap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Progress"), /*#__PURE__*/React.createElement("h2", null, "\u6D41\u7A0B\u8FDB\u5EA6"), /*#__PURE__*/React.createElement("span", {
    className: "note"
  }, "\u62D6\u52A8\u9884\u89C8")), /*#__PURE__*/React.createElement(V10Hype, {
    game: game,
    value: value,
    onChange: setValue,
    onBoss: openBoss,
    onEntry: openEntry,
    idBase: 'v10-' + game.id,
    guard: guard
  }), /*#__PURE__*/React.createElement(V10Axis, {
    game: game,
    value: value,
    setValue: setValue,
    openEntry: openEntry
  }), /*#__PURE__*/React.createElement(V10PrevNext, {
    game: game,
    value: value
  })), /*#__PURE__*/React.createElement("div", {
    className: "panel sec-gap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Chapters"), /*#__PURE__*/React.createElement("h2", null, "\u7AE0\u8282\u5899"), /*#__PURE__*/React.createElement("span", {
    className: "note"
  }, "\u2694 \u5B58\u6863\u5728\u5404\u7AE0\u5361\u5185")), /*#__PURE__*/React.createElement(V10Chapters, {
    game: game,
    value: value,
    openBoss: openBoss
  }))), tab === 'journey' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Journey"), /*#__PURE__*/React.createElement("h2", null, "\u6210\u957F\u65C5\u7A0B")), game.journey && game.journey.length > 0 ? /*#__PURE__*/React.createElement(V10Journey, {
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
  V10Journey,
  V10Hype,
  V10Axis,
  V10PrevNext,
  V10Chapters
});