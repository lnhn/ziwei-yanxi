'use client';

/**
 * 设置弹窗 + 全局开关
 *
 * 为什么要上下文而不用页面：
 *   设置要在「不起盘、不跳页」的前提下打开 —— 解盘页正对着盘面调口径，
 *   跳走一趟就丢了当前盘。所以弹窗挂在 ZenShell 外层，任何页面点一下就能开。
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { PAPER_COLORS as C } from './paper';
import { FONT, T } from './type';
import SettingsPanel, { type SettingsTab } from './SettingsPanel';

interface SettingsApi {
  open: (tab?: SettingsTab) => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<SettingsApi>({ open: () => {}, close: () => {}, isOpen: false });

/** 页面里拿它开弹窗：const { open } = useSettings(); open('prompts') */
export function useSettings(): SettingsApi {
  return useContext(Ctx);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>('ai');

  const open = useCallback((t: SettingsTab = 'ai') => {
    setTab(t);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && <SettingsModal tab={tab} onClose={close} />}
    </Ctx.Provider>
  );
}

function SettingsModal({ tab, onClose }: { tab: SettingsTab; onClose: () => void }) {
  // Esc 关闭 + 打开时锁背景滚动，关掉还原
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(30,42,50,0.32)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(12px, 3vh, 40px) clamp(12px, 3vw, 32px)',
        animation: 'zwFadeIn .16s ease-out',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 940, maxHeight: '100%',
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
          boxShadow: '0 18px 50px rgba(30,42,50,0.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'zwRiseIn .18s ease-out',
        }}
      >
        {/* 头 */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '20px 24px 14px', borderBottom: `1px solid ${C.line}`, flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT.display, fontSize: T.h2, fontWeight: 700, letterSpacing: '0.14em', color: C.ink,
            }}>设置</div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: C.ink3, lineHeight: 1.7, letterSpacing: '0.04em' }}>
              解盘模型与提示词都在这里改 · 存本机，不上传
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            style={{
              width: 30, height: 30, borderRadius: 7, cursor: 'pointer',
              background: C.paper, border: `1px solid ${C.line}`, color: C.ink2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 体 */}
        <div style={{ padding: '18px 24px 26px', overflowY: 'auto', flex: 1 }}>
          <SettingsPanel initialTab={tab} />
        </div>
      </div>
    </div>
  );
}
