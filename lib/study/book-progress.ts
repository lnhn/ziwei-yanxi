/**
 * 古籍阅读进度（本机）
 *
 * 只存「读到哪一章」，不存正文：正文永远从数据里读，进度只是指路牌。
 * 键带版本号；网页与桌面版（WebView2）共用 localStorage，不需要额外权限。
 */

const KEY = 'zw.bookProgress.v1';

export interface BookProgress {
  /** book slug */
  book: string;
  chapterIdx: number;
  chapterTitle: string;
  /** 章内段序号（用于回到原位，暂只记章） */
  paragraphIdx?: number;
  at: string;
}

type Store = Record<string, BookProgress>;

function readAll(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as Store;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function saveBookProgress(p: Omit<BookProgress, 'at'>): void {
  try {
    const all = readAll();
    all[p.book] = { ...p, at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // 隐私模式 / 配额满：只是一个便利，不该打断阅读
  }
}

export function loadBookProgress(book: string): BookProgress | null {
  return readAll()[book] ?? null;
}

export function listBookProgress(): BookProgress[] {
  return Object.values(readAll()).sort((a, b) => (b.at > a.at ? 1 : -1));
}
