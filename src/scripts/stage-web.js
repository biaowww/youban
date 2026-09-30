/* ============================================================
   游伴 YouBan · Tauri 前端暂存脚本（tauri 分支专用）
   把 renderer 组装成一个「自包含静态目录」 src/web-dist/，供 Tauri 的
   frontendDist 使用。配方与 .github/workflows/pages.yml 保持一致：
     - 入口 index.html = renderer/preview.html（数据走内嵌 mock-data.js，
       不依赖 Electron IPC / Tauri 命令）
     - "../services/ 改写为 "services/（打包目录不能引用上级路径）
   用法： node scripts/stage-web.js            （先跑 build-ui.js 再暂存）
          node scripts/stage-web.js --no-build （跳过 UI 预编译）
   纯 Node，无第三方依赖。不修改 renderer/ 下任何源文件的内容
   （build-ui.js 会照常刷新 dist/ 与 mock-data.js 这两样产物）。
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = path.join(__dirname, '..');
const RENDERER = path.join(SRC, 'renderer');
const OUT = path.join(SRC, 'web-dist');

const DIRS = ['dist', 'vendor', 'assets', 'tokens', 'fonts'];
const FILES = [
  'app.css', 'screens.css', 'v10.css', 'companion.css', 'desktop.css',
  'adapt.js', 'mock-data.js', 'steam-fixtures.js',
];
// 不进包的文件（体积大且运行时不用）
const SKIP = new Set(['babel.min.js', 'preview-multi.js']);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

function dirSize(p) {
  let n = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const a = path.join(p, e.name);
    n += e.isDirectory() ? dirSize(a) : fs.statSync(a).size;
  }
  return n;
}

// 1) 预编译 UI（renderer/*.jsx → renderer/dist/*.js，并刷新 mock-data.js）
if (!process.argv.includes('--no-build')) {
  execFileSync(process.execPath, [path.join(SRC, 'build-ui.js')], { cwd: SRC, stdio: 'inherit' });
}

// 2) 清空并重建 web-dist/
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const d of DIRS) {
  const from = path.join(RENDERER, d);
  if (!fs.existsSync(from)) throw new Error(`缺少目录 renderer/${d}`);
  copyDir(from, path.join(OUT, d));
}
for (const f of FILES) {
  const from = path.join(RENDERER, f);
  if (!fs.existsSync(from)) throw new Error(`缺少文件 renderer/${f}`);
  fs.copyFileSync(from, path.join(OUT, f));
}
copyDir(path.join(SRC, 'services', 'steam'), path.join(OUT, 'services', 'steam'));

// 3) 入口：preview.html → index.html，改写越级路径
const html = fs.readFileSync(path.join(RENDERER, 'preview.html'), 'utf8')
  .replace(/"\.\.\/services\//g, '"services/');
if (html.includes('"../')) throw new Error('index.html 仍含越级引用 "../ ，请检查 preview.html');
fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');

// 4) 自检：index.html 引用的本地 script / css 必须都在 web-dist 里
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
  .filter(u => !/^(https?:|data:|#)/.test(u));
const missing = refs.filter(u => !fs.existsSync(path.join(OUT, u)));
if (missing.length) throw new Error('web-dist 缺少被引用的文件：' + missing.join(', '));

console.log(`✓ web-dist 就绪：${refs.length} 个引用全部命中，共 ${(dirSize(OUT) / 1048576).toFixed(1)} MB → ${OUT}`);
