/**
 * 字体与字号规范 —— 独立模块，无 'use client'，服务端页面也能直接用
 *
 * 2026-11 统一口径（全站唯一出处，不要在页面里现编字号）：
 *   页标题 27 / 分节 19 / 正文 15 / 表单与导航 14 / 辅助 13–12 / 古籍正文 17，行高 1.8。
 *   标题、主星、宫名、古籍引文用宋；表单、导航、按钮、提示、白话说明用无衬线；
 *   日期、时辰、大限区间用等宽数字（NUMERIC）。
 *   字体只列系统自带或本机已确认存在的家族，不外链网络字体 —— 离线桌面版同样成立。
 *   （本机已核对：华文中宋 / 华文宋体 / 华文楷体 / 微软雅黑 / Noto Sans SC 均在。）
 *
 * 2026-11-12 字号密度：
 *   每档字号都写成 `var(--fs-*, 基准px)`，基准值只作回退。六个档位的实际值由
 *   app/globals.css 里的 `html[data-density]` 三组变量决定（紧凑 / 标准 / 舒展），
 *   所以调密度不用改任何页面代码，也不会让版式宽度跟着变。
 *   盘面宫格里的字号是 ChartBoardDark 里写死的，故意不跟随 —— 盘面比例不能动。
 */

import type { CSSProperties } from 'react';

/**
 * 字号取值：优先取 CSS 变量（密度由此切换），变量缺失时回退到基准 px。
 * 用函数的唯一目的，是让「这是一个可调档位」这件事在代码里能看出来。
 */
const fs = (key: string, base: number) => `var(--fs-${key}, ${base}px)`;

export const FONT = {
  /** 界面、表单、导航、正文 —— 屏幕小字靠它保可读 */
  sans: '"Noto Sans SC","Microsoft YaHei UI","微软雅黑","Microsoft YaHei","PingFang SC",system-ui,sans-serif',
  /** 页面标题与中文大标题：宋体骨架 */
  display: '"华文中宋","STZhongsong","Noto Serif SC","Source Han Serif SC","华文宋体","STSong","Songti SC",serif',
  /** 古籍正文与引文 */
  serif: '"华文宋体","STSong","宋体","SimSun","Noto Serif SC","Source Han Serif SC",serif',
  /** 口诀、批注、题跋 */
  kai: '"华文楷体","STKaiti","楷体","KaiTi","FangSong",serif',
  /** 日期、时辰、大限区间、代码化文本 */
  mono: '"Cascadia Mono","Consolas","JetBrains Mono",ui-monospace,monospace',
} as const;

/** 字号阶梯（标准密度下的 px 基准）。只在档位上取值，不出现 11.5 / 13.5 这类碎尺寸。 */
export const T = {
  hero: fs('hero', 34),        // 首页主视觉、盘心标题
  display: fs('display', 27),  // 页标题（24–28）
  h1: fs('h1', 22),            // 页内大节
  h2: fs('h2', 19),            // 分节标题（18–20）
  h3: fs('h3', 16),            // 小标题
  bodyLg: fs('bodyLg', 16),    // 强调正文
  body: fs('body', 15),        // 常规正文（14–16）
  nav: fs('nav', 14),          // 导航与表单
  sub: fs('sub', 13),          // 次要信息（12–13）
  meta: fs('meta', 12.5),      // 元信息
  micro: fs('micro', 12),      // 标签、角标
  eyebrow: fs('eyebrow', 12),  // 眉标
  serif: fs('serif', 17),      // 古籍正文（16–18）
} as const;

/** 字距：只允许这几档，避免每页各写一个 */
export const TRACK = {
  hero: '0.02em',
  title: '0.04em',
  body: '0.01em',
  label: '0.1em',
  eyebrow: '0.2em',
} as const;

/** 行高：阅读给宽，界面收紧（同样由密度微调，见 globals.css 的 --lh-ui / --lh-reading） */
export const LH = {
  reading: 'var(--lh-reading, 1.85)',
  ui: 'var(--lh-ui, 1.8)',
  tight: 1.5,
} as const;

/** 数字统一等宽，避免统计数字跳动 */
export const NUMERIC: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
};

/** 圆角与阴影：全站只这两组 */
export const SHAPE = {
  radiusCard: 12,
  radiusBtn: 8,
  radiusChip: 18,
  shadowCard: '0 1px 2px rgba(30,42,50,0.04), 0 6px 18px -16px rgba(30,42,50,0.16)',
  shadowHover: '0 2px 6px rgba(30,42,50,0.05), 0 14px 30px -20px rgba(30,42,50,0.22)',
} as const;

/** 常用间距：页边、区块间、字段间 */
export const SPACE = {
  pageX: 28,
  pageTop: 30,
  block: 22,
  field: 10,
} as const;
