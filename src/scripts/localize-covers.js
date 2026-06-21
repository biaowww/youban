/* ============================================================
   游伴 YouBan · 封面本地化脚本（一次性）
   把每款游戏的 posterUrl / bannerUrl（远程 Steam CDN）下载到
   renderer/assets/covers/，并把 JSON 改写为本地相对路径。
   解决「国内打开应用封面加载慢 / 需联网」的问题。

   用法（在 src/ 下）：
     node scripts/localize-covers.js
     npm run build:ui      # 刷新浏览器预览用的 mock-data.js

   幂等：已下载的文件默认跳过；加 --force 重新下载。
   ============================================================ */
const fs = require('fs');
const path = require('path');
const https = require('https');

const GAMES_DIR = path.join(__dirname, '..', 'data', 'games');
const COVERS_DIR = path.join(__dirname, '..', 'renderer', 'assets', 'covers');
const FORCE = process.argv.includes('--force');

fs.mkdirSync(COVERS_DIR, { recursive: true });

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    const req = https.get(url, { timeout: 30000, headers: { 'User-Agent': 'youban-localize' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(download(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      const tmp = dest + '.part';
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => out.close(() => { fs.renameSync(tmp, dest); resolve(dest); }));
      out.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout ' + url)));
    req.on('error', reject);
  });
}

function localName(id, kind, url) {
  const ext = (url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) || ['', 'jpg'])[1].toLowerCase();
  return `${id}-${kind}.${ext}`;
}

(async () => {
  const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
  let downloaded = 0, skipped = 0, patched = 0, failed = 0;

  for (const f of files) {
    const p = path.join(GAMES_DIR, f);
    const g = JSON.parse(fs.readFileSync(p, 'utf8'));
    let changed = false;

    for (const kind of ['poster', 'banner']) {
      const field = kind === 'poster' ? 'posterUrl' : 'bannerUrl';
      const url = g[field];
      if (!url || !/^https?:\/\//.test(url)) continue; // 已是本地路径则跳过

      const name = localName(g.id, kind, url);
      const dest = path.join(COVERS_DIR, name);
      const rel = `assets/covers/${name}`; // 相对 renderer/index.html

      try {
        if (FORCE || !fs.existsSync(dest)) {
          process.stdout.write(`↓ ${g.id} ${kind} ... `);
          await download(url, dest);
          console.log('ok (' + (fs.statSync(dest).size / 1024 | 0) + ' KB)');
          downloaded++;
        } else {
          skipped++;
        }
        g[field] = rel;
        changed = true;
      } catch (e) {
        console.log(`✗ ${g.id} ${kind}: ${e.message}（保留远程地址）`);
        failed++;
      }
    }

    if (changed) {
      fs.writeFileSync(p, JSON.stringify(g, null, 2) + '\n', 'utf8');
      patched++;
    }
  }

  console.log(`\n完成：下载 ${downloaded} · 跳过 ${skipped} · 改写 JSON ${patched} 个 · 失败 ${failed}`);
  console.log('记得跑：npm run build:ui （刷新预览用 mock-data.js）');
  if (failed) process.exitCode = 1;
})();
