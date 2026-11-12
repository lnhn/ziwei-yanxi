'use client';

/**
 * ZenShell —— 研习区外壳（参照「禅易 ZenYi」的左导航 + 内容区结构）
 *
 * 设计约定：
 *  - 宣纸底（#FAF7F0）+ 白卡片 + 墨蓝文字 + 金线分隔，与现有暗色落地页互不干扰；
 *  - 色值全部写死，不依赖 globals.css 的主题变量，避免被 data-theme 覆盖；
 *  - 只负责「壳」，各页面自己渲染内容。
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PAPER_COLORS } from './paper';
import { FONT } from './type';
import { SettingsProvider, useSettings } from './settings-context';
import { SkinProvider, useSkin } from './skin-context';
import { SKINS } from './themes';

// 色板放在 paper.ts（非客户端模块），服务端页面也能拿到真值。
const C = PAPER_COLORS;

/** 外壳配色覆盖：暗色页面把整条侧栏一起沉下去，不做「亮栏配暗台」的半调子 */
export type ShellTone = { [K in keyof typeof PAPER_COLORS]?: string };

type NavItem = { href: string; label: string; icon: IconName; soon?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: '研习',
    items: [
      { href: '/study', label: '研习首页', icon: 'home' },
      { href: '/study/practice', label: '手工推演', icon: 'compass' },
      { href: '/knowledge', label: '星曜知识', icon: 'book' },
      { href: '/lectures', label: '倪师讲义', icon: 'pen' },
      { href: '/library', label: '古籍原典', icon: 'scroll' },
    ],
  },
  {
    title: '命盘',
    items: [
      { href: '/chart', label: '起盘排盘', icon: 'grid' },
              { href: '/study/learn', label: '入门学习', icon: 'book' },
      { href: '/cases', label: '命例实批', icon: 'book' },
      { href: '/history', label: '解盘历史', icon: 'chat' },
    ],
  },
  {
    title: '记录',
    items: [
      { href: '/study/notes', label: '研习手记', icon: 'note' },
    ],
  },
];

type IconName = 'home' | 'compass' | 'book' | 'scroll' | 'grid' | 'chat' | 'pen' | 'note' | 'gear';

/** 极简线性图标，避免引入图标库 */
function Icon({ name, color }: { name: IconName; color: string }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return (<svg {...common}><path d="M4 11.5 12 4l8 7.5" /><path d="M6.5 10.5V20h11V10.5" /></svg>);
    case 'compass':
      return (<svg {...common}><circle cx="12" cy="12" r="8" /><path d="M15.2 8.8l-2 4.4-4.4 2 2-4.4z" /></svg>);
    case 'book':
      return (<svg {...common}><path d="M5 5.5A1.5 1.5 0 016.5 4H19v16H6.5A1.5 1.5 0 015 18.5z" /><path d="M9 8h6M9 12h6" /></svg>);
    case 'scroll':
      return (<svg {...common}><path d="M6 4h10a2 2 0 012 2v12a2 2 0 01-2 2H6" /><path d="M6 4a2 2 0 00-2 2v12a2 2 0 002 2" /><path d="M9 9h6M9 13h4" /></svg>);
    case 'grid':
      return (<svg {...common}><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" /></svg>);
    case 'chat':
      return (<svg {...common}><path d="M20 12a7 7 0 01-7 7H7l-3 2.5V12a7 7 0 017-7h2a7 7 0 017 7z" /><path d="M9 11h6M9 14.5h4" /></svg>);
    case 'pen':
      return (<svg {...common}><path d="M4 20l4.5-1 9-9a2.1 2.1 0 00-3-3l-9 9z" /><path d="M14 7l3 3" /></svg>);
    case 'note':
      return (<svg {...common}><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>);
    case 'gear':
      return (<svg {...common}><circle cx="12" cy="12" r="3.2" /><path d="M12 3.2v2.2M12 18.6v2.2M4.6 7.9l1.9 1.1M17.5 15l1.9 1.1M4.6 16.1l1.9-1.1M17.5 9l1.9-1.1" /></svg>);
    default:
      return null;
  }
}

