'use client';

/**
 * DensityBoot —— 挂载时把字号密度落到 html[data-density]
 *
 * 为什么还要这一个 effect：layout 的首帧脚本负责「不闪」，但它只在页面打开的那一刻
 * 跑一次；用户换了窗口缩放、把窗口拖到另一块屏，或从设置里改了密度，都需要再落一次。
 * 所以真正的口子放在这里：applyDensity 只管写属性，CSS 那边的三组变量立刻接手。
 *
 * 没手动选过（自动档）时，跟着 devicePixelRatio 变化重算一遍 ——
 * 桌面版在 125% 以上会给「舒展」，拖回 100% 就回到「标准」。
 */

import { useEffect } from 'react';
import { applyDensity, readSavedDensity, resolveDensity } from '@/components/study/density';

export default function DensityBoot() {
  useEffect(() => {
    applyDensity(resolveDensity());

    const reapply = () => {
      // 手动选过就不再跟着环境变；URL 参数也不落盘
      if (readSavedDensity() === null) applyDensity(resolveDensity());
    };

    let mq: MediaQueryList | null = null;
    if (typeof window !== 'undefined' && window.matchMedia) {
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener?.('change', reapply);
    }
    window.addEventListener('resize', reapply);

    return () => {
      mq?.removeEventListener?.('change', reapply);
      window.removeEventListener('resize', reapply);
    };
  }, []);

  return null;
}
