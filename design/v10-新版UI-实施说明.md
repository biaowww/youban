# v10 新版 UI 实施说明(开发会话必读)

> **给谁看**:在本仓库做 v10 UI 落地的 Claude Code 开发会话。
> **这是什么**:2026-07-11 王彪确认的新版 UI 设计定稿 + 实施边界。**动手前先完整读完本文,尤其是「铁律」。**

---

## 0. 铁律(违反 = 返工)

1. **禁止在 `electron` / `master` 分支直接提交。** 从 `electron` 切新分支(建议 `feature/v10-ui`)开发,验证 OK 后再由王彪决定合并。**绝对不碰 `tauri` 分支。**
2. **v9 现有 UI 是基准,不许就地重写。** 新 UI 以**新增文件/组件**方式实现(如 `src/renderer/v10/` 或新组件名),通过开关/入口切换。在王彪明确拍板"替换"之前,v9 的 `screens.jsx`、`desktop.jsx`、`components.jsx` 现有导出**只加不改不删**。
3. **数据 schema 一个字段都不要改。** `src/data/games/*.json` 与 `app.jsx` 的 `adaptGame()` 保持原样——本次设计所需字段**全部已存在**(见 §3 映射表)。若发现字段不够,先停下来问,不要自行加字段。
4. **舆情 Tab 不在本次范围**,沿用 v9 的 `SentimentScreen`,不要动。
5. **二级详情卡全部维持 v9 原版**(王彪 2026-07-11 明确):🎁 入场点推荐详情(`EntryDetail`)、Boss 详情抽屉(`BossDrawer`,含剧情/人物/战斗/存档四 Tab)**不重做**。v10 新界面里的 🎁 节点、⚔ 存档行、章节卡,点击后**打开这些现有抽屉**——只接线,不改抽屉本身。
6. **Electron 外壳(`main.js`/`preload.js`)与构建脚本(`build-ui.js`)不动。** 改完 `*.jsx` 记得 `npm run build:ui`。
7. `design/` 目录全部是**只读参考**,不要"顺手优化"里面的原型文件。

## 1. 设计定稿在哪

| 文件 | 内容 |
|---|---|
| `design/游伴 v10 新版UI完整稿.html` | **最终定稿原型**(双击可开)。进度/历程双 Tab 全交互:模拟滑杆、防剧透、双主题。实现以它为准 |
| `design/screenshots/v10-final-progress.png` / `v10-final-journey.png` | 定稿截图 |
| `design/游伴 v10C 旅程陪伴.html` / `v10B 主机仪表盘.html` | 过程稿(只读,溯源用) |
| `design/references/` + README | Mobbin 参考截图(A=影视化 B=Xbox C=旅程) |

## 2. 定稿决策记录(王彪 2026-07-11 确认)

- **Hero 全出血**(v10-C):整幅 banner + 底部雾化融入页面底色 + 陪伴问候条 + 4 项统计(完成度/已陪跑/剩余/Boss 已过)。
- **进度 Tab**:
  - **Hype Wave 剧情张力曲线**(v10-B 呈现):已走过=亮蓝发光,前方=灰;峰值双级(实心橙=名场面 hi,空心=普通);⚔=Boss 存档点;章节底带;防剧透开启时**前方峰值只留点不留名**;点击曲线跳进度。
  - **渐变坐标轴**(B2 瘦身,高度约 16px)紧贴波形下方,与波形同一 x 轴:紫→蓝渐变填充至当前进度、章节刻度线、**◆ 推荐起点标注(entryPoints)**、金点=你在这里。
  - **邻近里程碑标注**:当前位置"刚走过 1 个 + 即将抵达 ≤2 个"(事件源=bossSaves + hi 峰值 + protagonistJourney 合并时间线);防剧透时未到事件**显示类型+进度%但名字模糊**。嫌挤可收敛为前后各 1。
  - **章节墙**(v10-C 大卡):缩略图 + 状态徽章(✓已走过/⟡你在这里/🔒未抵达)+ 章内进度条 + **⚔ Boss 存档行集成在章节卡内**(不做独立 Boss 列表!未到的存档:名字模糊 + 按钮禁用)。
