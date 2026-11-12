/**
 * 命盘 → 文本摘要（给提示词用）
 *
 * 只做「结构化事实」的转写，不掺任何解读，保证提示词里喂给 AI 的都是可核对的盘面。
 */

import type { ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';

/** 出生信息一行文本 */
export function birthText(chart: ZiweiChart): string {
  const b = chart.birthInfo;
  const hourBranch = BRANCHES[b.hour] ?? '';
  const place = [b.province, b.city].filter(Boolean).join(' · ') || '未填写';
  const gender = b.gender === 'male' ? '男' : '女';
  const base = `${b.year}年${b.month}月${b.day}日 ${hourBranch}时（时辰序号 ${b.hour}） · ${gender} · 出生地：${place}`;
  if (b.origInput) {
    const o = b.origInput;
    return `${base}\n原始输入：${o.year}年${o.month}月${o.day}日 ${String(o.clockHour).padStart(2, '0')}:${String(o.clockMinute).padStart(2, '0')}（已按子时换日规则归入排盘日）`;
  }
  return base;
}

/** 农历 + 四柱文本 */
export function lunarText(chart: ZiweiChart): string {
  const l = chart.lunarInfo;
  const monthNote = l.isLeapMonth ? `闰${Math.abs(l.lunarMonth)}月` : `${l.lunarMonth}月`;
  const lines = [`农历：${l.lunarYear}年 ${monthNote}${l.lunarDay}日`, `年干支：${STEMS[l.yearStem]}${BRANCHES[l.yearBranch]}`];
  if (l.fourPillars) lines.push(`节气四柱：${l.fourPillars.join(' ')}`);
  if (l.fourPillarsLunar) lines.push(`农历四柱：${l.fourPillarsLunar.join(' ')}`);
  if (chart.yinYangGender) lines.push(`阴阳性别：${chart.yinYangGender}`);
  if (chart.mingZhu) lines.push(`命主：${chart.mingZhu}　身主：${chart.shenZhu ?? '—'}`);
  return lines.join('\n');
}

/** 全盘结构化摘要 */
export function chartSummary(chart: ZiweiChart): string {
  const lines: string[] = [];
  lines.push(`命宫：${BRANCHES[chart.mingGongBranch]}宫　身宫：${BRANCHES[chart.shenGongBranch]}宫　五行局：${chart.wuxingJuName}（${chart.wuxingJu}局）　紫微落宫：${BRANCHES[chart.ziweiPos]}`);
  lines.push('');
  lines.push('【十二宫】（按地支顺序）');
  for (const p of chart.palaces) {
    const stars = p.stars
      .map((s) => `${s.name}${s.siHua ? `(化${s.siHua})` : ''}${s.brightnessRaw ? `[${s.brightnessRaw}]` : ''}`)
      .join('、') || '（无星）';
    const tags: string[] = [];
    if (p.isMingGong) tags.push('命宫');
    if (p.isShenGong) tags.push('身宫');
    if (p.daXianAge) tags.push(`大限${p.daXianAge[0]}–${p.daXianAge[1]}`);
    if (p.isEmpty) tags.push(p.borrowedFromName ? `空宫·借${p.borrowedFromName}` : '空宫');
    if (p.selfSihua?.length) tags.push(`自化${p.selfSihua.map((x) => `化${x.siHua}(${x.starName})`).join('、')}`);
    const head = `${STEMS[p.stem]}${BRANCHES[p.branch]} ${p.name}${tags.length ? `（${tags.join('，')}）` : ''}`;
    lines.push(`- ${head}：${stars}`);
  }
  lines.push('');
  lines.push('【大限】');
  for (const d of chart.daXians) {
    const sihua = d.siHua ? `　大限四化：禄${d.siHua.lu}／权${d.siHua.quan}／科${d.siHua.ke}／忌${d.siHua.ji}` : '';
    lines.push(`- ${d.startAge}–${d.endAge}岁：${d.palaceName}（${BRANCHES[d.palaceBranch]}）${d.stemName ? `干${d.stemName}` : ''}${sihua}`);
  }
  const cur = chart.daXians.find((d) => d.startAge <= chart.currentAge && chart.currentAge <= d.endAge);
  if (cur) lines.push(`当前年龄 ${chart.currentAge} 岁，行 ${cur.palaceName} 大限（${cur.startAge}–${cur.endAge}岁）`);
  return lines.join('\n');
}

/** 单宫文本（单宫细解模板用） */
export function palaceText(chart: ZiweiChart, branch: number): string {
  const p = chart.palaces.find((x) => x.branch === branch);
  if (!p) return '【未选中宫位】';
  const stars = p.stars
    .map((s) => `${s.name}${s.siHua ? `(化${s.siHua})` : ''}${s.brightnessRaw ? `[${s.brightnessRaw}]` : ''}(${s.type === 'major' ? '主星' : s.type === 'sha' ? '煞' : s.type === 'lucky' ? '吉' : '辅'})`)
    .join('、') || '（无星）';
  const opp = chart.palaces.find((x) => x.branch === (branch + 6) % 12);
  const parts = [
    `${STEMS[p.stem]}${BRANCHES[p.branch]}宫 · ${p.name}`,
    `星曜：${stars}`,
    p.daXianAge ? `大限：${p.daXianAge[0]}–${p.daXianAge[1]}岁` : '',
    p.isEmpty ? `空宫，借对宫 ${p.borrowedFromName ?? ''}（${p.borrowedStars?.join('、') ?? ''}）` : '',
    opp ? `对宫：${opp.name}·${opp.stars.map((s) => s.name).join('、') || '无星'}` : '',
    p.selfSihua?.length ? `宫干自化：${p.selfSihua.map((x) => `化${x.siHua}(${x.starName})`).join('、')}` : '',
  ];
  return parts.filter(Boolean).join('\n');
}

/** 当前大限文本 */
export function daxianText(chart: ZiweiChart): string {
  const d = chart.daXians.find((x) => x.startAge <= chart.currentAge && x.endAge >= chart.currentAge) ?? chart.daXians[chart.currentDaXianIndex];
  if (!d) return '【无大限数据】';
  const sihua = d.siHua ? `／禄${d.siHua.lu}／权${d.siHua.quan}／科${d.siHua.ke}／忌${d.siHua.ji}` : '';
  return `${d.startAge}–${d.endAge}岁，落 ${d.palaceName}宫（${BRANCHES[d.palaceBranch]}）${d.stemName ? `，宫干${d.stemName}` : ''}${sihua}`;
}
