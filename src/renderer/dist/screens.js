/* ============================================================
   游伴 YouBan · 界面
   层级：游戏库(home) → 进入某游戏 → 进度 / 历程 / 舆情
   ============================================================ */
// 头像占位（本地 SVG）。交付开发时替换为真实头像 URL 即可。
const AVATAR = 'assets/avatar-default.svg';

/* ════════════ 游戏库（home，层级最高） ════════════ */
function LibraryScreen({
  games,
  gi,
  enter,
  onProfile
}) {
  const cur = games[gi];
  return /*#__PURE__*/React.createElement("div", {
    className: "yb-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appbar lib-bar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, "\u6211\u7684\u6E38\u620F\u5E93"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, games.length, " \u6B3E \xB7 \u5DF2\u540C\u6B65")), /*#__PURE__*/React.createElement("button", {
    className: "avatar-btn",
    onClick: onProfile
  }, /*#__PURE__*/React.createElement("img", {
    src: AVATAR,
    alt: "\u6211\u7684",
    onError: e => {
      e.target.style.display = 'none';
      e.target.parentNode.classList.add('mono-fallback');
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lib"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lib-hero interactive",
    onClick: () => enter(gi),
    style: {
      background: `linear-gradient(120deg, ${cur.theme.bg}, ${cur.theme.accent2})`
    }
  }, /*#__PURE__*/React.createElement("img", {
    className: "bg",
    src: cur.banner,
    alt: "",
    onError: e => e.target.style.display = 'none'
  }), /*#__PURE__*/React.createElement("div", {
    className: "veil"
  }), /*#__PURE__*/React.createElement("div", {
    className: "inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag accent resume"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 12
  }), " \u7EE7\u7EED\u6E38\u73A9 \xB7 ", cur.currentPct, "%"), /*#__PURE__*/React.createElement("h2", null, cur.titleMain), /*#__PURE__*/React.createElement("div", {
    className: "pct mono"
  }, cur.titleSub, " \xB7 \u5269\u7EA6 ", remainHours(cur, cur.currentPct), " \u5C0F\u65F6"))), /*#__PURE__*/React.createElement("div", {
    className: "lib-sec-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u5168\u90E8\u6E38\u620F"), /*#__PURE__*/React.createElement("div", {
    className: "c mono"
  }, "\u5DF2\u540C\u6B65 Steam \xB7 WeGame")), /*#__PURE__*/React.createElement("div", {
    className: "lib-grid"
  }, games.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: g.id,
    className: 'poster' + (i === gi ? ' sel' : ''),
    onClick: () => enter(i)
  }, /*#__PURE__*/React.createElement("img", {
    src: g.poster,
    alt: g.titleMain,
    onError: e => {
      e.target.style.opacity = 0;
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "grad"
  }), /*#__PURE__*/React.createElement("div", {
    className: "badge"
  }, g.currentPct === 0 ? '未开始' : g.currentPct + '%'), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, g.short), /*#__PURE__*/React.createElement("div", {
    className: "pb"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: Math.max(3, g.currentPct) + '%',
      background: g.theme.accent
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "poster add-tile"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "grid",
    size: 24
  }), /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u8FDE\u63A5\u5E73\u53F0"), /*#__PURE__*/React.createElement("div", {
    className: "m mono"
  }, "Steam \xB7 WeGame")))));
}