- **历程 Tab = 蜿蜒旅程图**(v10-C,替换 v9 的 jstep 直线时间轴):S 形路径,金色实线=走过/虚线=前方;节点卡吃进 **v10-B 里程碑元素**(icon 瓦片、已解锁/进行中/锁定状态标、解锁能力 tags、"→ 下一站"渐变小进度条),**各段就近 ⚔ 存档挂卡内**;🎁 推荐起点为路径上的菱形节点;"你在这里"头像钉在路径上。
- **全局**:防剧透 toggle(顶栏)、**模拟进度滑杆改为真实进度控制**(对应 v9 的 value/setValue,全视图联动)、浅色暖调默认 + 游戏主题色切换(沿用 v9 的 theme 机制)。

## 3. 原型 ↔ 真实数据字段映射(全部已存在,勿改 schema)

| 原型内联常量 | JSON 字段(src/data/games/*.json) | 说明 |
|---|---|---|
| `CHAPTERS[{n,p,s,e,hype,key}]` | `chapters[{name,planet,progressStart,progressEnd,hypeScore,keyEvent}]` | 章节墙/波形底带/轴刻度 |
| `PEAKS[{pct,label,score,hi}]` | `hypePeaks[{progressPct,label,score,color}]` | `hi` 原型里=score≥8 的名场面;实现可用 `score>=8` 或沿用 `color` 分级 |
| `BOSSES[{pct,n,hi,p}]` | `bossSaves[{progressPct,name,highlight,planet,folder,...}]` | 卡内存档行;`folder` 是真实存档目录 |
| `JOURNEY[{pct,ev,desc,un,ico}]` | `protagonistJourney[{progressPct,event,description,unlocks[]}]` | 旅程图里程碑;`ico` 为原型装饰,实现可按序号/关键词映射 |
| `ENTRIES[{pct,label,why}]` | `entryPoints[{progressPct,label,reason}]` | 🎁 推荐起点(轴 + 路径) |
| `HOURS_MAIN` | `totalHoursMain` / `totalHoursComplete` | 时长统计 |
| `current`(滑杆) | v9 `value` 状态(`currentPct` 初始) | **实现时接现有进度状态,滑杆只是演示件,正式版=进度输入(手动/Steam/截图)驱动** |

多游戏注意:原型只做了 jedi_fo;实现必须走 `adaptGame()` 后的视图模型,对 9 款游戏通用,某游戏缺 `bossSaves`/`hypePeaks` 时对应模块优雅降级(隐藏该行/该点,不报错)。

## 4. 建议实施顺序(每步可独立验收)

1. 切分支 `feature/v10-ui`;新建 `src/renderer/v10/`(或等价隔离方式),接入构建。
2. **历程 Tab 旅程图**(最独立):新组件替换 JourneyScreen 的呈现,数据同源 `protagonistJourney + entryPoints + bossSaves`。
3. **进度 Tab Hype Wave + 坐标轴 + 邻近里程碑**(改造最大,注意保留现有进度输入组件 ProgressInput 的功能入口)。
4. **章节墙 + 存档集成**(替代章节手风琴的呈现;BossDrawer 逻辑可复用为卡内行为)。
5. **Hero 全出血 + 双主题适配**(浅色/游戏主题两套都要过)。
6. 防剧透全局态 + 各模块模糊规则统一。

## 5. 验收清单

- [ ] `npm start` 正常;v9 界面仍可用(切换开关或保留入口)
- [ ] 拖动进度:Hero 统计 / 波形亮区+你在这里 / 轴填充 / 邻近标注 / 章节墙状态 / 旅程图金线+头像 **全联动**
- [ ] 防剧透开:未到的峰值名/里程碑描述/章节图文/存档名全模糊,"偷看一眼"可单卡揭开;关:全显
- [ ] 推荐起点 ◆/🎁 在轴与旅程图都可见、可点
- [ ] 浅色 + 游戏主题色两套下所有模块可读(对照原型双主题)
- [ ] 9 款游戏全部能进,缺数据字段的游戏不崩、模块降级
- [ ] 改动只发生在新分支;`git diff electron` 不含 v9 文件的破坏性修改
