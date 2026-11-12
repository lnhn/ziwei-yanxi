/**
 * 《紫微斗数全书》文字版（公版原文，四卷全）
 *
 * 与同目录的 mingban.ts 分工：
 *   mingban.ts   —— 明刊本影印件（225 页图片，无文字层，只能翻页，用于校勘与看原版版式）
 *   本文件        —— 同一部书的文字版：卷首序文 + 卷一 17 篇 + 卷二 102 篇 + 卷三 7 篇，
 *                   共 1832 段、约 6.7 万字，可全文检索、可挂白话。
 * 两者互为对照，谁也不是谁的替代品。
 */

import type { Book } from '../types';
import { QUANSHU_VOLUMES } from './quanshu-yuanwen';
import { QUANSHU_PLAIN } from './quanshu-baihua';

const chapters = QUANSHU_VOLUMES.flatMap((v) =>
  v.chapters.map((c) => {
    const clean = c.title.replace(/\s*（续\s*\d+）$/, '');
    const title = v.name === '卷首' ? (clean === '卷首' ? '序文' : clean) : `${v.name} · ${clean}`;
    const plain = QUANSHU_PLAIN[v.name === '卷首' && clean === '卷首' ? '序文' : clean];
    return {
      ...c,
      title,
      subtitle: plain,
    };
  }),
);

export const ziWeiQuanShuText: Book = {
  title: '紫微斗数全书（文字版）',
  slug: 'quanshu-yuanwen',
  dynasty: '明刊本 · 原文',
  author: '陈希夷 撰',
  intro:
    '四卷全本文字版：序文、卷一赋论、卷二安星诀、卷三断法。公版原文，无近代校注，可全文检索，可点（或 AI 生成）白话。',
  wordCount: chapters.reduce((s, c) => s + c.paragraphs.reduce((n, p) => n + p.text.length, 0), 0),
  chapters,
};
