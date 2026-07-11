/* ============================================================
   界面冒烟渲染（jsdom）
   把 vendor/react*.min.js + dist/{components,screens,desktop}.js + adapt.js
   像浏览器一样以 <script> 注入到一个真实 JSDOM window 中执行，然后用真实组件
   + 真实游戏数据（经 adaptGame）渲染「每款游戏 × 每个界面」，断言：
     1) 渲染不抛异常
     2) 不产生 console.error
     3) 根节点有内容（有子元素）
   用 runScripts:'dangerously' 而非 indirect-eval，是为了让 React 的 UMD（含
   'use strict'）在 window 真实全局上下文里正确挂载，最贴近运行时。
   依赖 dist/*.js —— 需先 npm run build:ui。
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import adaptMod from '../renderer/adapt.js';
import validator from '../scripts/validate-games.js';

const { adaptGame } = adaptMod;
const { loadGameFiles } = validator;

const read = (rel) => readFileSync(new URL(`../renderer/${rel}`, import.meta.url), 'utf8');

let win;            // jsdom window
let errors = [];    // 捕获的 console.error 调用

const games = loadGameFiles().map(({ game }) => adaptGame(game));

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="host"></div></body></html>', {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  win = dom.window;

  // 必要 stub
  win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  if (!win.matchMedia) {
    win.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  }
  if (win.HTMLCanvasElement) {
    win.HTMLCanvasElement.prototype.getContext = () => null;
  }

  // 捕获 React/组件在该 window 上下文打出的 console.error
  win.console.error = (...args) => { errors.push(args.map(String).join(' ')); };

  const inject = (code) => {
    const s = win.document.createElement('script');
    s.textContent = code;
    win.document.body.appendChild(s);
  };

  // 顺序：React → ReactDOM → adapt → components → screens → desktop
  inject(read('vendor/react.min.js'));
  inject(read('vendor/react-dom.min.js'));
  inject(read('adapt.js'));
  inject(read('dist/components.js'));
  inject(read('dist/screens.js'));
  inject(read('dist/desktop.js'));
  inject(read('dist/v10.js'));

  if (!win.React || !win.ReactDOM) {
    throw new Error('React/ReactDOM 未挂载到 window —— 注入失败');
  }
});

afterEach(() => { errors = []; });

/* 渲染一个组件到全新容器，返回容器；断言由调用方做。 */
function renderComp(compName, props) {
  const Comp = win[compName];
  if (typeof Comp !== 'function') throw new Error(`组件 ${compName} 未在 window 上找到`);
  const container = win.document.createElement('div');
  win.document.body.appendChild(container);
  const root = win.ReactDOM.createRoot(container);
  win.ReactDOM.flushSync(() => {
    root.render(win.React.createElement(Comp, props));
  });
  const html = container.innerHTML;
  const childCount = container.childElementCount;
  root.unmount();
  container.remove();
  return { html, childCount };
}

function expectClean(compName, props) {
  let res;
  expect(() => { res = renderComp(compName, props); }, `${compName} 渲染抛异常`).not.toThrow();
  expect(errors, `${compName} 触发 console.error:\n${errors.join('\n')}`).toEqual([]);
  expect(res.childCount, `${compName} 根节点无内容`).toBeGreaterThan(0);
}

describe('界面冒烟渲染 · 每款游戏 × 每个界面', () => {
  it('已注入 React 且加载 5 款游戏', () => {
    expect(typeof win.React.createElement).toBe('function');
    expect(games.length).toBe(9);
  });

  games.forEach((game, idx) => {
    describe(`${game.short}`, () => {
      const noop = () => {};
      it('LibraryScreen', () => {
        expectClean('LibraryScreen', { games, gi: idx, enter: noop, onProfile: noop });
      });
      it('ProgressScreen', () => {
        expectClean('ProgressScreen', { game, value: game.currentPct, setValue: noop, openBoss: noop, openEntry: noop });
      });
      it('JourneyScreen', () => {
        expectClean('JourneyScreen', { game, value: game.currentPct, setValue: noop });
      });
      it('SentimentScreen', () => {
        expectClean('SentimentScreen', { game });
      });
      it('MeScreen', () => {
        expectClean('MeScreen', { games, onClose: noop, theme: 'light', setTheme: noop, game, onConnect: noop });
      });
      it('DesktopApp (PC)', () => {
        expectClean('DesktopApp', { games, gi: idx, enter: noop, value: game.currentPct, setValue: noop, theme: 'light', setTheme: noop, onProfile: noop });
      });
      it('V10App (新版外壳)', () => {
        expectClean('V10App', { game, games, value: game.currentPct, setValue: noop, onBack: noop, onSwitchToV9: noop, openBoss: noop, openEntry: noop });
      });
      it('V10Journey (旅程图)', () => {
        expectClean('V10Journey', { game, value: game.currentPct, openBoss: noop, openEntry: noop });
      });
      it('V10Wave (张力曲线+轴+里程碑)', () => {
        expectClean('V10Wave', { game, value: game.currentPct, setValue: noop, guard: true, openBoss: noop, openEntry: noop });
      });
    });
  });

  describe('品牌页（与游戏无关）', () => {
    const noop = () => {};
    it('SplashScreen', () => { expectClean('SplashScreen', { onEnter: noop }); });
    it('LoginScreen', () => { expectClean('LoginScreen', { onLogin: noop }); });
  });
});
