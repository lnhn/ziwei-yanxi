/**
 * 研习区布局 —— 统一套用 ZenShell（左导航 + 宣纸底）
 */

import type { ReactNode } from 'react';
import ZenShell from '@/components/study/ZenShell';

export const metadata = {
  title: '紫微研习 · 观天察地修人',
  description: '紫微斗数研习台：今日一星、手工推演七步判分、解盘分析。',
};

export default function StudyLayout({ children }: { children: ReactNode }) {
  return <ZenShell>{children}</ZenShell>;
}
