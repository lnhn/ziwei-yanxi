/**
 * 练习进度（本地存储）
 *
 * 只存“结果统计”，不存用户的生辰数据 —— 命盘属于隐私，练习盘一律用系统随机生成。
 * 统计口径：每一步的正确次数 / 作答次数，用于算薄弱环节。
 */

export const PROGRESS_KEY = 'zw.practice.v1';

export interface PracticeProgress {
  runs: number;                        // 完成过的盘数
  stepOk: number[];                    // 每步正确次数（7 步）
  stepTotal: number[];                 // 每步作答次数（7 步）
  wrongTotal: number;                  // 累计错项
  fullPass: number;                    // 七步全对的盘数
  recent: { at: string; score: number }[]; // 最近 10 盘的得分
}

export const EMPTY_PROGRESS: PracticeProgress = {
  runs: 0,
  stepOk: Array(7).fill(0),
  stepTotal: Array(7).fill(0),
  wrongTotal: 0,
  fullPass: 0,
  recent: [],
};

export function loadProgress(): PracticeProgress {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const p = JSON.parse(raw) as Partial<PracticeProgress>;
    const ok = Array.isArray(p.stepOk) ? p.stepOk.slice(0, 7) : [];
    const total = Array.isArray(p.stepTotal) ? p.stepTotal.slice(0, 7) : [];
    return {
      runs: p.runs ?? 0,
      stepOk: Array.from({ length: 7 }, (_, i) => ok[i] ?? 0),
      stepTotal: Array.from({ length: 7 }, (_, i) => total[i] ?? 0),
      wrongTotal: p.wrongTotal ?? 0,
      fullPass: p.fullPass ?? 0,
      recent: Array.isArray(p.recent) ? p.recent.slice(-10) : [],
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

/** 记录一次完整练习的结果 */
export function saveRun(results: boolean[]): PracticeProgress {
  const prev = loadProgress();
  const next: PracticeProgress = {
    runs: prev.runs + 1,
    stepOk: prev.stepOk.map((v, i) => v + (results[i] ? 1 : 0)),
    stepTotal: prev.stepTotal.map((v, i) => v + 1),
    wrongTotal: prev.wrongTotal + results.filter((r) => !r).length,
    fullPass: prev.fullPass + (results.every(Boolean) ? 1 : 0),
    recent: [...prev.recent, { at: new Date().toISOString(), score: results.filter(Boolean).length }].slice(-10),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    } catch {
      /* 存储满/被禁用时忽略，不影响练习 */
    }
  }
  return next;
}

export const STEP_LABELS = [
    '农历换算',
  '定命宫',
  '定五行局',
  '安紫微',
  '安天府',
  '定身宫',
  '起四化',
] as const;

/** 正确率最低的一步（作答次数 ≥ 1） */
export function weakestStep(p: PracticeProgress): { index: number; label: string; rate: number } | null {
  let best: { index: number; label: string; rate: number } | null = null;
  p.stepTotal.forEach((total, i) => {
    if (total < 1) return;
    const rate = p.stepOk[i] / total;
    if (!best || rate < best.rate) best = { index: i, label: STEP_LABELS[i], rate };
  });
  return best;
}
