'use client';

/**
 * 皮肤 Provider —— 只管一件事：把 html[data-skin] 换成用户选的那套
 *
 * 色值不在 JS 里，全在 globals.css。这里只写一个属性，Animate 由 CSS 自己
 * 做（html/body 上有 0.22s 的颜色过渡）。首帧防闪在 app/layout.tsx 的内联
 * 脚本里，比 Provider 早，所以不会先亮后暗。
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SKIN_ID, SKIN_STORAGE_KEY, getSkin, isSkinId, type Skin } from './themes';

type SkinCtx = {
  skin: Skin;
  skinId: string;
  setSkinId: (id: string) => void;
};

const Ctx = createContext<SkinCtx>({
  skin: getSkin(DEFAULT_SKIN_ID),
  skinId: DEFAULT_SKIN_ID,
  setSkinId: () => {},
});

function apply(id: string) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-skin', id);
  // 旧落地页按 data-theme 判断亮暗，跟着一起改，免得两套打架
  el.setAttribute('data-theme', getSkin(id).mode === 'dark' ? 'dark' : 'light');
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skinId, setSkinIdState] = useState<string>(DEFAULT_SKIN_ID);

  // 首帧之后再读 localStorage：初始 state 直接读会和内联脚本的结果撞车
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(SKIN_STORAGE_KEY); } catch { /* 隐私模式忽略 */ }
    const id = isSkinId(saved) ? (saved as string) : DEFAULT_SKIN_ID;
    setSkinIdState(id);
    apply(id);
  }, []);

  const setSkinId = useCallback((id: string) => {
    if (!isSkinId(id)) return;
    setSkinIdState(id);
    apply(id);
    try { window.localStorage.setItem(SKIN_STORAGE_KEY, id); } catch { /* 同上 */ }
  }, []);

  return <Ctx.Provider value={{ skin: getSkin(skinId), skinId, setSkinId }}>{children}</Ctx.Provider>;
}

export function useSkin() {
  return useContext(Ctx);
}
