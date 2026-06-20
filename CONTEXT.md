# 游伴 YouBan — Project Context

> 给新 session 读的：这个文件描述项目现状，请直接上手，不需要重新发现。

## App 简介
**游伴 YouBan** — 游戏流程陪伴工具，让玩家快速体验超长 3A 游戏。
- 工作区：`E:\claude_project\游戏进度陪伴器 Game Companion\`
- 当前技术栈：**Electron** + Node.js，BrowserWindow 420×780 portrait
- Git 主分支：`electron`

## 游戏库（5 款）
| 文件 | 游戏 | Steam App ID |
|------|------|-------------|
| jedi_fo.json | Star Wars Jedi: Fallen Order | 1172380 |
| black_myth_wukong.json | 黑神话：悟空 | 2358720 |
| max_payne_3.json | Max Payne 3 | 204100 |
| last_of_us_1.json | The Last of Us Part I | 1888930 |
| last_of_us_2.json | The Last of Us Part II Remastered | 2531310 |

**注意**：TLOU2 (2531310) 的 `library_600x900.jpg` 返回错误封面，posterUrl 和 bannerUrl 都用 `library_hero.jpg`。

## JSON Schema（每款游戏）
```json
{
  "id", "name", "developer", "year", "genre", "steamAppId", "totalHoursMain",
  "posterUrl", "bannerUrl",
  "gameTheme": { "bg", "bgCard", "accent", "accent2", "text" },
  "overview": { "tagline", "description", "highlights[]" },
  "chapters": [{ "name", "pct", "desc" }],
  "bossSaves": [{ "id", "name", "pct", "planet", "tabs": { "plot","chars","fight","save" } }],
  "hypePeaks": [{ "pct", "label", "intensity" }],
  "entryPoints": [{ "hours", "label", "desc", "targetPct" }],
  "protagonistJourney": [{ "pct", "title", "desc", "icon" }],
  "playerSentiment": {
    "steamScore", "source", "note",
    "keywords": { "praise[]", "criticism[]", "hot[]" },
    "testimonials": [{ "text", "author", "upvotes" }]
  }
}
```

## 已实现功能
- 游戏选择器横向滚动栏（封面缩略图 + 游戏主题配色）
- 进度条 + Hype Wave 波形 Canvas 可视化
- 章节列表（带进度状态）
- Boss 存档点上下文面板（4 Tab：剧情 / 人物 / 战斗 / 存档建议）
- 入场点推荐（"只有 X 小时从这里开始"）
- 主角成长历程时间线
- 玩家舆情面板：Steam 好评率进度条 + Testimonial 引用卡片 + 关键词 Tag（好评 / 差评 / 热议）

## 关键文件
```
src/
  main.js              # Electron 主进程，ipcMain.handle，fs.readdirSync 自动加载 JSON
  preload.js           # contextBridge → window.gameAPI
  data/games/*.json    # 游戏数据，新增游戏只需放 JSON，无需注册
  renderer/
    index.html         # UI 结构
    renderer.js        # 所有前端逻辑（buildGameSelector, switchGame, buildPlayerSentiment 等）
    styles.css         # CSS 变量主题系统
```

## 开发路线图
1. **UI 重设计**：参考 GameTrack (iOS)，优雅 + 电影感 + 中文本地化（已有 Claude Design 提示词）
2. **Tauri 迁移**：新建 `tauri` 分支作为主 release 分支，跨端兼容微信小程序 / iPhone / PC
3. **平台登录授权**：Steam / WeGame / TapTap / PSN OAuth（参考二饼 App 实现方式）

## 已知问题 / 注意事项
- bash 沙箱（`/sessions/.../mnt/`）对 Windows 文件工具写入的文件有时有缓存延迟，验证文件改动请用 grep 而非 wc -l
- `.git/index.lock` 和 `.git/HEAD.lock` 在 bash 沙箱中无法删除，需用户在 PowerShell 手动 `Remove-Item`
- `main.js` 用 `fs.readdirSync` 自动发现所有 `.json` 文件，新增游戏无需改代码
