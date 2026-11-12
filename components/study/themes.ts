/**
 * 皮肤清单 —— 独立模块，无 'use client'
 *
 * 真正的色值在 app/globals.css 的 [data-skin] 块里；这里只放「挑选界面」
 * 需要的东西：id、名字、一句气质说明、两三个色卡（给切换器画小圆点）。
 * 两处各司其职，避免同一个颜色在两处定义后不一致。
 */

export type SkinMode = 'light' | 'dark';

export type Skin = {
  id: string;
  label: string;
  /** 一句气质说明，切换器悬停时给提示 */
  note: string;
  mode: SkinMode;
  /** 切换器上的小色卡：底、线、点睛色 */
  swatch: [string, string, string];
};

export const SKINS: Skin[] = [
  {
    id: 'zhixuan',
    label: '纸宣',
    note: '宣纸底 · 墨蓝字 · 一点金',
    mode: 'light',
    swatch: ['#FAF7F0', '#E7E1D3', '#B8922A'],
  },
  {
    id: 'juansha',
    label: '绢沙',
    note: '旧绢暖沙 · 赭金压场',
    mode: 'light',
    swatch: ['#F3E9D7', '#DFD2B7', '#A8802F'],
  },
  {
    id: 'xuanmo',
    label: '玄墨',
    note: '墨底金线 · 朱砂点睛',
    mode: 'dark',
    swatch: ['#0E1114', '#28313A', '#C6A15B'],
  },
  {
    id: 'shiqing',
    label: '石青',
    note: '矿青冷底 · 米金托字',
    mode: 'dark',
    swatch: ['#0C191F', '#22404C', '#CBB27A'],
  },
  {
    id: 'jiangzi',
    label: '绛紫',
    note: '紫气深藏 · 金线勾边',
    mode: 'dark',
    swatch: ['#140F17', '#332541', '#C9A469'],
  },
  {
    id: 'songyan',
    label: '松烟',
    note: '墨绿沉底 · 铜金压纸',
    mode: 'dark',
    swatch: ['#0D1411', '#243529', '#B99A5E'],
  },
];

export const DEFAULT_SKIN_ID = 'xuanmo';

/** 存本地用的键。和旧落地页的 'ziwei-theme' 分开，互不干扰 */
export const SKIN_STORAGE_KEY = 'zw.skin.v1';

export function getSkin(id: string | null | undefined): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function isSkinId(v: string | null | undefined): boolean {
  return !!v && SKINS.some((s) => s.id === v);
}
