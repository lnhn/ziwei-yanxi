/**
 * 自备 TXT 古籍 —— 本机导入与解析
 *
 * 为什么放 localStorage 而不是落库：
 *   这是静态导出的桌面/网页双端应用，没有服务端；用户自己导的 txt 属于私人物料，
 *   存在本机、删得干净，比上传到某处更符合读书人的习惯。
 *
 * 解析策略（古籍 txt 的常见形态）：
 *   一行一段，标题行单独成行（短、无句读、常以 卷/篇/章/回/赋/论/诀/歌 结尾或开头）。
 *   识别不到的短行会被当成标题的续行，避免把「太微赋」的一半当成正文。
 */

export interface TxtChapter {
  title: string;
  paragraphs: string[];
}

export interface TxtBook {
  id: string;
  title: string;
  createdAt: number;
  chars: number;
  chapters: TxtChapter[];
}

export const TXT_STORAGE_KEY = 'zw.txtbooks.v1';

const HEAD_START = /^(?:卷|第\s*[一二三四五六七八九十百零〇0-9]+|序|叙|跋|附|附录|目次|目录)/;
const HEAD_END = /(?:赋|论|诀|歌|篇|章|叙|序|传|记|卷|回|节|纪要)$/;

function isHeading(line: string, next?: string): boolean {
  const t = line.trim();
  if (!t || t.length > 22) return false;
  if (/[，。；：、？！“”"'（）()]/.test(t)) return false;
  if (HEAD_START.test(t) || HEAD_END.test(t)) {
    // 标题后面一般跟着正文，且比标题长
    if (next && next.length <= t.length + 2) return false;
    return true;
  }
  return false;
}

/** 把一段纯文本拆成「章 / 段」结构 */
export function parseTxt(raw: string, fallbackTitle = '未命名'): { title: string; chapters: TxtChapter[] } {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const chapters: TxtChapter[] = [];
  let title = fallbackTitle;
  let cur: TxtChapter = { title: '正文', paragraphs: [] };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const next = lines[i + 1]?.trim();
    if (isHeading(line, next)) {
      if (cur.paragraphs.length) chapters.push(cur);
      cur = { title: line, paragraphs: [] };
      continue;
    }
    cur.paragraphs.push(line);
  }
  if (cur.paragraphs.length) chapters.push(cur);

  // 书名以用户填写的为准；没填就用兜底名，不拿首行标题冒充书名
  return { title, chapters: chapters.length ? chapters : [{ title: '正文', paragraphs: [] }] };
}

export function countChars(chapters: TxtChapter[]): number {
  return chapters.reduce((s, c) => s + c.paragraphs.reduce((n, p) => n + p.length, 0), 0);
}

export function listTxtBooks(): TxtBook[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TXT_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as TxtBook[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveTxtBook(book: TxtBook): TxtBook[] {
  const list = [book, ...listTxtBooks().filter((b) => b.id !== book.id)];
  try {
    window.localStorage.setItem(TXT_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* 存储满时静默降级：本书本次会话仍可读 */
  }
  return list;
}

export function removeTxtBook(id: string): TxtBook[] {
  const list = listTxtBooks().filter((b) => b.id !== id);
  try {
    window.localStorage.setItem(TXT_STORAGE_KEY, JSON.stringify(list));
  } catch { /* 忽略 */ }
  return list;
}

export function makeTxtBookId(): string {
  return `t${Date.now().toString(36)}`;
}
