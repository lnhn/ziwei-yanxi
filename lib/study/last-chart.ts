/**
 * 上一次起盘的生辰（只存成因，不存结果）
 *
 * 为什么要存：解盘是接着排盘做的。用户从 /chart 出去、再回解盘页，如果必须重填一遍，
 * 既啰嗦，也容易填错一位数字得到另一张盘 —— 然后对着错的盘讨论半天。
 *
 * 存成因而不是存盘：盘永远由内核现算，避免内核升级后「旧结果」和「新算法」打架。
 * 键带版本号，将来字段变了直接换键，不做迁移。
 */

import type { BirthInfo } from '@/lib/ziwei/types';

const KEY = 'zw.lastBirth.v1';

export function saveLastBirth(info: BirthInfo): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(info));
  } catch {
    // 隐私模式 / 配额满时静默失败：这只是一个便利，不该影响解盘本身
  }
}

export function loadLastBirth(): BirthInfo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<BirthInfo>;
    const year = Number(v.year), month = Number(v.month), day = Number(v.day), hour = Number(v.hour);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour)) return null;
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 11) return null;
    return {
      year, month, day, hour,
      gender: v.gender === 'female' ? 'female' : 'male',
      ...(typeof v.city === 'string' && v.city ? { city: v.city } : {}),
      ...(typeof v.longitude === 'number' ? { longitude: v.longitude } : {}),
    };
  } catch {
    return null;
  }
}