/* ════════════ 进度输入（手动 / Steam / 截图） ════════════ */
function ProgressInput({
  game,
  value,
  setValue
}) {
  const [m, setM] = useState('manual');
  const [sid, setSid] = useState('');
  /* Steam 地板模型（2026-07-28 拍板）：成就 = 进度下界证据，单向使用。
     floor.pct > 玩家选择 → 出可拒绝的校正提示；否则静默佐证。永不自动覆盖指针。 */
  const [floor, setFloor] = useState(null); // 引擎结果（floorPct/unlocked/matched/error）
  const [floorBusy, setFloorBusy] = useState(false);
  const [floorErr, setFloorErr] = useState('');
  const [dismissed, setDismissed] = useState(false); // 玩家点了「保持不变」
  const FLOOR_MIN_MAP = 5; // 映射密度阈值：低于此只做橱窗、不画地板线
  const canFloor = game.ach.length >= FLOOR_MIN_MAP;
  const readSteam = async () => {
    setFloorErr('');
    setFloor(null);
    setDismissed(false);
    const client = window.__YB_STEAM_MOCK__;
    const engine = window.YBSteamProgress;
    if (!client || !engine) {
      setFloorErr('Steam 数据通道未就绪');
      return;
    }
    if (!/^\d{17}$/.test(sid.trim())) {
      setFloorErr('请输入 17 位 SteamID64（演示：76561190000000001）');
      return;
    }
    setFloorBusy(true);
    try {
      const resp = await client.getPlayerAchievements(sid.trim(), game.appId);
      const raw = {
        achievements: game.ach.map(a => ({
          steamId: a.id,
          name: a.name,
          progressPct: a.pct
        }))
      };
      setFloor(engine.progressFromAchievements(raw, resp));
    } catch (e) {
      setFloorErr('档案未找到（Mock 演示 ID 见占位符）');
    } finally {
      setFloorBusy(false);
    }
  };
  const chapterOf = pct => {
    const c = game.chapters.find(c => pct >= c.start && pct < c.end);
    return c ? c.name : null;
  };
  const tabs = [['manual', '手动选章节', 'pin'], ['steam', 'Steam 成就', 'trophy'], ['ai', '截图识别', 'camera']];
  return /*#__PURE__*/React.createElement("div", {
    className: "input-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic-head"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "progress",
    size: 15
  }), /*#__PURE__*/React.createElement("span", null, "\u66F4\u65B0\u8FDB\u5EA6")), /*#__PURE__*/React.createElement("div", {
    className: "seg input-seg"
  }, tabs.map(([k, n, ic]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: m === k ? 'on' : '',
    onClick: () => setM(k)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 14
  }), n))), /*#__PURE__*/React.createElement("div", {
    className: "ic-body"
  }, m === 'manual' && /*#__PURE__*/React.createElement("label", {
    className: "select-wrap"
  }, /*#__PURE__*/React.createElement("select", {
    value: game.chapters.find(c => value >= c.start && value < c.end)?.start ?? '',
    onChange: e => setValue(parseInt(e.target.value))
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, "\u2014 \u9009\u62E9\u5F53\u524D\u6240\u5728\u7AE0\u8282 \u2014"), game.chapters.map((c, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: c.start
  }, c.name, "\uFF08", c.start, "%\uFF09")), /*#__PURE__*/React.createElement("option", {
    value: 100
  }, "\u901A\u5173 \u2713")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevd",
    size: 16
  })), m === 'steam' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "steam-row"
  }, /*#__PURE__*/React.createElement("input", {
    className: "text-input",
    value: sid,
    onChange: e => setSid(e.target.value),
    placeholder: "Steam ID64: 76561190000000001\uFF08\u6F14\u793A\uFF09"
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    disabled: floorBusy,
    onClick: readSteam
  }, floorBusy ? '读取中…' : '读取')), floorErr && /*#__PURE__*/React.createElement("div", {
    className: "sync-note"
  }, floorErr), !floor && !floorErr && /*#__PURE__*/React.createElement("div", {
    className: "sync-note"
  }, "\u9700\u8981 Steam \u6863\u6848\u516C\u5F00 \xB7 \u8BFB\u53D6\u540E\u6210\u5C31\u4EC5\u4F5C\u4F50\u8BC1\uFF0C\u4E0D\u4F1A\u8986\u76D6\u4F60\u7684\u8FDB\u5EA6"), floor && floor.error === 'PROFILE_PRIVATE' && /*#__PURE__*/React.createElement("div", {
    className: "sync-note"
  }, "\u8BE5\u6863\u6848\u4E3A\u79C1\u5BC6\uFF0C\u8BFB\u4E0D\u5230\u6210\u5C31 \xB7 \u624B\u52A8\u8FDB\u5EA6\u4E0D\u53D7\u5F71\u54CD"), floor && !floor.error && /*#__PURE__*/React.createElement("div", {
    className: "steam-floor"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sync-note ok"
  }, "\u2713 \u5DF2\u89E3\u9501 ", floor.unlockedCount, "/", floor.totalCount, floor.matchedAchievement ? ` · 最近里程碑：${floor.matchedAchievement.name}` : ' · 暂无剧情里程碑解锁'), canFloor && floor.floorPct > value && !dismissed && /*#__PURE__*/React.createElement("div", {
    className: "floor-prompt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fp-text"
  }, "Steam \u663E\u793A\u4F60\u5DF2\u89E3\u9501\u300C", floor.matchedAchievement.name, "\u300D\uFF0C\u8FDB\u5EA6\u81F3\u5C11 ", floor.floorPct, "%", chapterOf(floor.floorPct) ? `（${chapterOf(floor.floorPct)}）` : '', "\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "fp-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setValue(floor.floorPct)
  }, "\u66F4\u65B0\u5230 ", floor.floorPct, "%"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setDismissed(true)
  }, "\u4FDD\u6301\u4E0D\u53D8"))), canFloor && floor.floorPct <= value && floor.unlockedCount > 0 && /*#__PURE__*/React.createElement("div", {
    className: "sync-note"
  }, "\u4E0E\u4F60\u7684\u8FDB\u5EA6\u4E00\u81F4\uFF08\u6210\u5C31\u4E0B\u754C ", floor.floorPct, "%\uFF09"), !canFloor && /*#__PURE__*/React.createElement("div", {
    className: "sync-note"
  }, "\u8BE5\u4F5C\u5267\u60C5\u6210\u5C31\u8F83\u5C11\uFF08", floor.totalCount, " \u6761\uFF09\uFF0C\u4EC5\u4F5C\u6210\u5C31\u5C55\u793A\u3001\u4E0D\u63A8\u7B97\u8FDB\u5EA6"))), m === 'ai' && /*#__PURE__*/React.createElement("div", {
    className: "ai-panel"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "camera",
    size: 22
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u622A\u56FE AI \u8BC6\u522B \xB7 MVP \u540E\u671F"), /*#__PURE__*/React.createElement("span", null, "\u4E0A\u4F20\u6E38\u620F\u622A\u56FE\uFF0C\u63A5\u5165 Claude Vision \u81EA\u52A8\u8BC6\u522B\u5F53\u524D\u8FDB\u5EA6")))));
}

/* ════════════ 游戏简介 ════════════ */
function Overview({
  game
}) {
  const [open, setOpen] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "overview"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ov-tagline serif"
  }, "\u300C ", game.tagline, " \u300D"), /*#__PURE__*/React.createElement("div", {
    className: 'ov-desc' + (open ? ' open' : '')
  }, game.desc), /*#__PURE__*/React.createElement("button", {
    className: "ov-more",
    onClick: () => setOpen(o => !o)
  }, open ? '收起' : '展开简介', " ", /*#__PURE__*/React.createElement(Icon, {
    name: open ? 'chevd' : 'chev',
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "ov-highlights"
  }, game.highlights.map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ov-hl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gem",
    size: 12
  })), /*#__PURE__*/React.createElement("span", null, h.text)))));
}

