/**
 * 星曜知识库 · 汇总入口
 *
 * 三份分片按星曜顺序写入，这里合并成一张表，并给页面提供统一的取用接口。
 * 覆盖 14 主星 × 13 主题 = 182 条，取代被原作者留空的 STAR_DB。
 */

import { KB_PART_1, type StarTopicEntry } from './star-kb-1';
import { KB_PART_2 } from './star-kb-2';
import { KB_PART_3 } from './star-kb-3';
import type { TopicKey } from './db-analysis';
import { ALL_TOPICS } from '@/lib/seo/knowledge';
import { STAR_TO_SLUG, SLUG_TO_STAR, ALL_STARS } from '@/lib/seo/knowledge';

export type { StarTopicEntry };

export const KB_ENTRIES: Record<string, StarTopicEntry> = {
  ...KB_PART_1,
  ...KB_PART_2,
  ...KB_PART_3,
};

/** 这批文字的来路，页面上必须明说，不能冒充原作断语库 */
export const KB_SOURCE_NOTE =
  '本页为编者按三合派通行口诀整理，不是原作断语库，也不是古籍原文；' +
  '出处只标书名与篇名，可到「古籍原典」对照原文自辨。';

export function getKbEntry(star: string, topic: TopicKey): StarTopicEntry | undefined {
  const slug = STAR_TO_SLUG[star];
  if (!slug) return undefined;
  return KB_ENTRIES[`${slug}/${topic}`];
}

/** 已收录的 14×13 组合，用于 generateStaticParams 预渲染 */
export function getKbRoutes(): { star: string; slug: string; topic: TopicKey }[] {
  const out: { star: string; slug: string; topic: TopicKey }[] = [];
  for (const star of ALL_STARS) {
    const slug = STAR_TO_SLUG[star];
    for (const topic of ALL_TOPICS) {
      if (KB_ENTRIES[`${slug}/${topic}`]) out.push({ star, slug, topic });
    }
  }
  return out;
}

export function kbCount(): number {
  return Object.keys(KB_ENTRIES).length;
}

export { SLUG_TO_STAR };