export default function ZenShell({ children, activeOverride, tone }: { children: ReactNode; activeOverride?: string; tone?: ShellTone }) {
  // 设置弹窗与皮肤切换都挂在外壳这一层：任何页面都能就地打开，不跳页、不丢当前盘面
  return (
    <SkinProvider>
      <SettingsProvider>
        <ShellInner activeOverride={activeOverride} tone={tone}>{children}</ShellInner>
      </SettingsProvider>
    </SkinProvider>
  );
}

function ShellInner({ children, activeOverride, tone }: { children: ReactNode; activeOverride?: string; tone?: ShellTone }) {
  const pathname = usePathname() || '/';
  const { open } = useSettings();
  const { skinId, setSkinId } = useSkin();
  // 传了 tone 就用覆盖后的色板，没传就跟随全局皮肤
  const C = tone ? { ...PAPER_COLORS, ...tone } : PAPER_COLORS;

  return (
    <div style={{
      minHeight: '100vh',
      background: C.paper,
      backgroundImage: 'var(--zw-sheen)',
      backgroundAttachment: 'fixed',
      color: C.ink,
      fontFamily: FONT.sans,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div className="flex min-h-screen zw-shell-row">
        {/* ─── 左侧导航（md 以上固定）───
            必须 sticky + 100vh：原来靠 flex 拉伸高度，页面越长侧栏越高，
            「设置」就被顶到整页最底下，滚到哪里都看不见。
            现在侧栏高度锁死视口高，只有中间 nav 区域自己滚动。 */}
        <aside
          className="hidden md:flex flex-col shrink-0"
          style={{
            width: 232,
            height: '100vh',
            position: 'sticky',
            top: 0,
            alignSelf: 'flex-start',
            overflow: 'hidden',
            background: C.paper,
            borderRight: `1px solid ${C.line}`,
          }}
        >
          {/* Logo：印章 + 字标，比旧版沉一点，是整屏的定盘星 */}
          <div style={{ padding: '24px 20px 18px' }}>
            <Link href="/study" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
              <span style={{
                width: 34, height: 34, borderRadius: 7, background: C.cinnabar,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT.serif, fontSize: 17, fontWeight: 700, color: '#FAF4E8', letterSpacing: 0,
                boxShadow: '0 2px 6px rgba(166,67,43,0.22)',
              }}>紫</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '0.1em', color: C.ink, lineHeight: 1.1 }}>紫微研习</span>
                <span style={{ fontFamily: FONT.sans, fontSize: 11, letterSpacing: '0.22em', color: C.ink3 }}>观天 · 察地 · 修人</span>
              </span>
            </Link>
          </div>

          {/* 搜索 */}
          <form action="/library/search" method="get" style={{ padding: '0 14px 14px' }}>
            <div className="zw-search" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
              background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
              transition: 'border-color .15s ease, box-shadow .15s ease',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth="2">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
              </svg>
              <input
                name="q"
                placeholder="搜索星曜 / 古籍"
                style={{
                  flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, color: C.ink, fontFamily: FONT.sans, letterSpacing: '0.02em',
                }}
              />
            </div>
          </form>

          {/* 导航组 */}
          <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 12px' }}>
            {NAV.map((group) => (
              <div key={group.title} style={{ marginTop: 16 }}>
                <div style={{
                  fontSize: 10.5, letterSpacing: '0.34em', color: C.ink3,
                  padding: '2px 10px 9px', fontWeight: 600,
                }}>
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const active = activeOverride ? item.href === activeOverride : pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="zw-nav-item"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 11px', marginBottom: 2, borderRadius: 9,
                        textDecoration: 'none', fontSize: 14, letterSpacing: '0.02em',
                        background: active ? C.card : 'transparent',
                        color: active ? C.ink : C.ink2,
                        fontWeight: active ? 600 : 400,
                        boxShadow: active ? '0 1px 2px rgba(30,42,50,0.06)' : 'none',
                        transition: 'background .15s ease, color .15s ease',
                      }}
                    >
                      <Icon name={item.icon} color={active ? C.gold : C.ink3} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {active && <span style={{ width: 5, height: 5, borderRadius: 5, background: C.gold }} />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* 设置 + 外观 + 天地人 说明 */}
          <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${C.line}`, flexShrink: 0 }}>
            {/* 皮肤切换：六格色卡，点一下整站换气，比进设置少两步 */}
            <div style={{ marginBottom: 11 }}>
              <div style={{
                fontSize: 10, letterSpacing: '0.28em', color: C.ink3,
                padding: '0 2px 7px', fontWeight: 600,
              }}>外观</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {SKINS.map((s) => {
                  const on = s.id === skinId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      title={`${s.label} · ${s.note}`}
                      aria-label={`切换到${s.label}`}
                      onClick={() => setSkinId(s.id)}
                      style={{
                        flex: 1, height: 26, padding: 0, cursor: 'pointer',
                        borderRadius: 6, position: 'relative',
                        background: `linear-gradient(135deg, ${s.swatch[0]} 0 58%, ${s.swatch[2]} 58% 100%)`,
                        border: `1px solid ${on ? C.gold : C.line}`,
                        boxShadow: on ? `0 0 0 2px color-mix(in srgb, ${C.gold} 26%, transparent)` : 'none',
                        transition: 'border-color .15s ease, box-shadow .15s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => open('ai')}
              className="zw-settings-btn"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 11px', marginBottom: 10, borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, letterSpacing: '0.02em', textAlign: 'left',
                background: C.card, color: C.ink, border: `1px solid ${C.line}`,
                transition: 'border-color .15s ease, box-shadow .15s ease',
              }}
            >
              <Icon name="gear" color={C.ink3} />
              <span style={{ flex: 1 }}>设置</span>
              <span style={{ fontSize: 11, color: C.ink3, letterSpacing: '0.06em' }}>模型 · 词 · 外观</span>
            </button>
            <div style={{ padding: '0 6px', fontSize: 11, lineHeight: 2, color: C.ink3, letterSpacing: '0.04em' }}>
              <div style={{ color: C.ink2 }}>天 · 命盘（本应用）</div>
              <div style={{ color: C.ink2 }}>地 · 地理与真太阳时</div>
              <div style={{ opacity: 0.55 }}>人 · 体质与病位（另立）</div>
            </div>
          </div>
        </aside>

        {/* ─── 右侧内容区 ─── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* 移动端顶部条 */}
          <div className="md:hidden" style={{ borderBottom: `1px solid ${C.line}`, background: C.paperDeep }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link href="/study" style={{ textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.12em', color: C.ink }}>
                紫微研习
              </Link>
              <span style={{ fontSize: 11.5, letterSpacing: '0.2em', color: C.ink3 }}>观天 · 察地 · 修人</span>
              <button
                type="button"
                onClick={() => open('ai')}
                aria-label="设置"
                style={{
                  width: 32, height: 32, borderRadius: 7, cursor: 'pointer',
                  background: C.card, border: `1px solid ${C.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="gear" color={C.ink2} />
              </button>
            </div>
            <div className="flex gap-1 overflow-x-auto" style={{ padding: '0 12px 10px' }}>
              {NAV.flatMap((g) => g.items).map((item) => {
                const active = activeOverride ? item.href === activeOverride : pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} style={{
                    whiteSpace: 'nowrap', textDecoration: 'none', fontSize: 13, padding: '6px 10px', borderRadius: 6,
                    background: active ? C.card : 'transparent', color: active ? C.ink : C.ink2,
                    border: `1px solid ${active ? C.line : 'transparent'}`,
                  }}>{item.label}</Link>
                );
              })}
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

