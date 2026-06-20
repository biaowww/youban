/* ============================================================
   游伴 YouBan · PC 桌面端（Tauri 窗口）
   复用移动端组件：HypeProgress / ScoreRing / ProgressInput / Overview / CharCard
   右侧采用「主从」布局：默认舆情/历程，点击节点切到详情
   ============================================================ */
const { useState: useStateD, useRef: useRefD, useEffect: useEffectD } = React;

/* 自适应缩放：固定设计尺寸按容器宽度等比缩放 */
function ScaledFrame({ designW, designH, children }) {
  const ref = useRefD(null);
  const [scale, setScale] = useStateD(1);
  useEffectD(() => {
    const el = ref.current; if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / designW));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [designW]);
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <div style={{ width: designW * scale, height: designH * scale, margin: '0 auto' }}>
        <div style={{ width: designW, height: designH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  );
}

function WinBtn({ kind }) {
  const ic = { min: 'M5 12h14', max: 'M6 6h12v12H6z', close: 'M6 6l12 12M18 6L6 18' }[kind];
  return <button className={'desk-winbtn ' + kind}><svg width="14" height="14" viewBox="0 0 24 24"><path d={ic} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>;
}

/* 右侧详情：Boss */
function DeskBossDetail({ game, boss, onBack, onStart }) {
  const GAP = ['', '剧情极少', '剧情少量', '剧情中等', '剧情大量', '全部缺失'];
  return (
    <div>
      <button className="desk-detail-back" onClick={onBack}><Icon name="back" size={15} />返回</button>
      <div className="desk-detail-head">
        <span className="planet"><Icon name="pin" size={12} />{boss.planet} · {boss.pct}%</span>
        <h3>{boss.name}</h3>
        <div className="en">{boss.nameEn}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 11 }}>
          <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>跳关补课 · {GAP[boss.gap]}</span>
          <div className="gap-dots">{Array.from({ length: 5 }).map((_, i) => <i key={i} className={i < boss.gap ? 'on' : ''} />)}</div>
          {boss.hi && <span className="tag hot" style={{ marginLeft: 'auto' }}><Icon name="star" size={11} /> 高光战</span>}
        </div>
      </div>
      <div className="desk-dsec"><h4>剧情背景</h4><p>{boss.plot}</p></div>
      <div className="desk-dsec"><h4>登场人物</h4><p>{boss.chars}</p></div>
      <div className="desk-dsec"><h4>战斗技巧</h4><p>{boss.fight}</p></div>
      <div className="desk-dsec" style={{ display: 'flex', gap: 10 }}>
        {game.save && <button className="btn btn-ghost" style={{ flex: 1 }}><Icon name="dl" size={15} /> 下载存档</button>}
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onStart(boss.pct)}><Icon name="play" size={14} /> 从这里开始</button>
      </div>
    </div>
  );
}

