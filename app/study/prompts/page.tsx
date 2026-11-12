'use client';

/**
 * /study/prompts —— 兼容旧链接的设置页
 *
 * 设置的主入口已经收进 ZenShell 的弹窗（侧栏「设置」、解盘页「设置」按钮）。
 * 这个路由保留，是为了旧链接、书签、以及想在新标签页里安静改口径的场景：
 * 内容与弹窗共用同一个 SettingsPanel，不会出现两套口径。
 *
 * 注意：外壳由 app/study/layout.tsx 提供，这里不要再套 ZenShell（否则会出现两条侧栏）。
 */

import SettingsPanel from '@/components/study/SettingsPanel';
import { Card, PageHead } from '@/components/study/ui';

export default function PromptsPage() {
  return (
    <div style={{ padding: '30px 28px 64px', maxWidth: 1040, margin: '0 auto' }}>
      <PageHead
        tight
        crumbs={[{ href: '/study', label: '研习' }, { label: '设置' }]}
        title="设置"
        desc="解盘模型、提示词、外观与排盘规则都在这里。也可以在任何页面点侧栏「设置」就地打开弹窗，不打断当前盘面。"
      />
      <Card>
        <SettingsPanel embedded />
      </Card>
    </div>
  );
}
