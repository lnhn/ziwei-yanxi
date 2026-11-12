/**
 * 解盘历史 · 本地研究库
 *
 * 为什么做这件事：
 *   原来侧栏的「解盘分析」是一个独立页 —— 进去还得再填生辰、再起一次盘，与「起盘后同页就地解盘」
 *   重复，逻辑上是绕路。改成「解盘历史」之后，这个位置不再是第二个入口，而是**结果仓**：
 *   每次在 /chart 起盘并展开解盘，就把这一张盘的成因 + 推演摘要落库，供回看与对照研究。
 *
 * 存「成因 + 摘要」，不存整张盘的渲染结果：
 *   盘永远由内核现算（generateChart），这样内核升级后旧记录仍按新算法复现，
 *   不会出现「旧结果 / 新算法」打架。摘要（命宫一句定调、六维强弱）是快照，用于列表与统计。
 *
 * 库在 localStorage（键带版本号）：网页与桌面版（WebView2）都能用，不需要额外权限；
 * 导出 JSON / CSV 之后可以直接拿去做统计。将来若要真正的 SQLite，只需替换本文件的读写层。
 */

import { buildReading } from '@/lib/ziwei/reading';
import { buildAdvice, type AdviceKey } from '@/lib/ziwei/advice';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';

const KEY = 'zw.readings.v1';
const CAP = 300;

export interface ReadingRecord {
  id: string;
  /** 最近一次推演时间（同一生辰重复推演只累计次数，不重复占位） */
  savedAt: string;
  /** 推演次数 */
  hits: number;
  birth: BirthInfo;
  meta: {
    lunar: string;
    ju: string;
    mingBranch: string;
    mingPalace: string;
    mingStars: string[];
    mingZhu: string;
    shenZhu: string;
  };
  digest: {
    headline: string;
    pointCount: number;
    advice: { key: AdviceKey; label: string; headline: string }[];
  };
  /** 研究者自己的备注 */
  note: string;
}

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function signature(birth: BirthInfo): string {
  return `${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.gender}-${birth.city ?? ''}`;
}

/** 从一张现算的盘蒸馏一条可存的研究记录 */
export function makeRecord(birth: BirthInfo, chart: ZiweiChart): ReadingRecord {
  const mingPalace = chart.palaces.find((p) => p.name.includes('命'));
  const mingStars = (mingPalace?.stars ?? []).filter((s) => s.type === 'major').map((s) => s.name);
  const points = buildReading(chart);
  const advice = buildAdvice(chart);

  // 命宫那一层的判语就是「一句话定调」；取不到就退回第一条判据
  const mingPoint = points.find((p) => p.title.includes('命宫')) ?? points[0];

  return {
    id: signature(birth),
    savedAt: new Date().toISOString(),
    hits: 1,
    birth: { ...birth },
    meta: {
      lunar: chart.lunarInfo ? `${chart.lunarInfo.lunarYear}年${chart.lunarInfo.lunarMonth}月${chart.lunarInfo.lunarDay}日` : '—',
      ju: chart.wuxingJuName,
      mingBranch: BRANCH[chart.mingGongBranch] ?? '—',
      mingPalace: mingPalace?.name ?? '命宫',
      mingStars: mingStars.length ? mingStars : ['空宫'],
      mingZhu: chart.mingZhu ?? '—',
      shenZhu: chart.shenZhu ?? '—',
    },
    digest: {
      headline: mingPoint?.reading ?? '（这张盘未取到命宫判语）',
      pointCount: points.length,
      advice: advice.map((a) => ({ key: a.key, label: a.label, headline: a.headline })),
    },
    note: '',
  };
}

export function listRecords(): ReadingRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ReadingRecord[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && r.birth && r.meta && r.digest)
      .sort((a, b) => (b.savedAt > a.savedAt ? 1 : -1));
  } catch {
    return [];
  }
}

function writeAll(records: ReadingRecord[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records.slice(0, CAP)));
  } catch {
    // 配额满 / 隐私模式：静默失败，绝不因此打断解盘
  }
}

/**
 * 落库：同一生辰只留一条，重推则更新摘要并把次数 +1
 * 返回「这是第几次推演」——第一次是新建，第二次起是复盘。
 */
export function saveRecord(record: ReadingRecord): number {
  const all = listRecords();
  const idx = all.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    const hits = (all[idx].hits ?? 1) + 1;
    all[idx] = { ...record, hits, note: all[idx].note };
    writeAll(all.sort((a, b) => (b.savedAt > a.savedAt ? 1 : -1)));
    return hits;
  }
  writeAll([record, ...all]);
  return 1;
}

export function deleteRecord(id: string): ReadingRecord[] {
  const all = listRecords().filter((r) => r.id !== id);
  writeAll(all);
  return all;
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 同上
  }
}

export function updateNote(id: string, note: string): ReadingRecord[] {
  const all = listRecords().map((r) => (r.id === id ? { ...r, note } : r));
  writeAll(all);
  return all;
}

export function exportAsJson(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), count: listRecords().length, records: listRecords() }, null, 2);
}

export function exportAsCsv(): string {
  const head = ['推演时间', '次数', '公历', '农历', '性别', '城市', '五行局', '命宫支', '命宫主星', '命主', '身主', '判据条数', '六维', '备注'];
  const rows = listRecords().map((r) => [
    r.savedAt, String(r.hits ?? 1),
    `${r.birth.year}-${String(r.birth.month).padStart(2, '0')}-${String(r.birth.day).padStart(2, '0')} ${String(r.birth.hour).padStart(2, '0')}时`,
    r.meta.lunar, r.birth.gender === 'female' ? '女' : '男', r.birth.city ?? '', r.meta.ju,
    r.meta.mingBranch, r.meta.mingStars.join('/'), r.meta.mingZhu, r.meta.shenZhu,
    String(r.digest.pointCount),
    r.digest.advice.map((a) => `${a.label}:${a.headline}`).join(' | '),
    (r.note ?? '').replace(/[\r\n]+/g, ' '),
  ]);
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [head.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
}
