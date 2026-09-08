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

  it('playerScore 越界 → 报错', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    broken.playerSentiment.playerScore.value = 200;
    const errs = validateGame(broken, 'broken.json');
    expect(errs.join('\n')).toContain('playerScore');
  });

  it('评分口径 origin 非法 → 报错（防止把媒体分冒充成 Steam 好评率）', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    broken.playerSentiment.playerScore.origin = 'wechat';
    const errs = validateGame(broken, 'broken.json');
    expect(errs.join('\n')).toContain('origin');
  });

  it('两种评分都缺 → 报错（legacy steamScore 仍接受）', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    delete broken.playerSentiment.playerScore;
    delete broken.playerSentiment.mediaScore;
    expect(validateGame(broken, 'broken.json').join('\n')).toContain('缺少评分');
    /* 线上库仍是旧结构 → legacy steamScore 必须继续被接受 */
    broken.playerSentiment.steamScore = 88;
    expect(validateGame(broken, 'broken.json').join('\n')).not.toContain('缺少评分');
  });

  it('platforms 缺失 / 非法值 → 报错', () => {
    const base = loadGameFiles()[0].game;
    const broken = JSON.parse(JSON.stringify(base));
    delete broken.platforms;
    expect(validateGame(broken, 'broken.json').join('\n')).toContain('platforms');
    broken.platforms = ['pc', 'sega'];
    expect(validateGame(broken, 'broken.json').join('\n')).toContain('sega');
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
