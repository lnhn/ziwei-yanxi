/**
 * 讲义检索：在《天纪》讲义全文里做子串匹配。
 *
 * 与 searchClassics 同口径：不分词、中文子串、上下文各 40 字、结果带 <mark>。
 */

import { LECTURES } from './tianji';

export type LectureHit = {
  lectureIdx: number;
  lectureNo: number;
  lectureName: string;
  paragraphIndex: number;
  snippet: string;
  text: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function searchLectures(query: string, limit = 40): LectureHit[] {
  const q = query.trim();
  if (!q) return [];

  const hits: LectureHit[] = [];
  LECTURES.forEach((lec, idx) => {
    lec.paragraphs.forEach((p, pi) => {
      const at = p.indexOf(q);
      if (at < 0) return;
      const start = Math.max(0, at - 40);
      const end = Math.min(p.length, at + q.length + 40);
      hits.push({
        lectureIdx: idx + 1,
        lectureNo: lec.no,
        lectureName: lec.name,
        paragraphIndex: pi,
        snippet:
          (start > 0 ? '…' : '') +
          escapeHtml(p.slice(start, at)) +
          `<mark>${escapeHtml(p.slice(at, at + q.length))}</mark>` +
          escapeHtml(p.slice(at + q.length, end)) +
          (end < p.length ? '…' : ''),
        text: p,
      });
    });
  });
  return hits.slice(0, limit);
}
