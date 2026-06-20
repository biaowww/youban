/* 游戏数据 schema / 数值合理性校验单测 */
import { describe, it, expect } from 'vitest';
import validator from '../scripts/validate-games.js';

const { validateGame, validateAll, loadGameFiles } = validator;

describe('游戏数据 schema 校验', () => {
  const results = validateAll();

  it('至少发现 5 个游戏数据文件', () => {
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  for (const { file, errors } of results) {
    it(`${file} 通过 schema/数值校验`, () => {
      // 失败时把具体错误打到断言信息里，便于定位
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});

describe('校验器本身能抓出问题（负向用例）', () => {
  it('空对象 → 报缺失字段', () => {
    const errs = validateGame({}, 'empty.json');
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(' ')).toContain('id');
  });

  it('progressStart >= progressEnd → 区间非法', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    broken.chapters[0].progressStart = broken.chapters[0].progressEnd;
    const errs = validateGame(broken, 'broken.json');
    expect(errs.join('\n')).toMatch(/区间非法|不连续|重叠/);
  });

  it('currentPct 越界 → 报错', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    broken.currentPct = 140;
    const errs = validateGame(broken, 'broken.json');
    expect(errs.join('\n')).toContain('currentPct');
  });

  it('steamScore 越界 → 报错', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    broken.playerSentiment.steamScore = 200;
    const errs = validateGame(broken, 'broken.json');
    expect(errs.join('\n')).toContain('steamScore');
  });

  it('章节出现缺口 → 报不连续', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    // 制造缺口：把第二章 start 往后挪
    if (broken.chapters.length >= 2) {
      broken.chapters[1].progressStart = broken.chapters[1].progressStart + 1;
      const errs = validateGame(broken, 'broken.json');
      expect(errs.join('\n')).toMatch(/不连续|重叠/);
    }
  });
});
