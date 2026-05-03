# 游戏进度陪伴器 · Game Progress Companion

> 让玩家"快速"体验超长3A游戏 — 像看视频一样掌握游戏进度

---

## 项目简介

本工具是一款 PC 游戏伴侣应用，帮助玩家直观了解自己在长篇 3A 游戏中的进度位置，标注剧情高潮节点，支持跳关存档辅助。首个支持的游戏为 **《星球大战 绝地：陨落的武士团》（Jedi: Fallen Order）**。

---

## 文档结构

```
游戏进度陪伴器 Game Companion/
│
├── README.md               ← 本文件，项目说明与导航
│
├── docs/
│   └── PRD.md              ← 产品需求文档（功能 / 可行性 / MVP路线）
│
├── research/
│   ├── jedi_fo_game_data.md   ← 游戏全流程章节、成就、时长数据
│   └── steam_api_notes.md     ← Steam Web API 接入说明
│
├── prototype/
│   └── ui_prototype.html      ← 可交互 UI 原型（浏览器直接打开）
│
└── src/                    ← 开发代码目录（Claude Code 在此工作）
```

---

## 快速开始

| 我想做什么 | 去哪里 |
|---|---|
| 了解产品定义和开发计划 | `docs/PRD.md` |
| 查看游戏全流程数据 | `research/jedi_fo_game_data.md` |
| 体验 UI 交互原型 | 浏览器打开 `prototype/ui_prototype.html` |
| 开始代码开发 | `src/` 目录，配合 Claude Code 使用 |

---

## 当前阶段

**阶段 0 — 文档与原型** ✅  
**阶段 1 — MVP 开发** 🔲 → 在 `src/` 目录使用 Claude Code 开发