/* 右侧详情：入场点 */
function DeskEntryDetail({ game, entry, onBack, onStart }) {
  const pct = entry.pct;
  const skipped = game.chapters.filter(c => c.end <= pct);
  const entering = game.chapters.find(c => pct >= c.start && pct < c.end) || game.chapters[0];
  const abilities = [];
  game.journey.filter(j => j.pct <= pct).forEach(j => (j.unlocks || []).forEach(u => { if (!abilities.includes(u)) abilities.push(u); }));
  const seen = [];
  game.chapters.filter(c => c.start < pct).forEach(c => (c.chars || '').split(/[、\n]/).forEach(s => {
    const t = s.trim(); if (!t) return;
    const m = t.match(/^([^（(：:]+)[（(：:]?\s*([^）)]*)/);
    const name = (m ? m[1] : t).trim(); const role = (m && m[2] ? m[2] : '').replace(/[）)]+$/, '').trim();
    if (name && name.length <= 12 && !seen.some(o => o.name === name)) seen.push({ name, role });
  }));
  return (
    <div>
      <button className="desk-detail-back" onClick={onBack}><Icon name="back" size={15} />返回</button>
      <div className="desk-detail-head">
        <span className="planet"><Icon name="star" size={12} />推荐起点 · 从 {pct}% 开始</span>
        <h3>{entry.label}</h3>
        <div className="en" style={{ fontStyle: 'normal', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{remainHours(game, pct)} 小时通关 · 进入《{entering.name}》</div>
      </div>
      <div className="desk-dsec"><h4>开始前你需要知道</h4>
        {skipped.length === 0 ? <p>这是完整体验起点，无需补课。</p>
          : <div className="ed-recap">{skipped.map((c, i) => (
              <div key={i} className="ed-recap-row"><span className="rc-pct mono">{c.end}%</span>
                <div><div className="rc-name">{c.name}</div><div className="rc-key">{c.key}</div></div></div>))}</div>}
      </div>
      {entering.plot && <div className="desk-dsec"><h4>你将从这里进入</h4><p>{entering.plot}</p></div>}
      {abilities.length > 0 && <div className="desk-dsec"><h4>此时你已拥有</h4>
        <div className="ed-tags">{abilities.slice(0, 12).map((a, i) => <span key={i} className="tag accent">{a}</span>)}</div></div>}
      {seen.length > 0 && <div className="desk-dsec"><h4>已登场的关键人物</h4>
        <div className="char-grid">{seen.slice(0, 8).map((c, i) => <CharCard key={i} name={c.name} role={c.role} game={game} />)}</div></div>}
      <div className="desk-dsec"><h4>为什么从这里开始</h4><p>{entry.reason}</p></div>
      <div className="desk-dsec" style={{ display: 'flex', gap: 10 }}>
        {game.save && <button className="btn btn-ghost" style={{ flex: 1 }}><Icon name="dl" size={15} /> 下载存档</button>}
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onStart(pct)}><Icon name="play" size={14} /> 从这里开始</button>
      </div>
    </div>
  );
}

/* 右侧：舆情 */
function DeskSentiment({ game }) {
  const s = game.sentiment, tier = tierOf(s.score);
  const groups = [{ t: '好评', cls: 'praise', data: s.praise }, { t: '热议', cls: 'hot', data: s.hot }, { t: '差评', cls: 'crit', data: s.criticism }];
  return (
    <div style={{ padding: '4px 16px 24px' }}>
      <div className="score-hero" style={{ padding: '16px 14px', marginBottom: 16 }}>
        <ScoreRing score={s.score} />
        <div className="score-meta"><div className="lvl" style={{ color: tier.c }}>{tier.t}</div>
          <div className="src mono">{s.source}</div><div className="note">{s.note}</div></div>
      </div>
      {s.quotes.map((q, i) => (
        <div key={i} className="quote"><div className="qmark">”</div><p>{q.text}</p>
          <div className="ft"><span className="au">{q.author}</span><span className="up"><Icon name="thumb" size={13} />{q.up >= 1000 ? (q.up / 1000).toFixed(1) + 'k' : q.up}</span></div></div>
      ))}
      {groups.map(g => (
        <div key={g.cls} className="kw-group"><div className="gh"><span className={'gh-ic ' + g.cls}>
          <Icon name={g.cls === 'hot' ? 'flame' : 'thumb'} size={12} style={g.cls === 'crit' ? { transform: 'rotate(180deg)' } : null} /></span>
          <span className="gh-t">{g.t}</span><span className="gh-n mono">{g.data.length}</span></div>
          <div className="kw-wrap">{g.data.map((k, i) => <span key={i} className="kw-chip">{k}</span>)}</div></div>
      ))}
    </div>
  );
}

/* 右侧：历程 */
function DeskJourney({ game, value, setValue }) {
  return (
    <div className="journey" style={{ padding: '8px 16px 24px' }}>
      {game.journey.map((s, i) => {
        const done = value > s.pct, cur = Math.abs(value - s.pct) <= 8;
        return (
          <div key={i} className={'jstep' + (done ? ' done' : '') + (cur ? ' cur' : '')} onClick={() => setValue(s.pct)}>
            <div className="jrail"><div className="jdot" />{i < game.journey.length - 1 && <div className="jline" />}</div>
            <div className="jcontent"><div className="jpct mono">{s.pct}%</div><div className="jevent">{s.event}</div>
              <div className="jdesc">{s.desc}</div>
              <div className="junlocks">{s.unlocks.map((u, k) => <span key={k} className="tag accent">{u}</span>)}</div></div>
          </div>
        );
      })}
    </div>
  );
}

function DesktopApp({ games, gi, enter, value, setValue, theme, setTheme, onProfile }) {
  const game = games[gi];
  const [aside, setAside] = useStateD('senti');
  const [detail, setDetail] = useStateD(null);
  useEffectD(() => { setDetail(null); }, [gi]);
  const th = game.theme;
  const vars = { '--g-bg': th.bg, '--g-card': th.card, '--g-accent': th.accent, '--g-accent2': th.accent2, '--g-text': th.text };
  const cls = 'yb-app yb-desk' + (theme === 'light' ? ' light' : '');
  const curChap = game.chapters.find(c => value >= c.start && value < c.end) || game.chapters[game.chapters.length - 1];

  return (
    <div className="desk-window" style={vars}>
      <div className={cls} style={vars}>
        {/* 标题栏 */}
        <div className="desk-titlebar">
          <div className="desk-brand"><Logo size={22} glyph /><b>游伴 YouBan</b><span className="div" /><span className="gname">{game.titleMain}</span></div>
          <div className="desk-tb-spacer" />
          <ThemeToggle theme={theme} setTheme={setTheme} game={game} />
          <div className="desk-winbtns"><WinBtn kind="min" /><WinBtn kind="max" /><WinBtn kind="close" /></div>
        </div>

        <div className="desk-grid">
          {/* 左：游戏库 + 我的 */}
          <div className="desk-col">
            <div className="desk-side-h">游戏库 · {games.length}</div>
            <div className="desk-scroll">
              {games.map((g, i) => (
                <div key={g.id} className={'desk-game' + (i === gi ? ' on' : '')} onClick={() => enter(i, true)}>
                  <img src={g.poster} alt="" onError={e => e.target.style.opacity = .25} />
                  <div className="gi"><div className="nm">{g.short}</div>
                    <div className="pb"><i style={{ width: Math.max(3, g.currentPct) + '%' }} /></div>
                    <div className="pc">{g.currentPct}% · {g.hoursMain}h</div></div>
                </div>
              ))}
            </div>
            <div className="desk-profile" onClick={onProfile}>
              <div className="av"><img src="assets/avatar-default.svg" alt="" /></div>
              <div className="pm"><div className="n">天命玩家</div><div className="s">{games.length} 款 · 已同步</div></div>
              <Icon name="set" size={16} style={{ color: 'var(--txt-3)' }} />
            </div>
          </div>

          {/* 中：进度主区 */}
          <div className="desk-col mid">
            <div className="desk-scroll">
              <div className="desk-hero">
                <img className="bg" src={game.banner} alt="" onError={e => e.target.style.display = 'none'} />
                <div className="sc" />
                <div className="meta"><div className="gname">{game.titleMain}</div><div className="gsub">{game.titleSub} · {game.developer} · {game.year}</div></div>
                <div className="pct"><b className="mono">{value}<i>%</i></b><span>已完成</span></div>
              </div>
              <div className="desk-main-body">
                <ProgressInput game={game} value={value} setValue={setValue} />
                <div className="desk-stat-row">
                  <div className="stat"><div className="k">已玩约</div><div className="v">{(game.hoursMain * value / 100).toFixed(1)}<small>h</small></div></div>
                  <div className="stat"><div className="k">剩余约</div><div className="v accent">{((100 - value) / 100 * game.hoursMain).toFixed(1)}<small>h</small></div></div>
                  <div className="stat"><div className="k">主线共</div><div className="v">~{game.hoursMain}<small>h</small></div></div>
                </div>
                <div className="desk-prog-h"><div className="lbl">流程进度 · 拖动预览</div><div className="now mono">{curChap.name.split('·').pop().trim()}</div></div>
                <HypeProgress game={game} value={value} onChange={setValue}
                  onBoss={(b) => { setDetail({ kind: 'boss', data: b }); }}
                  onEntry={(e) => { setDetail({ kind: 'entry', data: e }); }} idBase={'desk-' + game.id} />

                <div className="sec-h" style={{ marginTop: 26 }}><div className="t">全流程章节</div><div className="ln" /><div className="n mono">{game.chapters.length} 章</div></div>
                {game.chapters.map((c, i) => {
                  const done = value >= c.end, cur = value >= c.start && value < c.end;
                  return (
                    <div key={i} className={'chap' + (done ? ' done' : '') + (cur ? ' cur' : '')}>
                      <div className="chap-row" onClick={() => setValue(Math.round((c.start + c.end) / 2))}>
                        <div className="dot" />
                        <div className="info"><div className="nm">{c.name}</div><div className="mt"><Icon name="pin" size={11} />{c.planet}</div></div>
                        <div className="rng mono">{c.start}–{c.end}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右：舆情/历程/详情 */}
          <div className="desk-col">
            {detail ? (
              <div className="desk-scroll">
                {detail.kind === 'boss'
                  ? <DeskBossDetail game={game} boss={detail.data} onBack={() => setDetail(null)} onStart={(p) => { setValue(p); setDetail(null); }} />
                  : <DeskEntryDetail game={game} entry={detail.data} onBack={() => setDetail(null)} onStart={(p) => { setValue(p); setDetail(null); }} />}
              </div>
            ) : (
              <>
                <div className="desk-aside-tabs">
                  <button className={'desk-atab' + (aside === 'senti' ? ' on' : '')} onClick={() => setAside('senti')}>玩家舆情</button>
                  <button className={'desk-atab' + (aside === 'journey' ? ' on' : '')} onClick={() => setAside('journey')}>成长历程</button>
                </div>
                <div className="desk-scroll">
                  {aside === 'senti' ? <DeskSentiment game={game} /> : <DeskJourney game={game} value={value} setValue={setValue} />}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DesktopApp, ScaledFrame });
