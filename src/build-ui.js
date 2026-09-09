/* ============================================================
   游伴 YouBan · UI 构建脚本
   1) 把 renderer/*.jsx 预编译为 renderer/dist/*.js（普通脚本，运行时无需 Babel）
   2) 从 data/games/*.json 刷新 renderer/mock-data.js（浏览器预览用真实数据）
   用法： npm run build:ui   （编辑 .jsx 或游戏数据后执行）
   ============================================================ */
const Babel = require('@babel/standalone');
const fs = require('fs');
const path = require('path');

const RENDERER = path.join(__dirname, 'renderer');
const DIST = path.join(RENDERER, 'dist');
const GAMES = path.join(__dirname, 'data', 'games');

// 顺序很重要：components 先声明全局 hooks，其余复用之
const FILES = ['components.jsx', 'screens.jsx', 'app.jsx', 'desktop.jsx', 'preview-multi.jsx', 'v10.jsx', 'companion.jsx'];

fs.mkdirSync(DIST, { recursive: true });

for (const f of FILES) {
  const src = path.join(RENDERER, f);
  if (!fs.existsSync(src)) { console.warn(`(跳过 缺失) ${f}`); continue; }
  const { code } = Babel.transform(fs.readFileSync(src, 'utf8'), { presets: ['react'], filename: f });
  const out = f.replace(/\.jsx$/, '.js');
  fs.writeFileSync(path.join(DIST, out), code, 'utf8');
  console.log(`✓ ${f} → dist/${out} (${code.length} B)`);
}

// 刷新浏览器预览数据（真实 src/data/games）
const raws = fs.readdirSync(GAMES).filter(x => x.endsWith('.json')).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(GAMES, f), 'utf8')));
fs.writeFileSync(path.join(RENDERER, 'mock-data.js'),
  '/* 浏览器预览用：真实游戏数据（由 src/data/games/*.json 生成） */\n' +
  'window.__YB_RAW__ = ' + JSON.stringify(raws) + ';\n', 'utf8');
console.log(`✓ mock-data.js ← ${raws.length} 款游戏`);
console.log('UI 构建完成。');