/* ════════════ 进度主卡（进度 Tab） ════════════ */
function ProgressScreen({
  game,
  value,
  setValue,
  openBoss,
  openEntry
}) {
  const nextPeak = game.hype.find(p => p.pct > value);
  const curChap = game.chapters.find(c => value >= c.start && value < c.end) || game.chapters[game.chapters.length - 1];
  const [openCh, setOpenCh] = useState(curChap.name);
  useEffect(() => {
    setOpenCh(curChap.name);
  }, [game.id]);
  return /*#__PURE__*/React.createElement("div", {
    className: "yb-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "banner",
    style: {
      background: `linear-gradient(165deg, ${game.theme.accent2}, ${game.theme.bg} 70%)`
    }
  }, /*#__PURE__*/React.createElement("img", {
    className: "bg",
    src: game.banner,
    alt: "",
    onError: e => e.target.style.display = 'none'
  }), /*#__PURE__*/React.createElement("div", {
    className: "scrim-top"
  }), /*#__PURE__*/React.createElement("div", {
    className: "scrim-bot"
  }), /*#__PURE__*/React.createElement("div", {
    className: "title-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gname"
  }, game.titleMain), /*#__PURE__*/React.createElement("div", {
    className: "gsub"
  }, game.titleSub, " \xB7 ", game.year)), /*#__PURE__*/React.createElement("div", {
    className: "pct-badge"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, value, /*#__PURE__*/React.createElement("i", null, "%")), /*#__PURE__*/React.createElement("span", null, "\u5DF2\u5B8C\u6210"))), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement(ProgressInput, {
    game: game,
    value: value,
    setValue: setValue
  }), /*#__PURE__*/React.createElement(Overview, {
    game: game
  }), /*#__PURE__*/React.createElement("div", {
    className: "stat-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "\u5DF2\u73A9\u7EA6"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, (game.hoursMain * value / 100).toFixed(1), /*#__PURE__*/React.createElement("small", null, "h"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "\u5269\u4F59\u7EA6"), /*#__PURE__*/React.createElement("div", {
    className: "v accent"
  }, ((100 - value) / 100 * game.hoursMain).toFixed(1), /*#__PURE__*/React.createElement("small", null, "h"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "\u4E3B\u7EBF\u5171"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "~", game.hoursMain, /*#__PURE__*/React.createElement("small", null, "h")))), /*#__PURE__*/React.createElement("div", {
    className: "prog-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "\u6D41\u7A0B\u8FDB\u5EA6 \xB7 \u62D6\u52A8\u9884\u89C8"), /*#__PURE__*/React.createElement("div", {
    className: "now mono"
  }, curChap.name.split('·').pop().trim())), /*#__PURE__*/React.createElement(HypeProgress, {
    game: game,
    value: value,
    onChange: setValue,
    onBoss: openBoss,
    onEntry: openEntry
  }), nextPeak ? /*#__PURE__*/React.createElement("div", {
    className: "next-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flag",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a"
  }, "\u4E0B\u4E00\u4E2A\u540D\u573A\u9762"), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, nextPeak.label)), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, ((nextPeak.pct - value) / 100 * game.hoursMain).toFixed(1)), /*#__PURE__*/React.createElement("span", null, "\u5C0F\u65F6\u540E"))) : /*#__PURE__*/React.createElement("div", {
    className: "next-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flag",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "a"
  }, "\u5DF2\u62B5\u8FBE\u7EC8\u7AE0"), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, "\u4EAB\u53D7\u7ED3\u5C40"))), /*#__PURE__*/React.createElement("div", {
    className: "sec-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u5168\u6D41\u7A0B\u7AE0\u8282"), /*#__PURE__*/React.createElement("div", {
    className: "ln"
  }), /*#__PURE__*/React.createElement("div", {
    className: "n mono"
  }, game.chapters.length, " \u7AE0")), game.chapters.map((c, i) => {
    const done = value >= c.end,
      cur = value >= c.start && value < c.end,
      open = openCh === c.name;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'chap' + (done ? ' done' : '') + (cur ? ' cur' : '') + (open ? ' open' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "chap-row",
      onClick: () => setOpenCh(open ? '' : c.name)
    }, /*#__PURE__*/React.createElement("div", {
      className: "dot"
    }), /*#__PURE__*/React.createElement("div", {
      className: "info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "nm"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "mt"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pin",
      size: 11
    }), c.planet)), /*#__PURE__*/React.createElement("div", {
      className: "rng mono"
    }, c.start, "\u2013", c.end, "%")), open && /*#__PURE__*/React.createElement("div", {
      className: "chap-detail"
    }, /*#__PURE__*/React.createElement("p", {
      className: "plot"
    }, c.plot), /*#__PURE__*/React.createElement("p", {
      className: "goals"
    }, /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(Icon, {
      name: "target",
      size: 13
    }), "\u76EE\u6807"), c.goals), /*#__PURE__*/React.createElement("p", {
      className: "chars"
    }, /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 13
    }), "\u65B0\u767B\u573A"), c.chars), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost jump",
      onClick: () => setValue(Math.round((c.start + c.end) / 2))
    }, "\u8DF3\u5230\u6B64\u7AE0\u9884\u89C8")));
  })));
}

