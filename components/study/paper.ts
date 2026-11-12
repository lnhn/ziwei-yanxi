/**
 * 色板 —— 独立模块，不含 'use client'
 *
 * 现在的值是 CSS 变量名，不是十六进制。原因：知识库 / 古籍 / 讲义这些页
 * 是静态导出的 HTML，服务端拿不到 localStorage，主题只能在客户端切换，
 * 因此色值必须在 CSS 里留 var() 占位，由浏览器按 html[data-skin] 解析。
 *
 * 为什么抽出来：ZenShell 是客户端组件（'use client'）。服务端页面若从它
 * 导入 PAPER_COLORS，拿到的是客户端引用占位对象而不是真实色值，颜色全部变
 * undefined，卡片白底、边框、金线会整片消失。色板必须放在中立模块里，
 * 服务端与客户端都从这里取。
 */

export const PAPER_COLORS = {
  paper: 'var(--zw-paper)',
  paperDeep: 'var(--zw-paper-deep)',
  card: 'var(--zw-card)',
  ink: 'var(--zw-ink)',
  ink2: 'var(--zw-ink2)',
  ink3: 'var(--zw-ink3)',
  line: 'var(--zw-line)',
  gold: 'var(--zw-gold)',
  navy: 'var(--zw-navy)',
  cinnabar: 'var(--zw-cinnabar)',
} as const;

export type PaperColor = keyof typeof PAPER_COLORS;

/** 面：命盘宫格、内嵌区块用得更细，和卡片不是一回事 */
export const SURFACE = {
  panel: 'var(--zw-panel)',
  panelAlt: 'var(--zw-panel-alt)',
  seal: 'var(--zw-seal)',
} as const;

/** 四化四色 —— 全站唯一允许饱和的一组颜色 */
export const SIHUA_COLORS = {
  禄: 'var(--zw-lu)',
  权: 'var(--zw-quan)',
  科: 'var(--zw-ke)',
  忌: 'var(--zw-ji)',
} as const;

/** 宫位染色（已按透明度调过，暗底亮底都能站住） */
export const TINT = {
  ming: 'var(--zw-tint-ming)',
  sanfang: 'var(--zw-tint-sanfang)',
  kong: 'var(--zw-tint-kong)',
  sha: 'var(--zw-tint-sha)',
  daXian: 'var(--zw-tint-daxian)',
} as const;

export const SHADOW = {
  card: 'var(--zw-shadow-card)',
  float: 'var(--zw-shadow-float)',
} as const;

/**
 * 半透明色。原来的写法是 `${C.gold}33` 拼十六进制后缀，
 * 色值变成 var() 之后这种拼法会得到非法表达式，一律改用 color-mix。
 * pct 是百分比整数：0F≈6、14≈8、1A≈10、33≈20、44≈27、55≈33、88≈53。
 */
export function mix(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
