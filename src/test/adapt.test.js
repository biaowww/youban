/* adaptGame 适配器单测：真实 5 款 JSON + 最小输入默认值 */
import { describe, it, expect } from 'vitest';
import adaptMod from '../renderer/adapt.js';
import validator from '../scripts/validate-games.js';

const { adaptGame } = adaptMod;
const { loadGameFiles } = validator;

const files = loadGameFiles();

describe('adaptGame · 真实游戏数据', () => {
  it('能加载到 9 款游戏', () => {
    expect(files.length).toBe(11);
  });

  for (const { file, game } of files) {
    describe(file, () => {
      const v = adaptGame(game);

      it('基本元字段类型正确', () => {
        expect(typeof v.id).toBe('string');
        expect(typeof v.titleMain).toBe('string');
        expect(typeof v.short).toBe('string');
        expect(typeof v.hoursMain).toBe('number');
        expect(typeof v.currentPct).toBe('number');
        expect(typeof v.poster).toBe('string');
        expect(typeof v.banner).toBe('string');
      });

      it('theme 字段齐全', () => {
        expect(v.theme).toBeTypeOf('object');
        for (const k of ['bg', 'card', 'accent', 'accent2', 'text']) {
          expect(v.theme[k], `theme.${k}`).toBeTypeOf('string');
        }
      });

      it('chapters[] 映射为短字段且 end 为数', () => {
        expect(Array.isArray(v.chapters)).toBe(true);
        expect(v.chapters.length).toBeGreaterThan(0);
        for (const c of v.chapters) {
          expect(typeof c.name).toBe('string');
          expect(typeof c.start).toBe('number');
          expect(typeof c.end).toBe('number');
          expect(c.start).toBeLessThan(c.end);
        }
      });

      it('bosses / hype / entries / journey 为数组且 pct 为数', () => {
        for (const key of ['bosses', 'hype', 'entries', 'journey']) {
          expect(Array.isArray(v[key]), key).toBe(true);
        }
        v.bosses.forEach(b => expect(typeof b.pct).toBe('number'));
        v.hype.forEach(p => expect(typeof p.pct).toBe('number'));
        v.entries.forEach(e => expect(typeof e.pct).toBe('number'));
        v.journey.forEach(j => {
          expect(typeof j.pct).toBe('number');
          expect(Array.isArray(j.unlocks)).toBe(true);
        });
      });

      it('sentiment 结构正确，quotes[].up 为数', () => {
        expect(typeof v.sentiment.score).toBe('number');
        expect(Array.isArray(v.sentiment.praise)).toBe(true);
        expect(Array.isArray(v.sentiment.criticism)).toBe(true);
        expect(Array.isArray(v.sentiment.hot)).toBe(true);
        v.sentiment.quotes.forEach(q => {
          expect(typeof q.text).toBe('string');
          expect(typeof q.up).toBe('number');
        });
      });

      it('ach[] 为数组，元素含 id/pct', () => {
        expect(Array.isArray(v.ach)).toBe(true);
        v.ach.forEach(a => {
          expect(typeof a.id).toBe('string');
          expect(typeof a.pct).toBe('number');
        });
      });

      it('save 为 null 或 {steps[],path}', () => {
        if (v.save !== null) {
          expect(Array.isArray(v.save.steps)).toBe(true);
          expect(typeof v.save.path).toBe('string');
        }
      });
    });
  }
});

describe('adaptGame · 最小输入安全默认', () => {
  const minimal = adaptGame({ id: 'x', name: '最小游戏' });

  it('不抛错且关键字段不为 undefined', () => {
    expect(minimal.id).toBe('x');
    expect(minimal.titleMain).toBe('最小游戏'); // 回退 name
    expect(minimal.short).toBe('最小游戏');
    expect(minimal.titleSub).toBe('');
    expect(minimal.currentPct).toBe(0); // null/缺失 → 0
  });

  it('所有集合字段默认空数组（不为 undefined）', () => {
    for (const key of ['highlights', 'chapters', 'bosses', 'hype', 'entries', 'journey', 'ach']) {
      expect(Array.isArray(minimal[key]), key).toBe(true);
      expect(minimal[key].length).toBe(0);
    }
  });

  it('theme 对象存在（值可为 undefined 但对象本身在）', () => {
    expect(minimal.theme).toBeTypeOf('object');
    expect('accent' in minimal.theme).toBe(true);
  });

  it('sentiment 默认结构完整', () => {
    expect(minimal.sentiment.score).toBe(0);
    expect(minimal.sentiment.praise).toEqual([]);
    expect(minimal.sentiment.quotes).toEqual([]);
  });

  it('无 saveDownload → save 为 null', () => {
    expect(minimal.save).toBeNull();
  });

  it('currentPct=0 显式传入被保留', () => {
    expect(adaptGame({ id: 'y', currentPct: 0 }).currentPct).toBe(0);
    expect(adaptGame({ id: 'z', currentPct: 55 }).currentPct).toBe(55);
  });
});