/* ════════════ 主角成长历程（历程 Tab） ════════════ */
function JourneyScreen({
  game,
  value,
  setValue
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "yb-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appbar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "PROTAGONIST JOURNEY"), /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, "\u4E3B\u89D2\u6210\u957F\u5386\u7A0B"))), /*#__PURE__*/React.createElement("div", {
    className: "journey"
  }, game.journey.map((s, i) => {
    const done = value > s.pct,
      cur = Math.abs(value - s.pct) <= 8;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'jstep' + (done ? ' done' : '') + (cur ? ' cur' : ''),
      onClick: () => setValue(s.pct)
    }, /*#__PURE__*/React.createElement("div", {
      className: "jrail"
    }, /*#__PURE__*/React.createElement("div", {
      className: "jdot"
    }), i < game.journey.length - 1 && /*#__PURE__*/React.createElement("div", {
      className: "jline"
    })), /*#__PURE__*/React.createElement("div", {
      className: "jcontent"
    }, /*#__PURE__*/React.createElement("div", {
      className: "jpct mono"
    }, s.pct, "%"), /*#__PURE__*/React.createElement("div", {
      className: "jevent"
    }, s.event), /*#__PURE__*/React.createElement("div", {
      className: "jdesc"
    }, s.desc), /*#__PURE__*/React.createElement("div", {
      className: "junlocks"
    }, s.unlocks.map((u, k) => /*#__PURE__*/React.createElement("span", {
      key: k,
      className: "tag accent"
    }, u)))));
  })));
}

/* ════════════ 玩家舆情（舆情 Tab） ════════════ */
function SentimentScreen({
  game
}) {
  const s = game.sentiment,
    tier = tierOf(s.score);
  const fmtK = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n;
  const groups = [{
    t: '好评',
    cls: 'praise',
    icon: 'thumb',
    rot: false,
    data: s.praise
  }, {
    t: '热议',
    cls: 'hot',
    icon: 'flame',
    rot: false,
    data: s.hot
  }, {
    t: '差评',
    cls: 'crit',
    icon: 'thumb',
    rot: true,
    data: s.criticism
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "yb-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appbar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "PLAYER SENTIMENT"), /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, "\u73A9\u5BB6\u8206\u60C5"))), /*#__PURE__*/React.createElement("div", {
    className: "senti"
  }, /*#__PURE__*/React.createElement("div", {
    className: "score-hero"
  }, /*#__PURE__*/React.createElement(ScoreRing, {
    score: s.score
  }), /*#__PURE__*/React.createElement("div", {
    className: "score-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lvl",
    style: {
      color: tier.c
    }
  }, tier.t), /*#__PURE__*/React.createElement("div", {
    className: "src mono"
  }, s.source), /*#__PURE__*/React.createElement("div", {
    className: "note"
  }, s.note))), /*#__PURE__*/React.createElement("div", {
    className: "sec-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u73A9\u5BB6\u600E\u4E48\u8BF4"), /*#__PURE__*/React.createElement("div", {
    className: "ln"
  }), /*#__PURE__*/React.createElement("div", {
    className: "n mono"
  }, "TOP 3")), s.quotes.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "quote"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qmark"
  }, "\u201D"), /*#__PURE__*/React.createElement("p", null, q.text), /*#__PURE__*/React.createElement("div", {
    className: "ft"
  }, /*#__PURE__*/React.createElement("span", {
    className: "au"
  }, q.author), /*#__PURE__*/React.createElement("span", {
    className: "up"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "thumb",
    size: 13
  }), fmtK(q.up))))), groups.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.cls,
    className: "kw-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gh"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'gh-ic ' + g.cls
  }, /*#__PURE__*/React.createElement(Icon, {
    name: g.icon,
    size: 13,
    style: g.rot ? {
      transform: 'rotate(180deg)'
    } : null
  })), /*#__PURE__*/React.createElement("span", {
    className: "gh-t"
  }, g.t), /*#__PURE__*/React.createElement("span", {
    className: "gh-n mono"
  }, g.data.length)), /*#__PURE__*/React.createElement("div", {
    className: "kw-wrap"
  }, g.data.map((k, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "kw-chip"
  }, k)))))));
}

