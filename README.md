# 游伴 · YouBan

> 快速体验超长 3A 游戏 — 像看进度条一样掌握整个旅程

一款 Windows 桌面伴侣应用（Electron），帮助玩家在最短时间内感受长篇 3A 游戏的叙事节奏与高光时刻。

---

## 当前支持游戏

| 游戏 | 主线时长 | Boss 存档点 | 状态 |
|---|---|---|---|
| Star Wars Jedi: Fallen Order | ~17h | 12 个 | ✅ 含社区存档下载 |
| 黑神话：悟空 | ~25h | 9 个 | ✅ |
| Max Payne 3 | ~10h | 5 个 | ✅ |

---

## 核心功能

**进度可视化**
- 热度波形图（Hype Wave）：全流程剧情张力曲线，一眼看出高潮在哪
- 章节进度条：点击章节直接跳转，显示已完成 / 当前 / 待解锁状态
- 主线时长估算：已玩多久、还剩多久

**游戏简介**
- 每款游戏有专属简介、核心卖点高亮、标志性时刻推荐

**推荐起点**
- 3 个精选入场位置，附理由说明，帮助想"快速上车"的玩家选择起点

**Boss 战陪伴面板**
- 点击时间轴上的 ⚔ 标记打开面板
- 4 个标签：剧情背景 / 人物介绍 / 战斗技巧 / 跳关存档
- 跳关难度徽章（1–5 级）标注错过了多少剧情
- JFO 支持社区存档一键下载

**主角成长历程**
- 以时间轴形式展示主角在每个阶段解锁的能力与经历的关键事件

**章节详情**
- 每章悬停 / 当前章节展开：剧情概述、玩家目标、新登场角色

**多主题 / 多游戏**
- Light / Dark / Game 三套主题
- 每款游戏有专属配色（CSS 变量动态切换）
- 顶部游戏选择栏，一键切换

---

## 项目结构

```
游戏进度陪伴器 Game Companion/
├── README.md
├── logo.png
├── docs/
│   └── PRD.md                  ← 产品需求文档
├── research/                   ← 游戏数据调研笔记
├── prototype/                  ← 早期 HTML 原型
└── src/                        ← Electron 应用源码
    ├── main.js                 ← 主进程（IPC 数据加载）
    ├── preload.js              ← contextBridge 安全桥接
    ├── package.json
    ├── data/
    │   └── games/
    │       ├── jedi_fo.json
    │       ├── black_myth_wukong.json
    │       └── max_payne_3.json
    └── renderer/
        ├── index.html
        ├── renderer.js
        ├── styles.css
        └── fonts/              ← Noto Sans SC 本地字体
```

---

## 快速开始

```bash
# 进入源码目录
cd src

# 安装依赖（首次）
npm install

# 启动开发模式
npm start
```

> **系统要求**：Windows 10/11，Node.js 18+

---

## 游戏数据格式

每个游戏是一个 JSON 文件（`src/data/games/*.json`），包含以下字段：

| 字段 | 说明 |
|---|---|
| `chapters[]` | 章节列表，含进度区间、热度分、剧情描述、目标、新角色 |
| `hypePeaks[]` | 热度峰值节点，用于绘制波形图 |
| `bossSaves[]` | Boss 战存档点，含剧情 / 人物 / 战斗 / 存档四维介绍 |
| `overview` | 游戏简介：tagline、描述、高亮特性 |
| `entryPoints[]` | 推荐起始位置（3 个） |
| `protagonistJourney[]` | 主角成长时间轴 |
| `achievements[]` | Steam 成就到进度百分比的映射 |
| `gameTheme` | 游戏专属配色（bg / accent / text） |
| `saveDownload` | 社区存档包信息（可选） |

---

## 开发路线

- [x] v0.1 — Electron 框架搭建，JFO 全流程数据，Boss 战面板
- [x] v0.2 — 多游戏切换，黑神话 + Max Payne 3，游戏简介 / 起点推荐 / 主角旅程
- [ ] v0.3 — Steam 成就 API 实时读取进度
- [ ] v0.4 — 截图 AI 识别进度（Claude Vision）
- [ ] v1.0 — 跨平台（Tauri 重构）+ 更多游戏

---

## GitHub

[github.com/biaowww/youban](https://github.com/biaowww/youban) · `electron` 分支
