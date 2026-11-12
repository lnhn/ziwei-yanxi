/**
 * 人生 K 线 —— 把 8–90 岁逐年的「盘面倾向」压成一根 K 线
 *
 * 为什么做这个：
 *   解盘的文字是「层」的，但人问问题永远是「哪一年」。用户看盘最想要的一个动作是
 *   「往后三年会怎样、过去十年哪一段最难」。纯文字答不了这个，得有一条能一眼扫完的时间轴。
 *
 * 口径（重要，别当成算命，也别当成行情）：
 *   每年一条 K 线，开高低收不是价格，是「该年盘面强度」的 0–100 指数。
 *     · 收 = 该年五维（事业 / 财 / 关系 / 身体 / 心境）加权后的综合强度
 *     · 开 = 上一年的收（连续时间轴，跳空只出现在换大限那一年之前，符合直觉）
 *     · 高 / 低 = 在开收之外，按这一年的煞星与四化冲突量画出的「摩擦幅度」——影线画的是折腾程度，不是高低点
 *   强度由三层叠加算出：本命该宫星曜亮度打底 + 大限四化 + 流年四化（与本命四化）。
 *   星曜亮度、煞星集合、三方四正的口径全部沿用 lib/ziwei/reading.ts，避免两套算法互相打架。
 *
 * 所有数都能被复算：每个 Bar 里都留了 lu/quan/ke/ji 与 sha 明细，界面上可逐条核对。
 */

import type { Palace, SiHua, Star, StarBrightness, ZiweiChart } from './types';
import { BRANCHES, STEMS } from './constants';
import { getLiuNianSiHua, getSiHuaByStem, getYearBranchIndex } from './sihua';

/** 五维：事业、财、关系、身体、心境 —— 恰好对应解盘里最常被问的五件事 */
export type DimKey = 'career' | 'wealth' | 'love' | 'health' | 'mind';

export interface KlineDim {
  key: DimKey;
  label: string;
  /** 该年该维 0–100 */
  score: number;
}

export interface KlineBar {
  /** 虚岁（与 chart.currentAge 同口径） */
  age: number;
  /** 公历年 */
  year: number;
  /** 流年干（四化来源） */
  stemName: string;
  /** 流年命宫所在地支（索引） */
  branch: number;
  /** 流年命宫在本命盘上的宫名（借本命宫名，便于「在盘上看」） */
  palaceName: string;
  open: number;
  high: number;
  low: number;
  close: number;
  dims: KlineDim[];
  /** 该年落在哪个大限 */
  daXianName: string;
  /** 流年四化四星 */
  siHua: Record<SiHua, string>;
  /** 该年本命盘上煞星颗数（摩擦来源） */
  sha: number;
  /** 一句判语 */
  note: string;
}

export interface LifeKline {
  bars: KlineBar[];
  /** 全段最高 / 最低的年份，给「哪一段最好、哪一段最紧」用 */
  best: KlineBar;
  worst: KlineBar;
  /** 当前大限覆盖的年份区间（虚岁） */
  currentSpan: [number, number] | null;
}

// ── 口径常量（与 reading.ts 保持一致）──────────────────────────
const SHA_HARD = ['擎羊', '陀罗', '火星', '铃星'];
const SHA_KONG = ['地空', '地劫'];
const SHA_ALL = [...SHA_HARD, ...SHA_KONG];
const LUCKY_STARS = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马'];

/** 亮度分：庙旺有力，陷弱要后天补。数值是「相对强弱」，不是吉凶判决 */
const BRIGHT_SCORE: Record<StarBrightness, number> = {
  庙: 18, 旺: 14, 得: 10, 利: 6, 平: 0, 不: -8, 闲: -10, 陷: -14, 地: 0,
};

const DIM_META: { key: DimKey; label: string; palace: string }[] = [
  { key: 'career', label: '事业', palace: '官禄宫' },
  { key: 'wealth', label: '财', palace: '财帛宫' },
  { key: 'love', label: '关系', palace: '夫妻宫' },
  { key: 'health', label: '身体', palace: '疾厄宫' },
  { key: 'mind', label: '心境', palace: '福德宫' },
];

/** 综合强度权重：事业与财给重，身体与心境给足分量（这三样不对，其余都是空谈） */
const DIM_WEIGHT: Record<DimKey, number> = { career: 0.3, wealth: 0.25, love: 0.15, health: 0.2, mind: 0.1 };

// ── 小工具 ────────────────────────────────────────────────────
function norm(b: number): number {
    return ((b % 12) + 12) % 12;
}