/* ════════════ 我的（平台同步） ════════════ */
function MeScreen({
  games,
  onClose,
  theme,
  setTheme,
  game,
  onConnect
}) {
  const platforms = [{
    id: 'steam',
    n: 'Steam',
    d: '已连接 · 自动同步成就',
    on: true,
    c: '#9bc1d6'
  }, {
    id: 'wegame',
    n: 'WeGame',
    d: '已连接',
    on: true,
    c: '#ea5413'
  }, {
    id: 'playstation',
    n: 'PlayStation',
    d: '点击授权奖杯同步',
    on: false,
    c: '#4f8fde'
  }, {
    id: 'epicgames',
    n: 'Epic Games',
    d: '点击授权',
    on: false,
    c: '#cfcfcf'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "yb-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "appbar me-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "round-btn",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "back",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ttl",
    style: {
      fontSize: 18
    }
  }, "\u6211\u7684")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "senti"
  }, /*#__PURE__*/React.createElement("div", {
    className: "profile-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar-lg"
  }, /*#__PURE__*/React.createElement("img", {
    src: AVATAR,
    alt: "",
    onError: e => {
      e.target.style.display = 'none';
      e.target.parentNode.textContent = '游';
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "lvl"
  }, "\u5929\u547D\u73A9\u5BB6"), /*#__PURE__*/React.createElement("div", {
    className: "note",
    style: {
      marginTop: 4
    }
  }, "\u966A\u4F34 ", games.length, " \u6B3E \xB7 \u7D2F\u8BA1\u7701\u53BB\u7EA6 18 \u5C0F\u65F6\u6478\u7D22"))), /*#__PURE__*/React.createElement("div", {
    className: "sec-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u5916\u89C2\u4E3B\u9898"), /*#__PURE__*/React.createElement("div", {
    className: "ln"
  })), /*#__PURE__*/React.createElement("div", {
    className: "set-row",
    onClick: () => setTheme(theme === 'game' ? 'light' : 'game')
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === 'game' ? 'swatch' : 'sun',
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "set-txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, theme === 'game' ? '游戏主题色' : '浅色（默认）'), /*#__PURE__*/React.createElement("div", {
    className: "at"
  }, theme === 'game' ? '跟随所选游戏的氛围配色' : '点击切换为当前游戏主题色')), /*#__PURE__*/React.createElement("div", {
    className: 'switch' + (theme === 'game' ? ' on' : '')
  }, /*#__PURE__*/React.createElement("i", null))), /*#__PURE__*/React.createElement("div", {
    className: "sec-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u5E73\u53F0\u540C\u6B65"), /*#__PURE__*/React.createElement("div", {
    className: "ln"
  })), platforms.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "plat-row",
    onClick: () => onConnect && onConnect(p)
  }, /*#__PURE__*/React.createElement("div", {
    className: "plat-ic",
    style: {
      background: 'color-mix(in oklab,' + p.c + ' 14%,transparent)',
      borderColor: 'color-mix(in oklab,' + p.c + ' 30%,transparent)'
    }
  }, /*#__PURE__*/React.createElement(PlatformLogo, {
    id: p.id,
    color: p.c,
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "plat-txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, p.n), /*#__PURE__*/React.createElement("div", {
    className: "at mono",
    style: {
      color: p.on ? '#6fb53e' : 'var(--txt-3)'
    }
  }, p.d)), p.on ? /*#__PURE__*/React.createElement("span", {
    className: "tag praise"
  }, "\u5DF2\u8FDE\u63A5") : /*#__PURE__*/React.createElement("span", {
    className: "tag accent"
  }, "\u8FDE\u63A5"))), /*#__PURE__*/React.createElement("div", {
    className: "sec-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u8BBE\u7F6E"), /*#__PURE__*/React.createElement("div", {
    className: "ln"
  })), [['通知提醒', '高潮节点 / 新存档推送'], ['关于游伴', 'v0.1 · Off-Circle Studio']].map(([a, b]) => /*#__PURE__*/React.createElement("div", {
    key: a,
    className: "plat-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "plat-txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, a), /*#__PURE__*/React.createElement("div", {
    className: "at"
  }, b)), /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 16,
    style: {
      color: 'var(--txt-3)'
    }
  })))));
}

