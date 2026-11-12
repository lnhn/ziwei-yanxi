/**
 * 字号密度 —— 紧凑 / 标准 / 舒展
 *
 * 只改字号与行高（CSS 变量见 app/globals.css 的 html[data-density] 三组），
 * 不改版式宽度、圆角、间距，所以换密度不会让盘面宫格重排。
 *
 * 默认怎么定：
 *   1. 用户手动选过 → 一直用它（存 zw.density.v1）。
 *   2. 没选过 → 按运行环境猜：桌面版（Tauri）在 125% 及以上的缩放屏上，
 *      15px 正文在一米视距下偏小，默认给「舒展」；网页版与 100% 缩放保持「标准」。
 * 猜出来的结果不落盘，所以以后接了大屏或换了缩放，仍在自动档上。
 */

export type DensityId = 'compact' | 'standard' | 'loose';

export type Density = {
  id: DensityId;
  label: string;
  /** 一句说明，设置页里直接显示 */
  note: string;
};

export const DENSITIES: Density[] = [
  {
    id: 'compact',
    label: '紧凑',
    note: '同一屏多出半屏内容，适合作对照、来回扫盘',
  },
  {
    id: 'standard',
    label: '标准',
    note: '默认档。正文 15px，界面与古籍的平衡点',
  },
  {
    id: 'loose',
    label: '舒展',
    note: '正文 17px、行距放宽，长时间读讲义与古籍用它',
  },
];

export const DENSITY_STORAGE_KEY = 'zw.density.v1';
export const DEFAULT_DENSITY: DensityId = 'standard';

export function isDensityId(v: unknown): v is DensityId {
  return v === 'compact' || v === 'standard' || v === 'loose';
}

/** URL 上的 ?density= 只用于对照截图与分享链接，优先级最高、不落盘 */
export function readUrlDensity(): DensityId | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.search.match(/[?&]density=(compact|standard|loose)\b/);
  return m ? (m[1] as DensityId) : null;
}

/** 读用户手动选过的值；没选过返回 null（表示仍在自动档） */
export function readSavedDensity(): DensityId | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return isDensityId(v) ? v : null;
  } catch {
    return null;
  }
}

/** 是否是桌面壳（Tauri 2 会挂 __TAURI_INTERNALS__，网页版没有） */
export function isDesktopShell(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

/**
 * 没有手动设定时按环境猜一档。
 * 桌面版 + devicePixelRatio ≥ 1.25 → 舒展；其余 → 标准。
 */
export function guessDensity(): DensityId {
  if (typeof window === 'undefined') return DEFAULT_DENSITY;
  const dpr = window.devicePixelRatio || 1;
  if (isDesktopShell() && dpr >= 1.25) return 'loose';
  return DEFAULT_DENSITY;
}

/** 当前应该用的密度：URL 参数 > 手动值 > 按环境猜 */
export function resolveDensity(): DensityId {
  return readUrlDensity() ?? readSavedDensity() ?? guessDensity();
}

/** 把密度写到 html[data-density]；CSS 那边的三组变量立刻接手 */
export function applyDensity(id: DensityId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-density', id);
}

/** 设置页里调用：写入并记住 */
export function saveDensity(id: DensityId): void {
  applyDensity(id);
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(DENSITY_STORAGE_KEY, id); } catch { /* 隐私模式忽略 */ }
}

/** 恢复自动档：清掉手动值，重新按环境猜一次 */
export function clearSavedDensity(): DensityId {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(DENSITY_STORAGE_KEY); } catch { /* 同上 */ }
  }
  const id = guessDensity();
  applyDensity(id);
  return id;
}