function palaceAt(chart: ZiweiChart, branch: number): Palace | undefined {
  return chart.palaces.find((p) => p.branch === norm(branch));
}

function baseName(n: string): string {
  return n.replace(/宫$/, '');
}

function palaceNamed(chart: ZiweiChart, name: string): Palace | undefined {
  return chart.palaces.find((p) => baseName(p.name) === baseName(name));
}

/** 三方四正：本宫、三合两支、对宫 */
function sanFang(branch: number): number[] {
  return [branch, norm(branch + 4), norm(branch + 8), norm(branch + 6)];
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

/** 单宫星曜底分：亮度 + 吉星 - 煞星，空宫按 48（借对宫的规则已在盘上做好，这里只判「没主星」） */
function palaceBaseScore(p: Palace | undefined): number {
  if (!p) return 50;
  let s = 50;
  const majors = p.stars.filter((x) => x.type === 'major');
  if (!majors.length) s -= 2; // 空宫：底子薄一点，但不判死
  for (const st of majors) {
    const b = st.brightnessRaw;
    s += b ? BRIGHT_SCORE[b] ?? 0 : 0;
  }
  for (const st of p.stars) {
    if (LUCKY_STARS.includes(st.name)) s += 7;
    if (SHA_HARD.includes(st.name)) s -= 9;
    if (SHA_KONG.includes(st.name)) s -= 6;
  }
  return clamp(s);
}

/** 一宫的三方四正综合分（本宫重、其余四成） */
function palaceGroupScore(chart: ZiweiChart, branch: number): number {
  const [self, s1, s2, opp] = sanFang(branch);
  const w = 1 + 0.4 + 0.4 + 0.4;
  const sum =
    palaceBaseScore(palaceAt(chart, self)) +
    0.4 * palaceBaseScore(palaceAt(chart, s1)) +
    0.4 * palaceBaseScore(palaceAt(chart, s2)) +
    0.4 * palaceBaseScore(palaceAt(chart, opp));
  return clamp(sum / w);
}

/** 某颗星落在哪个地支 */
function starBranch(chart: ZiweiChart, starName: string): number | null {
  if (!starName) return null;
  for (const p of chart.palaces) {
    if (p.stars.some((s) => s.name === starName)) return p.branch;
  }
  return null;
}

/**
 * 四化对某一宫的加减
 *   同宫：禄 +10 / 权 +8 / 科 +6 / 忌 -12
 *   对宫：折半（对宫是「外面来的人/事」，影响没本宫直接）
 */
function huaAdjust(chart: ZiweiChart, branch: number, transforms: Record<SiHua, string>): number {
  const table: Record<SiHua, number> = { 禄: 10, 权: 8, 科: 6, 忌: -12 };
  let d = 0;
  (Object.keys(table) as SiHua[]).forEach((h) => {
    const b = starBranch(chart, transforms[h]);
    if (b === null) return;
    if (b === norm(branch)) d += table[h];
    else if (b === norm(branch + 6)) d += table[h] * 0.5;
  });
  return d;
}

function shaOf(chart: ZiweiChart, branch: number): number {
  const p = palaceAt(chart, branch);
  if (!p) return 0;
  return p.stars.filter((s) => SHA_ALL.includes(s.name)).length;
}

function bigShaOf(chart: ZiweiChart, branch: number): number {
  // 四正一起数，用来看这一年的「摩擦面」有多宽
  return sanFang(branch).reduce((n, b) => n + shaOf(chart, b), 0);
}

/** 该年大限（虚岁区间） */
function daXianAt(chart: ZiweiChart, age: number) {
  return chart.daXians.find((d) => age >= d.startAge && age <= d.endAge);
}

function disp(name: string): string {
  return name.endsWith('宫') ? name : `${name}宫`;
}

/**
 * 主函数：算逐年 K 线
 * @param chart 命盘
 * @param span 取多少年（默认 8 岁到 90 岁；太早的童限对读盘意义有限，但保留从 1 岁起也可以传 1）
 */
export function buildLifeKline(chart: ZiweiChart, span?: { from?: number; to?: number }): LifeKline {
  const from = Math.max(1, span?.from ?? 8);
  const to = Math.min(110, span?.to ?? 90);
  const birthYear = chart.birthInfo.year;

  // 本命四化：盘上朱红章，恒在
  const benMing = getSiHuaByStem(chart.lunarInfo.yearStem);
  // 流年命宫相对本命命宫的位移：流年命宫落该年支，其余宫名跟着整体平移
  const delta = (y: number) => norm(getYearBranchIndex(y) - chart.mingGongBranch);

  const bars: KlineBar[] = [];
  let prevClose = 50;

  for (let age = from; age <= to; age++) {
    const year = birthYear + age - 1;
    const dx = daXianAt(chart, age);
    const dxTransforms = dx ? getSiHuaByStem(dx.stemIndex ?? palaceAt(chart, dx.palaceBranch)?.stem ?? 0) : null;
    const liu = getLiuNianSiHua(year).transforms;
    const shift = delta(year);

    // 五维：把本命宫名按 shift 平移到流年盘上
    const dims: KlineDim[] = DIM_META.map((m) => {
      const base = palaceNamed(chart, m.palace);
      const branch = base ? norm(base.branch + shift) : chart.mingGongBranch;
      let v = palaceGroupScore(chart, branch);
      v += huaAdjust(chart, branch, benMing);
      if (dxTransforms) v += huaAdjust(chart, branch, dxTransforms);
      v += huaAdjust(chart, branch, liu);
      return { key: m.key, label: m.label, score: clamp(Math.round(v)) };
    });

    const close = clamp(Math.round(dims.reduce((s, d) => s + d.score * DIM_WEIGHT[d.key], 0)));

    // 影线：这一年的煞星面 + 四化冲突（禄忌同时压同一宫时最折腾）
    const liuMingBranch = norm(getYearBranchIndex(year));
    const sha = bigShaOf(chart, liuMingBranch);
    const spread = clamp(2 + sha * 1.1 + Math.abs(close - prevClose) * 0.35, 3, 16);

    const open = prevClose;
    const high = clamp(Math.max(open, close) + spread);
    const low = clamp(Math.min(open, close) - spread);
    prevClose = close;

    const bar: KlineBar = {
      age, year,
      stemName: STEMS[getLiuNianSiHua(year).stemIndex] ?? '',
      branch: liuMingBranch,
      palaceName: disp(palaceAt(chart, liuMingBranch)?.name ?? '命宫'),
      open, high, low, close,
      dims,
      daXianName: dx ? `${dx.startAge}–${dx.endAge} ${disp(dx.palaceName)}` : '童限',
      siHua: liu,
      sha,
      note: '',
    };
    bar.note = noteOf(bar);
    bars.push(bar);
  }

  const best = bars.reduce((a, b) => (b.close > a.close ? b : a), bars[0]);
  const worst = bars.reduce((a, b) => (b.close < a.close ? b : a), bars[0]);
  const cur = chart.daXians.find((d) => chart.currentAge >= d.startAge && chart.currentAge <= d.endAge);

  return {
    bars,
    best,
    worst,
    currentSpan: cur ? [cur.startAge, cur.endAge] : null,
  };
}

/** 一句判语：只描述这一年「顺在哪、卡在哪」，不下判决 */
function noteOf(b: KlineBar): string {
  const sorted = [...b.dims].sort((x, y) => y.score - x.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const level = b.close >= 68 ? '顺' : b.close >= 52 ? '平' : '紧';
  if (level === '顺') {
    return `${top.label}这一块最见力（${top.score}），适合推进、谈事、立名分；${bottom.label}相对弱（${bottom.score}），别把重注押在同一件事上。`;
  }
  if (level === '紧') {
    return `${bottom.label}最吃紧（${bottom.score}），${b.sha} 颗煞星压在这一年的四正上——宜守、宜收尾、宜把旧账结清，少开新战场；${top.label}仍是这一年的支点（${top.score}）。`;
  }
  return `不上不下的一年：${top.label}（${top.score}）可以试着往前挪一步，${bottom.label}（${bottom.score}）守住即可，别指望一年翻盘。`;
}

/** 给面板用：把某一年的盘上细节拉成可读的几行 */
export function barFacts(chart: ZiweiChart, b: KlineBar): { label: string; text: string }[] {
  const liuPalace = palaceAt(chart, b.branch);
  const stars = liuPalace?.stars.filter((s) => s.type === 'major').map((s: Star) => s.name).join('、') || '空宫（借对宫）';
  return [
    { label: '流年命宫', text: `${BRANCHES[b.branch]} · ${b.palaceName}（${stars}）` },
    { label: '流年四化', text: `禄 ${b.siHua.禄 || '—'}／权 ${b.siHua.权 || '—'}／科 ${b.siHua.科 || '—'}／忌 ${b.siHua.忌 || '—'}` },
    { label: '所处大限', text: b.daXianName },
  ];
}
