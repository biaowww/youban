# RESULT-03 · 数据校验丰富 + 新增《战锤40K：星际战士2》

> 分支 `feature/data-expand`（从 `electron` 切出）。**未 push、未动 `tauri`。** 只改 `src/data/games/*.json`、新增封面、跑脚本；为满足完成判据另修正了两处测试计数与一处脚本 lint（见末尾「附带必要改动」）。数据准确性第一：不确定处标「待核」，未编造。

## 一句话结论

**联网核实 6 款数据；修正黑神话悟空的重大结构性错误（编造的流沙河/灵山章节、六耳猕猴 Boss、沙僧角色）+ 两处 Steam 评分硬错（TLOU1/2）+ 若干小错；新增 Space Marine 2 完整一份。完成判据全绿：`validate:games` 6/6、`npm test` 116 passed、`npm run lint` 0 error。**

## 完成判据复跑

| 命令 | 结果 |
|---|---|
| `node scripts/localize-covers.js` | 下载 SM2 封面 2 张，改写为本地路径 |
| `npm run build:ui` | OK，`mock-data.js ← 6 款游戏` |
| `npm run validate:games` | **6/6 全过** |
| `npm test` | **116 passed**（4 文件，0 失败） |
| `npm run lint` | **0 error** |

---

## A. 现有 5 款 · 逐处改动（字段 → 改前 / 改后 → 来源）

### black_myth_wukong.json（重大修正：原数据结构性编造）
联网核实后确认原数据**编造/错置**了大量章节与 Boss。已重写 `chapters` / `bossSaves` / `hypePeaks` / `protagonistJourney` / `entryPoints`，并修订 `overview.tagline`、`playerSentiment`。

| 字段 | 改前 | 改后 | 来源 |
|---|---|---|---|
| chapters（第三回） | 「小雷音寺（盘丝岭）」把小西天与盘丝岭**混为一回** | 第三回 = **小西天**（浮屠界/雪山，黄眉）；盘丝岭独立为第四回 | Wikipedia/PCGamesN/Fandom |
| chapters（第四回） | **「流沙河·沙漠腹地」（编造）** | **盘丝岭**（盘丝洞/黄花观，紫蛛、百眼魔君） | 同上 |
| chapters（第五回） | 火焰山（牛魔王） | 火焰山（红孩儿→夜叉王、牛魔王）— 大体正确，细化 | game8/gamersky |
| chapters（第六回） | **「灵山·天庭」（编造）+ 终boss 六耳猕猴（编造）** | **花果山**，终boss **大圣残躯**；真结局隐藏 boss **二郎显圣真君（梅山）** | gamerant/keengamer 结局解析；Fandom |
| bossSaves | 含 `spider_sisters`(置于第三回)、`six_eared_macaque`(编造终boss) | 重排为：广智/黑熊精(Ch1)、虎先锋/黄风大圣(Ch2)、黄眉(Ch3 小西天)、紫蛛娘娘/百眼魔君(Ch4 盘丝岭)、红孩儿/牛魔王(Ch5)、**大圣残躯**(Ch6 终战) | Fandom/game8/PCGamesN |
| 角色「沙僧」 | 第四回出现**沙僧（编造，游戏中不存在）** | 删除；改为蜘蛛精/紫蛛/百眼魔君/猪八戒（八戒自盘丝岭同行） | thegamer「beating」一文确认沙僧不在本作 |
| overview.tagline | 「天命人，踏上取经路」（本作非取经） | 「天命人，循着大圣的足迹前行」 | 剧情设定（post-Journey） |
| playerSentiment.steamScore | 94 | **96**（全语言「好评如潮」≈96–97%） | steambase / Steam 商店页 |
| hot 关键词 | 含「六耳猕猴隐喻」 | 改「大圣残躯结局」（六耳为结局动画意象，非 Boss） | Fandom Macaque Chief / Six-Eared Macaque |

> 说明：`achievements[]` **刻意保持原样未改**——任务 02 的 Steam 同步 fixtures/测试由该数组生成并硬编码断言（`wukong=40, matched=ACH_SPIDER`）。这些 steamId/标签是**合成的进度占位**（非真实 Steam apiname），冻结以避免破坏既有测试。真实成就 apiname 待后续接真 BFF 时再对齐（待核）。

### last_of_us_1.json
| 字段 | 改前 | 改后 | 来源 |
|---|---|---|---|
| playerSentiment.steamScore | 71（明显偏低，停留在 2023 首发翻车期） | **83**（现「特别好评」；近 30 天更高） | Steam 商店页 app/1888930 |
| note | 「…稳定在褒贬不一」 | 「…多轮优化后回升至『特别好评』」 | 同上 |

### last_of_us_2.json
| 字段 | 改前 | 改后 | 来源 |
|---|---|---|---|
| playerSentiment.steamScore | 78（偏低） | **91**（PC 版 2025 发售时风波已沉淀，「特别好评」） | Steam 商店页 app/2531310 |
| note | 「随剧透风波沉淀后褒贬趋于平衡」 | 「主机版首发两极…PC 版风波已沉淀，稳居『特别好评』」 | 同上 |

### jedi_fo.json
| 字段 | 改前 | 改后 | 来源 |
|---|---|---|---|
| playerSentiment.steamScore | 87 | **88**（量级一致，微调对齐） | Steam 商店页 app/1172380 |