/* ════════════ 入场点详情抽屉（二级界面） ════════════ */
// 人物卡：头像插画位（可由开发替换为真实立绘）+ 姓名 + 身份
function CharCard({
  name,
  role,
  game
}) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initial = name.match(/[A-Za-z]/) ? name[0].toUpperCase() : name[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "char-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "char-ava",
    style: {
      background: `linear-gradient(140deg, hsl(${hue} 42% 44%), hsl(${(hue + 38) % 360} 48% 28%))`
    }
  }, /*#__PURE__*/React.createElement("span", null, initial)), /*#__PURE__*/React.createElement("div", {
    className: "char-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cn"
  }, name), role && /*#__PURE__*/React.createElement("div", {
    className: "cr"
  }, role)));
}
function EntryDetail({
  game,
  entry,
  onClose,
  onStart
}) {
  if (!entry) return null;
  const pct = entry.pct;
  // 你将跳过的章节（用于前情提要）
  const skipped = game.chapters.filter(c => c.end <= pct);
  const entering = game.chapters.find(c => pct >= c.start && pct < c.end) || game.chapters[0];
  // 此时已拥有的能力
  const abilities = [];
  game.journey.filter(j => j.pct <= pct).forEach(j => (j.unlocks || []).forEach(u => {
    if (!abilities.includes(u)) abilities.push(u);
  }));
  // 已登场关键人物（取跳过章节的新登场，去重）
  const seen = [];
  game.chapters.filter(c => c.start < pct).forEach(c => {
    (c.chars || '').split(/[、\n]/).forEach(s => {
      const t = s.trim();
      if (!t) return;
      const m = t.match(/^([^（(：:]+)[（(：:]?\s*([^）)]*)/);
      const name = (m ? m[1] : t).trim();
      const role = (m && m[2] ? m[2] : '').replace(/[）)]+$/, '').trim();
      if (name && name.length <= 12 && !seen.some(o => o.name === name)) seen.push({
        name,
        role
      });
    });
  });
  const chars = seen.slice(0, 8);
  // 已了结的 Boss
  const bossesPassed = game.bosses.filter(b => b.pct < pct).length;
  const hasDL = !!game.save;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    onClick: onClose,
    style: {
      zIndex: 103
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "drawer themed show entry-drawer",
    style: {
      zIndex: 104
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "drawer-grip"
  }), /*#__PURE__*/React.createElement("div", {
    className: "entry-detail-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "round-btn ed-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "ed-hours"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, remainHours(game, pct)), /*#__PURE__*/React.createElement("span", null, "\u5C0F\u65F6\u901A\u5173")), /*#__PURE__*/React.createElement("div", {
    className: "ed-titles"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-eyebrow"
  }, "\u5165\u573A\u70B9\u63A8\u8350 \xB7 \u4ECE ", pct, "% \u5F00\u59CB"), /*#__PURE__*/React.createElement("h3", null, entry.label), /*#__PURE__*/React.createElement("div", {
    className: "ed-entering mono"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 12
  }), "\u8FDB\u5165\u300A", entering.name, "\u300B"))), /*#__PURE__*/React.createElement("div", {
    className: "entry-detail-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-stat"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, pct, "%"), /*#__PURE__*/React.createElement("span", null, "\u8D77\u59CB\u8FDB\u5EA6")), /*#__PURE__*/React.createElement("div", {
    className: "ed-stat"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, skipped.length), /*#__PURE__*/React.createElement("span", null, "\u8DF3\u8FC7\u7AE0\u8282")), /*#__PURE__*/React.createElement("div", {
    className: "ed-stat"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, bossesPassed), /*#__PURE__*/React.createElement("span", null, "\u5DF2\u4E86\u7ED3 ", (game.bossTerm || 'Boss').replace(/战$/, '').trim()))), /*#__PURE__*/React.createElement("div", {
    className: "ed-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sh"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "journey",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, "\u5F00\u59CB\u524D\u4F60\u9700\u8981\u77E5\u9053")), skipped.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "ed-recap-empty"
  }, "\u8FD9\u662F\u5B8C\u6574\u4F53\u9A8C\u8D77\u70B9\u2014\u2014\u65E0\u9700\u8865\u8BFE\uFF0C\u4ECE\u7B2C\u4E00\u5E27\u5F00\u59CB\u4EB2\u5386\u5168\u90E8\u5267\u60C5\u3002") : /*#__PURE__*/React.createElement("div", {
    className: "ed-recap"
  }, skipped.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ed-recap-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rc-pct mono"
  }, c.end, "%"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rc-name"
  }, c.name), /*#__PURE__*/React.createElement("div", {
    className: "rc-key"
  }, c.key)))))), entering && entering.plot && /*#__PURE__*/React.createElement("div", {
    className: "ed-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sh"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, "\u4F60\u5C06\u4ECE\u8FD9\u91CC\u8FDB\u5165 \xB7 ", entering.name)), /*#__PURE__*/React.createElement("p", {
    className: "ed-reason"
  }, entering.plot)), abilities.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ed-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sh"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gem",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, "\u6B64\u65F6\u4F60\u5DF2\u62E5\u6709")), /*#__PURE__*/React.createElement("div", {
    className: "ed-tags"
  }, abilities.slice(0, 12).map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "tag accent"
  }, a)))), chars.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ed-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sh"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mask",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, "\u5DF2\u767B\u573A\u7684\u5173\u952E\u4EBA\u7269")), /*#__PURE__*/React.createElement("div", {
    className: "char-grid"
  }, chars.map((c, i) => /*#__PURE__*/React.createElement(CharCard, {
    key: i,
    name: c.name,
    role: c.role,
    game: game
  })))), /*#__PURE__*/React.createElement("div", {
    className: "ed-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-sh"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flag",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, "\u4E3A\u4EC0\u4E48\u4ECE\u8FD9\u91CC\u5F00\u59CB")), /*#__PURE__*/React.createElement("p", {
    className: "ed-reason"
  }, entry.reason)), /*#__PURE__*/React.createElement("div", {
    className: "ed-tip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12
  }), " ", hasDL ? '可下载社区存档一键跳至此进度，或手动游玩至该节点。' : '本作暂无社区存档包，可使用游戏内章节选择直达该节点。')), /*#__PURE__*/React.createElement("div", {
    className: "drawer-cta"
  }, hasDL && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dl",
    size: 16
  }), " \u4E0B\u8F7D\u5B58\u6863"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 1
    },
    onClick: () => {
      onStart(pct);
      onClose();
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 15
  }), " \u4ECE\u8FD9\u91CC\u5F00\u59CB\u9884\u89C8"))));
}

