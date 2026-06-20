# 隔夜挂机任务 · 怎么发给 Claude Code

## 在哪开

在**项目根目录**开 Claude Code（不是 `src/`）：

```powershell
cd "E:\claude_project\游戏进度陪伴器 Game Companion"
claude
```

根目录有 `CLAUDE.md`，Claude Code 启动会自动读；两份任务规格在 `docs/tasks/` 下，用的都是仓库相对路径。

## 粘这段提示词

```
读项目根 CLAUDE.md，然后严格按 docs/tasks/overnight-01-test-harness.md 和
docs/tasks/overnight-02-steam-progress-sync.md 执行，今晚无人值守完成这两个任务。

规则：
- 先按任务01的「第0步」把当前 electron 工作区的未提交改动提交成一个基线 commit，
  再从 electron 切出 feature/overnight 分支；两个任务都在 feature/overnight 上做。
- 不要 push、不要合并、不要碰 tauri 分支。
- 每个任务以其「完成判据」命令全绿为准；改了任何 *.jsx 必须跑 npm run build:ui 并提交 dist/。
- 全程在 src/ 下跑 npm；需要的依赖直接 npm i -D 装。
- 任务01、02 各写一份 docs/tasks/RESULT-0x.md；卡住就按规格里「卡住怎么办」降级处理并继续，别空转。
- 完成后给我总结：两个任务各自 npm test 通过情况、新增/改动的文件、未尽事项与建议。

你可以自动跑命令、自动 commit，不必每步问我。
```

## 让它能整夜自己跑

启动后如果 Claude Code 每条命令都来征求同意，就开它的"自动执行/接受编辑"模式（让它不必逐条问），这样才能无人值守。**它只会在 `feature/overnight` 分支动手，不 push、不碰 `tauri`，最坏情况你早上 `git checkout electron` 就回到原样。**

## 早上回来看什么

- `git log --oneline feature/overnight` —— 看它提交了什么
- `docs/tasks/RESULT-01.md` / `RESULT-02.md` —— 它的自述结果与未尽事项
- `cd src && npm test` —— 自己再跑一遍确认全绿
- 满意就 `git checkout electron && git merge feature/overnight`