### max_payne_3.json
| 字段 | 改前 | 改后 | 来源 |
|---|---|---|---|
| playerSentiment.steamScore | 85 | **84** | Steam 商店页 app/204100 |
| bossSaves[stadium].context.plot | 「**UFC**（联邦特种部队…）」（错别字，与全文 UFE 矛盾） | 「**UFE**（联邦特种部队…）」 | 文内一致性（UFE = Unidade de Forças Especiais） |

### 未改但已核对 OK
- `totalHoursMain`：Jedi 17h、黑神话 25h、MP3 10h、TLOU1 15h、TLOU2 25h（HLTB 主线≈24–25h，量级一致，保留）。来源：HowLongToBeat（经 GamesRadar/GameRant/Game8 汇总，HLTB 直连在本环境受限）。
- Jedi / TLOU1 / TLOU2 / MP3 的章节顺序、地名、Boss 名经抽查与维基一致，未发现编造。

---

## B. 新增 space_marine_2.json（id: `space_marine_2`）

完整 schema 字段齐全，过 validate/test。要点与来源：

| 项 | 取值 | 来源 |
|---|---|---|
| developer / year / appid | Saber Interactive / 2024 / 2183900 | Wikipedia；Steam app/2183900 |
| 主角 | 提图斯中尉（Demetrian Titus，极限战士），重伤后经卢比孔改造为 primaris | Wikipedia；Warhammer Community「Who is Titus」 |
| 三星球 | Kadaku（丛林·泰伦）→ Avarax（工业·泰伦+混沌）→ Demerium（墓星·混沌终局） | Game8 任务表；Fandom Campaign |
| 敌人 | 泰伦虫族（利维坦支系）→ 千子军团 / **提兹奇（Tzeentch）** | Wikipedia；ScreenRant 结局解析 |
| 反派 | 千子术士 **伊穆拉（Imurah）**，终战召唤**变天魔（Lord of Change）** | Fandom Imurah；Gamerant 终boss指南 |
| 章节(6→7) | 序章 Kadaku → 丛林浩劫(卢比孔/击落母舰) → 轨道平台 Avarax → 机魂之仆(混沌现身) → 虚空之歌(地狱兽) → 黎明降临 Demerium → 永无止境的责任(终战) | Game8 mission list；TrueAchievements walkthrough |
| Boss | 泰伦母舰歼灭战、地狱兽(Helbrute)、伊穆拉(初遇/终战) | Gamerant/WindowsCentral boss 清单；Fandom |
| steamScore | 86（「特别好评」；战役偏短/EOS 隐私争议为主要槽点） | Steam 商店页；TheGamer/Gamerant 评测风波报道 |
| totalHoursMain / Complete | 9h / 18h | HLTB 汇总（8–10h 战役） |

### Space Marine 2「待核」项
1. **HLTB 精确时长**：本环境 HLTB 直连受限，主线 9h、完整 18h 为聚合来源估算（战役普遍 8–10h）。
2. **逐 mission 精确剧情（03–05）**：大弧线（Kadaku 泰伦→Avarax 泰伦+混沌→Demerium 混沌终局）确证；个别 mission 内细节据 walkthrough 概括，建议接稿前再核 PowerPyx 全流程。
3. **`achievements[]`**：本作为**合成占位**（ACH_SM2_*，按战役进度映射），**非真实 Steam apiname**——SM2 无 Steam 同步 fixtures，故仅用于进度演示；真实 apiname/解锁率待从 SteamDB/Steam 全局统计拉取。
4. **混沌神祇**：确认是**提兹奇/千子军团**（非 Nurgle）。
5. **新角色译名**：卡里隆/加德里尔/勒兹/卡尔加等为音译，个别 primaris 战友细节待核。
6. **舆情 testimonials**：均标注「（转述）」，为综合 Steam/Reddit 评价语气的**非逐字**转述，非引用真实个人评测。

---

## 附带必要改动（非 data，但完成判据所必需）

> 这些不是 UI/组件改动，仅为让「`npm test` / `npm run lint` 全绿」与新增第 6 款数据保持同步：

1. `src/test/adapt.test.js`、`src/test/render.test.js`：加载游戏数量断言 **5 → 6**（数据从 5 款变 6 款的必然同步；render/adapt 已自动覆盖新游戏 Space Marine 2）。
2. `src/scripts/localize-covers.js:47`：稀疏数组 `[, 'jpg']` → `['', 'jpg']`（修 ESLint `no-sparse-arrays` error，行为不变）。该文件在上一任务并入后首次被 `eslint .` 纳入，故此次才暴露。
3. `src/renderer/mock-data.js`：`build:ui` 产物自动刷新为 6 款（非手改）。

## 验证产物
- 封面：`src/renderer/assets/covers/space_marine_2-poster.jpg`(94KB)、`-banner.jpg`(474KB)。
- `npm start`（Electron GUI）属人工可选项，隔夜未拉起；数据加载/适配/渲染链路已由 116 个测试覆盖（含第 6 款的 adapt + 每界面 render）。

## 主要来源链接
- Black Myth: Wikipedia(en/zh)、PCGamesN chapters/bosses、blackmythwukong.fandom.com、game8.co、gamerant/keengamer（结局）、thegamer（沙僧缺席）、gamersky/zhihu（章节图鉴）。
- 时长/评分：store.steampowered.com（各 appid）、steambase.io、HowLongToBeat（经 GamesRadar/GameRant/Game8 汇总）。
- Space Marine 2: en.wikipedia.org、warhammer-community.com、spacemarine2.fandom.com、game8.co、trueachievements.com、screenrant.com、gamerant.com、powerpyx.com。
