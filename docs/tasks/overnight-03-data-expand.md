# 任务 03 · 数据校验丰富 + 新增《战锤40K：星际战士2》（Claude Code 执行）

> 给 Claude Code 的任务规格。先读项目根 `CLAUDE.md`。需联网调研，本机执行并自我验证。**数据准确性是第一要务：宁可标注"待核"，绝不编造剧情/数值。**

## 目标

1. **verify + validate** 现有 5 款游戏数据：联网核对关键事实、修正错误、补充能丰富的字段。
2. **新增**《Warhammer 40,000: Space Marine 2》（Steam appid **2183900**）一份完整数据，过 schema 校验与测试。

## 硬约束

- 分支：从 `electron` 切 `feature/data-expand`，在该分支干。**不 push、不动 `tauri`。**
- 只改 `src/data/games/*.json`（+ 新增封面 + 跑脚本）；**不改 UI/组件**。
- 数据准确性：每处修改/新数据都要**附来源链接**（HowLongToBeat 看时长、Steam 商店/成就、Fandom/官方 wiki 看章节与剧情）。拿不准的剧情细节**标注"待核"**，不编。
- 完成判据：`npm run validate:games` 全过、`npm test` 全绿（render 测试会自动覆盖新游戏）。

## 子任务

### A. 校验并丰富现有 5 款（jedi_fo / black_myth_wukong / max_payne_3 / last_of_us_1 / last_of_us_2）
逐款联网核对并按需修正：
- `totalHoursMain`（以 HowLongToBeat 主线为准）；`steamScore`（Steam 好评率量级合理）。
- `chapters[]`：章节顺序/名称/`progressStart`/`progressEnd` 合理、从 0 连续覆盖到 100、不重叠；`plotDetail`/`playerGoals`/`newCharacters`/`keyEvent` 准确且不剧透过头。
- `bossSaves[]`：Boss 名称、`progressPct` 位置、`context.{plot,characters,gameplay}` 准确。
- `hypePeaks[]` / `protagonistJourney[]` / `playerSentiment`（引用与关键词贴近真实评价）。
- 发现错误就改；能补充让数据更厚的（缺的字段、更准的描述）就补。**每处改动在 RESULT 里列"字段 → 改前/改后 → 来源"。**

### B. 新增 Space Marine 2（`id: space_marine_2`）
按现有 JSON 完整 schema 造一份（参照任一现有游戏文件的字段结构），字段齐全：
- 顶层：`id,name,developer(Saber Interactive),year(2024),steamAppId:"2183900",genre,totalHoursMain,totalHoursComplete` + 展示元字段 `titleMain,titleSub,short,currentPct(给 0),hoursMain` 同现有约定。
- `posterUrl`/`bannerUrl`：先用 Steam CDN（`https://cdn.akamai.steamstatic.com/steam/apps/2183900/library_600x900.jpg` 和 `library_hero.jpg`），随后由封面本地化脚本下到本地。
- `overview{tagline,description,highlights[]}`、`gameTheme{bg,bgCard,accent,accent2,text}`（暖金/帝国主题，自定）。
- `chapters[]`（按战役实际章节，progressStart/End 0→100 连续）、`bossSaves[]`（含 context 四维）、`hypePeaks[]`、`entryPoints[]`、`protagonistJourney[]`、`playerSentiment{steamScore,source,note,keywords{praise,criticism,hot},testimonials[]}`、`achievements[]`。
- 全部基于联网调研，**附来源**；剧情细节不确定的标"待核"。

### C. 封面本地化 + 构建
- `cd src && node scripts/localize-covers.js`（把含新游戏的封面下到 `renderer/assets/covers/` 并改 JSON 为本地路径）。
- `npm run build:ui`（刷新 `dist/` 与 `mock-data.js`）。

### D. 验证
```
cd src
npm run validate:games   # 期望 6/6
npm test                 # 全绿（含新游戏的 render/adapt 覆盖）
npm run lint             # 无 error
npm start                # 人工可选：库里出现第 6 款、能进入
```

## 交付
- commit 到 `feature/data-expand`（建议：现有校验一笔、新增游戏一笔）。**不 push、不动 tauri。**
- `docs/tasks/RESULT-03.md`：现有 5 款每处改动+来源；Space Marine 2 数据来源清单与"待核"项；validate/test 结果。

## 卡住怎么办
- 某字段查不到可靠来源：保留现状 / 给保守值，并在 RESULT 标"待核"，继续别空转。
- 不确定 progressPct 精确位置：按章节均匀估算，注明是估算。