/* ════════════ Boss / 章节详情抽屉 ════════════ */
function BossDrawer({
  game,
  boss,
  onClose
}) {
  const [t, setT] = useState('plot');
  useEffect(() => {
    setT('plot');
  }, [boss && boss.id]);
  if (!boss) return null;
  const GAP = ['', '剧情极少', '剧情少量', '剧情中等', '剧情大量', '全部缺失'];
  const tabs = [['plot', '剧情'], ['chars', '人物'], ['fight', '战斗'], ['save', '存档']];
  const hasDL = !!game.save;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "drawer themed show"
  }, /*#__PURE__*/React.createElement("div", {
    className: "drawer-grip"
  }), /*#__PURE__*/React.createElement("div", {
    className: "drawer-head"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "planet"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 13
  }), boss.planet, " \xB7 ", boss.pct, "%"), /*#__PURE__*/React.createElement("h3", null, boss.name), /*#__PURE__*/React.createElement("div", {
    className: "en serif"
  }, boss.nameEn)), /*#__PURE__*/React.createElement("button", {
    className: "round-btn",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "gap"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--txt-3)',
      letterSpacing: '.04em'
    }
  }, "\u8DF3\u5173\u8865\u8BFE \xB7 ", GAP[boss.gap]), /*#__PURE__*/React.createElement("div", {
    className: "gap-dots"
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: i < boss.gap ? 'on' : ''
  }))), boss.hi && /*#__PURE__*/React.createElement("span", {
    className: "tag hot",
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 11
  }), " \u9AD8\u5149\u6218"))), /*#__PURE__*/React.createElement("div", {
    className: "drawer-seg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, tabs.map(([k, n]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: t === k ? 'on' : '',
    onClick: () => setT(k)
  }, n)))), /*#__PURE__*/React.createElement("div", {
    className: "drawer-body",
    style: {
      maxHeight: 250
    }
  }, t === 'plot' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u5267\u60C5\u80CC\u666F"), /*#__PURE__*/React.createElement("p", null, boss.plot)), t === 'chars' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u767B\u573A\u4EBA\u7269"), /*#__PURE__*/React.createElement("p", null, boss.chars)), t === 'fight' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u6218\u6597\u6280\u5DE7"), /*#__PURE__*/React.createElement("p", null, boss.fight), /*#__PURE__*/React.createElement("div", {
    className: "tip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gem",
    size: 12
  }), " \u8DF3\u5173\u540E\u80FD\u529B\u4EE5\u5B58\u6863\u70B9\u4E3A\u51C6\uFF0C\u90E8\u5206\u6280\u80FD\u53EF\u80FD\u5DF2\u89E3\u9501\u6216\u7F3A\u5931\uFF0C\u8BF7\u53C2\u7167\u6218\u6597\u8BF4\u660E\u8C03\u6574\u7B56\u7565\u3002")), t === 'save' && (hasDL ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u793E\u533A\u5B58\u6863 \xB7 \u4E00\u952E\u8DF3\u5173"), game.save.steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "save-step"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, i + 1), s, i === 1 ? `（文件夹：${boss.nameEn}）` : '')), /*#__PURE__*/React.createElement("div", {
    className: "save-path mono"
  }, game.save.path)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u8DF3\u5173\u5B58\u6863\u5EFA\u8BAE"), /*#__PURE__*/React.createElement("p", null, "\u672C\u573A\u6218\u6597\u4F4D\u4E8E\u6D41\u7A0B ", boss.pct, "%\uFF0C\u9519\u8FC7\u5C06\u8DF3\u8FC7\u7EA6 ", boss.gap, " \u6BB5\u5173\u952E\u5267\u60C5\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "tip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gem",
    size: 12
  }), " ", /*#__PURE__*/React.createElement("b", null, game.short), " \u6682\u65E0\u793E\u533A\u5171\u4EAB\u5B58\u6863\u5305\u3002\u5EFA\u8BAE\u624B\u52A8\u6E38\u73A9\u81F3\u8BE5 Boss \u524D\u7684\u5B58\u6863\u70B9\uFF0C\u6216\u4F7F\u7528\u6E38\u620F\u5185\u7AE0\u8282\u9009\u62E9\u76F4\u8FBE\u3002\u793E\u533A\u65E5\u540E\u53D1\u5E03\u5B58\u6863\u5C06\u7B2C\u4E00\u65F6\u95F4\u66F4\u65B0\u3002")))), /*#__PURE__*/React.createElement("div", {
    className: "drawer-cta"
  }, t === 'save' && hasDL ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dl",
    size: 16
  }), " \u4E0B\u8F7D\u5168 Boss \u5B58\u6863\u5305"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost"
  }, "\u590D\u5236\u8DEF\u5F84")) : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1
    },
    onClick: () => setT('save')
  }, "\u67E5\u770B\u8DF3\u5173\u5B58\u6863\u5EFA\u8BAE"))));
}

