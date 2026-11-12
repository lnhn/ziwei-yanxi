/**
 * 根路径 —— 直接进研习首页
 *
 * 「禅易 ZenYi」的形态是打开即研习首页，不是一张落地大屏。
 * 原来那张暗色星空落地页已不再作为入口（源码仍在 git 历史里，需要可回滚：
 *   git show e6df3df:app/page.tsx > app/page.tsx
 * ）
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/study');
}
