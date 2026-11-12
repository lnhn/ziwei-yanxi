'use client';

/**
 * 研习区通用组件 —— 全站唯一的一套「壳内元件」
 *
 * 2026-11 统一版：
 *   PageHead 统一页头（面包屑 + 标题 27 + 摘要 + 右侧主操作 + 发丝线）；
 *   Section 统一分节（编号/眉标 + 分节标题 19 + 右侧次要操作）；
 *   Card / ListRow / Empty / Banner / Badge 承载列表与空态；
 *   Btn 三档（primary 主操作、默认次级、quiet 轻量），焦点态走 globals.css 的 :focus-visible。
 *   所有颜色一律走 paper.ts 的 CSS 变量，深浅皮肤共用同一套尺寸。
 */

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { FONT, T, SHAPE, TRACK, SPACE } from '@/components/study/type';

/* ─────────────────────────── 页头 ─────────────────────────── */

export type Crumb = { href?: string; label: string };

export function PageHead({ title, desc, kicker, aside, crumbs, actions, tight }: {
  title: string; desc?: string; kicker?: string; aside?: ReactNode;
  crumbs?: Crumb[]; actions?: ReactNode; tight?: boolean;
}) {
  return (
    <header style={{ marginBottom: tight ? 20 : 28 }}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="面包屑" style={{
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          fontSize: T.sub, color: C.ink3, marginBottom: 12,
        }}>
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ opacity: 0.5 }}>/</span>}
              {c.href
                ? <Link href={c.href} style={{ color: C.ink3, textDecoration: 'none' }}>{c.label}</Link>
                : <span style={{ color: C.ink2 }}>{c.label}</span>}
            </span>
          ))}
        </nav>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          {kicker && (
            <div style={{ fontSize: T.eyebrow, letterSpacing: TRACK.eyebrow, color: C.ink3, marginBottom: 8 }}>
              {kicker}
            </div>
          )}
          <h1 style={{
            fontFamily: FONT.display, fontSize: T.display, fontWeight: 700,
            letterSpacing: TRACK.title, margin: 0, lineHeight: 1.3, color: C.ink,
          }}>{title}</h1>
          {desc && (
            <p style={{
              margin: '10px 0 0', fontSize: T.body, color: C.ink2, lineHeight: LH_UI,
              letterSpacing: TRACK.body, maxWidth: 700,
            }}>{desc}</p>
          )}
        </div>
        {(actions || aside) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {actions ?? aside}
          </div>
        )}
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg, ${C.line}, transparent)`, marginTop: 18 }} />
    </header>
  );
}

const LH_UI = 1.8;

/* ─────────────────────────── 分节 ─────────────────────────── */

export function Section({ title, hint, aside, index, children, style }: {
  title: string; hint?: string; aside?: ReactNode; index?: string | number; children?: ReactNode; style?: CSSProperties;
}) {
  return (
    <section style={{ marginTop: SPACE.block, ...style }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          {index !== undefined && (
            <span style={{ fontFamily: FONT.mono, fontSize: T.sub, color: C.gold, fontVariantNumeric: 'tabular-nums' }}>{index}</span>
          )}
          <h2 style={{
            fontFamily: FONT.display, fontSize: T.h2, fontWeight: 700, letterSpacing: '0.05em',
            margin: 0, color: C.ink, lineHeight: 1.4,
          }}>{title}</h2>
          {hint && <span style={{ fontSize: T.sub, color: C.ink3 }}>{hint}</span>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ─────────────────────────── 卡片 / 列表 ─────────────────────────── */

export function Card({ children, style, dense }: { children: ReactNode; style?: CSSProperties; dense?: boolean }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
      padding: dense ? '16px 18px' : '20px 22px', boxShadow: SHAPE.shadowCard, ...style,
    }}>{children}</div>
  );
}

export function ListRow({ title, meta, aside, href, onClick, active }: {
  title: ReactNode; meta?: ReactNode; aside?: ReactNode; href?: string; onClick?: () => void; active?: boolean;
}) {
  const inner = (
    <>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: T.body, color: C.ink, letterSpacing: TRACK.body, lineHeight: 1.6 }}>{title}</div>
        {meta && <div style={{ fontSize: T.sub, color: C.ink3, marginTop: 4, lineHeight: 1.6 }}>{meta}</div>}
      </div>
      {aside && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{aside}</div>}
    </>
  );
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '12px 14px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none', fontFamily: 'inherit',
    background: active ? mix(C.gold, 7) : 'transparent',
    border: `1px solid ${active ? mix(C.gold, 30) : 'transparent'}`,
    textAlign: 'left', cursor: onClick || href ? 'pointer' : 'default',
  };
  if (href) return <Link href={href} style={style}>{inner}</Link>;
  if (onClick) return <button type="button" className="zw-row" onClick={onClick} style={style}>{inner}</button>;
  return <div className="zw-row" style={style}>{inner}</div>;
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div style={{
      padding: '30px 24px', textAlign: 'center', border: `1px dashed ${C.line}`,
      borderRadius: SHAPE.radiusCard, background: C.paper,
    }}>
      <div style={{ fontSize: T.bodyLg, color: C.ink2, letterSpacing: TRACK.title, marginBottom: 8 }}>{title}</div>
      {desc && <div style={{ fontSize: T.sub, color: C.ink3, lineHeight: 1.8 }}>{desc}</div>}
      {action && <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  );
}

/** 提示条：info 走墨蓝，warn 走朱砂，success 走金 */
export function Banner({ tone = 'info', title, children }: {
  tone?: 'info' | 'warn' | 'success'; title?: string; children: ReactNode;
}) {
  const color = tone === 'warn' ? C.cinnabar : tone === 'success' ? C.gold : C.navy;
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '11px 14px', borderRadius: SHAPE.radiusBtn,
      background: mix(color, 6), border: `1px solid ${mix(color, 22)}`,
      borderLeft: `3px solid ${color}`,
    }}>
      {title && <span style={{ fontSize: T.micro, color, letterSpacing: TRACK.label, flexShrink: 0, paddingTop: 2 }}>{title}</span>}
      <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'seal' | 'navy' }) {
  const color = tone === 'gold' ? C.gold : tone === 'seal' ? C.cinnabar : tone === 'navy' ? C.navy : C.ink3;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 10,
      fontSize: T.micro, letterSpacing: '0.06em', color,
      background: mix(color, 8), border: `1px solid ${mix(color, 22)}`, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/* ─────────────────────────── 按钮 ─────────────────────────── */

type BtnProps = {
  children: ReactNode; onClick?: () => void; href?: string;
  primary?: boolean; quiet?: boolean; danger?: boolean;
  disabled?: boolean; size?: 'sm' | 'md'; style?: CSSProperties; title?: string;
  /** 表单里的提交按钮：传 true 才渲染 type="submit" */
  submit?: boolean;
};

export function Btn({ children, onClick, href, primary, quiet, danger, disabled, size = 'md', style, title, submit }: BtnProps) {
  const color = danger ? C.cinnabar : primary ? C.paper : C.ink2;
  const pad = size === 'sm' ? '6px 12px' : '9px 18px';
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: pad, borderRadius: SHAPE.radiusBtn,
    fontSize: size === 'sm' ? T.sub : T.nav, letterSpacing: '0.03em',
    fontFamily: FONT.sans, lineHeight: 1.4, whiteSpace: 'nowrap',
    cursor: disabled ? 'not-allowed' : 'pointer', textDecoration: 'none',
    transition: 'background .15s ease, border-color .15s ease',
    // 主操作用「墨底纸字」：亮皮是深墨、暗皮是浅墨，两种皮上都成立
    background: primary ? C.ink : quiet ? 'transparent' : C.card,
    color: primary ? C.paper : color,
    border: `1px solid ${primary ? C.ink : quiet ? 'transparent' : C.line}`,
    opacity: disabled ? 0.45 : 1,
    ...style,
  };
  if (href && !disabled) return <Link href={href} className="zw-btn" style={base}>{children}</Link>;
  return (
    <button type={submit ? 'submit' : 'button'} className="zw-btn" title={title} onClick={onClick} disabled={disabled} style={base}>
      {children}
    </button>
  );
}

export function Chip({ children, active, onClick }: { children: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="zw-chip"
      onClick={onClick}
      style={{
        padding: '6px 13px', borderRadius: SHAPE.radiusChip, fontSize: T.sub, cursor: 'pointer', fontFamily: FONT.sans,
        background: active ? mix(C.gold, 12) : 'transparent',
        color: active ? C.ink : C.ink2,
        border: `1px solid ${active ? mix(C.gold, 45) : C.line}`,
        transition: 'border-color .15s ease, background .15s ease',
      }}
    >{children}</button>
  );
}

/* ─────────────────────────── 表单 ─────────────────────────── */

export function Field({ label, hint, error, children, style }: {
  label: string; hint?: string; error?: string; children: ReactNode; style?: CSSProperties;
}) {
  return (
    <label style={{ display: 'block', ...style }}>
      <span style={{
        display: 'block', fontSize: T.sub, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 6,
      }}>{label}</span>
      {children}
      {hint && !error && <span style={{ display: 'block', fontSize: T.micro, color: C.ink3, marginTop: 6 }}>{hint}</span>}
      {error && <span style={{ display: 'block', fontSize: T.micro, color: C.cinnabar, marginTop: 6 }}>{error}</span>}
    </label>
  );
}

export function Select({ value, onChange, placeholder, options, minWidth = 110, ariaLabel }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: (string | number)[]; minWidth?: number; ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel ?? placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="zw-field zw-select"
      style={{
        padding: '9px 13px', fontSize: T.nav, fontFamily: FONT.sans, borderRadius: SHAPE.radiusBtn,
        border: `1px solid ${C.line}`, background: C.card, color: value ? C.ink : C.ink3, minWidth,
        outline: 'none', paddingRight: 32,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={String(o)}>{String(o)}</option>)}
    </select>
  );
}

/** 只读的「事实行」：日期、干支这类，统一等宽数字 */
export function FactRow({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div style={{ display: 'flex', gap: '6px 20px', flexWrap: 'wrap', alignItems: 'baseline' }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: T.sub, color: C.ink3 }}>{it.label}</span>
          <span style={{
            fontSize: T.body, color: C.ink, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em',
          }}>{it.value}</span>
        </span>
      ))}
    </div>
  );
}