/* ════════════ 开屏页 ════════════ */
function SplashScreen({
  onEnter
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "splash"
  }, /*#__PURE__*/React.createElement("div", {
    className: "splash-glow"
  }), /*#__PURE__*/React.createElement("div", {
    className: "splash-core"
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 104
  }), /*#__PURE__*/React.createElement("div", {
    className: "splash-word"
  }, "\u6E38\u4F34 ", /*#__PURE__*/React.createElement("span", null, "YouBan")), /*#__PURE__*/React.createElement("div", {
    className: "splash-tag serif"
  }, "\u50CF\u770B\u8FDB\u5EA6\u6761\u4E00\u6837\uFF0C\u638C\u63E1\u6574\u4E2A\u65C5\u7A0B")), /*#__PURE__*/React.createElement("div", {
    className: "splash-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary splash-btn",
    onClick: onEnter
  }, "\u5F00\u59CB"), /*#__PURE__*/React.createElement("div", {
    className: "splash-by"
  }, "OFF-CIRCLE STUDIO")));
}

/* ════════════ 登录页 ════════════ */
function LoginScreen({
  onLogin
}) {
  const methods = [{
    id: 'wechat',
    n: '微信登录',
    c: '#07c160',
    primary: true
  }, {
    id: 'steam',
    n: 'Steam 登录',
    logo: 'steam',
    c: '#9bc1d6'
  }, {
    id: 'apple',
    n: 'Apple 登录',
    c: '#e8e0d0'
  }, {
    id: 'phone',
    n: '手机号登录',
    c: '#b0a090'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-top"
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 66,
    glyph: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "login-h"
  }, "\u6B22\u8FCE\u6765\u5230\u6E38\u4F34"), /*#__PURE__*/React.createElement("div", {
    className: "login-sub"
  }, "\u8FDE\u63A5\u4F60\u7684\u6E38\u620F\u5E73\u53F0\uFF0C\u5F00\u542F\u8FDB\u5EA6\u966A\u4F34")), /*#__PURE__*/React.createElement("div", {
    className: "login-methods"
  }, methods.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    className: 'login-btn' + (m.primary ? ' wechat' : ''),
    onClick: onLogin
  }, m.logo ? /*#__PURE__*/React.createElement(PlatformLogo, {
    id: "steam",
    color: m.c,
    size: 20
  }) : /*#__PURE__*/React.createElement("span", {
    className: "login-dot",
    style: {
      background: m.c
    }
  }), m.n))), /*#__PURE__*/React.createElement("div", {
    className: "login-terms"
  }, "\u767B\u5F55\u5373\u4EE3\u8868\u540C\u610F\u300A\u7528\u6237\u534F\u8BAE\u300B\u4E0E\u300A\u9690\u79C1\u653F\u7B56\u300B"));
}

/* ════════════ 平台连接 ════════════ */
function PlatformConnect({
  platform,
  onClose,
  onDone
}) {
  const steps = {
    steam: ['打开 Steam 隐私设置，将「游戏详情」设为公开', '复制你的 SteamID64', '粘贴到游伴并授权读取成就'],
    playstation: ['在 PSN 网页端登录账号', '授权游伴读取奖杯进度', '完成 OAuth 回跳'],
    wegame: ['打开 WeGame 客户端 → 账号设置', '扫码授权游伴', '同步游玩时长与进度'],
    epicgames: ['登录 Epic 账号', '授权游伴读取成就', '完成回跳']
  }[platform.id] || ['登录账号', '授权游伴读取进度', '完成回跳'];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    onClick: onClose,
    style: {
      zIndex: 121
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "drawer themed show",
    style: {
      maxHeight: '78%',
      zIndex: 122
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "drawer-grip"
  }), /*#__PURE__*/React.createElement("div", {
    className: "connect-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "connect-ic",
    style: {
      background: 'color-mix(in oklab,' + platform.c + ' 16%,transparent)',
      borderColor: 'color-mix(in oklab,' + platform.c + ' 32%,transparent)'
    }
  }, /*#__PURE__*/React.createElement(PlatformLogo, {
    id: platform.id,
    color: platform.c,
    size: 34
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "\u8FDE\u63A5 ", platform.n), /*#__PURE__*/React.createElement("div", {
    className: "connect-sub"
  }, platform.on ? '已连接 · 可重新授权' : '授权后自动同步进度与成就')), /*#__PURE__*/React.createElement("button", {
    className: "round-btn",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "connect-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "connect-steps"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "save-step"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, i + 1), s))), /*#__PURE__*/React.createElement("div", {
    className: "tip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12
  }), " \u6E38\u4F34\u4EC5\u8BFB\u53D6\u4F60\u7684\u6E38\u620F\u8FDB\u5EA6\u4E0E\u6210\u5C31\uFF0C\u4E0D\u4F1A\u83B7\u53D6\u5BC6\u7801\u6216\u597D\u53CB\u6570\u636E\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "drawer-cta"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 1
    },
    onClick: onDone
  }, platform.id === 'wechat' ? '微信授权' : platform.on ? '重新授权' : '授权登录'))));
}
Object.assign(window, {
  LibraryScreen,
  ProgressScreen,
  JourneyScreen,
  SentimentScreen,
  MeScreen,
  BossDrawer,
  EntryDetail,
  ProgressInput,
  Overview,
  SplashScreen,
  LoginScreen,
  PlatformConnect
});