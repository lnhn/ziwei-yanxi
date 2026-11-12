/**
 * 起盘页 ↔ 解盘页的接盘参数
 *
 * 为什么要单独一层：排盘与解盘是两步，但不是两个任务。
 * 用户在 /chart 起完盘，接着要做的就是解这张盘 —— 不该回到解盘页再填一遍生辰
 * （填两遍既啰嗦，还容易前后不一致，解出来的东西对不上）。
 *
 * 所以起盘后把「这张盘的成因」编码进 query，解盘页读到就直接起同一张盘。
 * 只传成因（年月日时、性别、出生地），不传结果 —— 盘永远由内核现算，
 * 避免两边算法版本不同步时出现「同一生辰两张盘」。
 */

import type { BirthInfo } from '@/lib/ziwei/types';

/** 起盘成因 → query 串（不含问号） */
export function chartQuery(info: BirthInfo): string {
  const q = new URLSearchParams();
  q.set('y', String(info.year));
  q.set('m', String(info.month));
  q.set('d', String(info.day));
  q.set('h', String(info.hour));
  q.set('g', info.gender === 'female' ? 'f' : 'm');
  if (info.city) q.set('c', info.city);
  if (typeof info.longitude === 'number') q.set('lon', String(info.longitude));
  return q.toString();
}

/** 解盘页的接盘链接 */
export function interpretHref(info: BirthInfo): string {
  return `/study/interpret?${chartQuery(info)}`;
}

function int(v: string | null, min: number, max: number): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n);
}

/**
 * 从 query 还原成起盘成因。缺项或越界时返回 null —— 宁可让用户看见起盘表单，
 * 也不要拿半套参数起一张不知从哪来的盘。
 */
export function readChartQuery(search: string): BirthInfo | null {
  const q = new URLSearchParams(search);
  const year = int(q.get('y'), 1900, 2100);
  const month = int(q.get('m'), 1, 12);
  const day = int(q.get('d'), 1, 31);
  const hour = int(q.get('h'), 0, 11);
  if (year === null || month === null || day === null || hour === null) return null;
  const g = q.get('g');
  const gender: BirthInfo['gender'] = g === 'f' ? 'female' : 'male';
  const city = q.get('c') ?? '';
  const lonRaw = q.get('lon');
  const lon = lonRaw !== null && Number.isFinite(Number(lonRaw)) ? Number(lonRaw) : undefined;
  return {
    year, month, day, hour, gender,
    ...(city ? { city } : {}),
    ...(typeof lon === 'number' ? { longitude: lon } : {}),
  };
}
