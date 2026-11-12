import { generateChart } from '@/lib/ziwei/algorithm';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import type { Palace } from '@/lib/ziwei/types';

export const teaching = generateChart({ year: 1990, month: 5, day: 15, hour: 4, gender: 'female', name: '教学盘' });
export const practice = generateChart({ year: 1995, month: 8, day: 20, hour: 7, gender: 'male', name: '练习盘' });
type Chart = typeof teaching;
const branch = (value: number) => BRANCHES[(value + 12) % 12];
const palace = (chart: Chart, value: number) => chart.palaces.find(p => p.branch === (value + 12) % 12)!;
const majors = (p: Palace) => p.stars.filter(s => s.type === 'major').map(s => s.name).join('、') || '无主星';
const marked = (chart: Chart) => chart.palaces.flatMap(p => p.stars.filter(s => s.siHua).map(star => ({ p, star })))[0];
const path = (start: number, count: number, direction: number) => Array.from({ length: count + 1 }, (_, i) => branch(start + i * direction)).join(' → ');

export type Exercise = { prompt: string; answer: string; options: string[]; hint: string; pick?: number };
type Lesson = { title: string; goal: string; demo: (chart: Chart) => string[]; focus: (chart: Chart) => number; drill: (chart: Chart, final: boolean) => Exercise };
const branches = [...BRANCHES];
function question(prompt: string, answer: string, options: string[], hint: string, pick?: number): Exercise {
  return { prompt, answer, options: [...new Set(options)], hint, pick };
}
const related = (chart: Chart) => [4, 6, 8].map(i => branch(chart.mingGongBranch + i)).join('、');
function birthSteps(chart: Chart) {
  const { hour } = chart.birthInfo;
  const { lunarMonth, lunarDay } = chart.lunarInfo;
  const monthIndex = Math.abs(lunarMonth) - 1;
  return { monthIndex, day: lunarDay, monthStart: (2 + monthIndex) % 12, hour };
}

export const lessons: Lesson[] = [
  {
    title: '认识一张命盘', goal: '分清盘心、宫名和地支，在新盘上找到命宫。',
    focus: chart => chart.mingGongBranch,
    demo: chart => [
      '中央的大框叫盘心，放出生与排盘资料。外围十二格是十二宫。每格的宫名说明这一格的用途，地支说明它的位置。',
      `先找高亮的命宫。宫名写「${palace(chart, chart.mingGongBranch).name}」，同一格右上角的地支是「${branch(chart.mingGongBranch)}」。换一张盘，命宫可能在别的格子。`,
    ],
    drill: (chart, final) => {
      const p = palace(chart, chart.mingGongBranch + (final ? 0 : 1));
      return question(`点选「${p.name}」，再选择同一格的地支。`, branch(p.branch), branches, '先看每格左上角的宫名，再读同一格右上角干支的最后一个字。', p.branch);
    },
  },
  {
    title: '读懂一个宫位', goal: '认出主星、辅曜、亮度和生年四化。',
    focus: chart => marked(chart).p.branch,
    demo: chart => {
      const { p, star } = marked(chart);
      return [
        `看高亮的「${p.name}」。最大的星名是主星，本宫为「${majors(p)}」。主星旁的庙、旺、陷等是亮度等级。下方小字是其他星曜，包含辅曜和煞曜。空宫表示本宫无主星。`,
        `四化用禄、权、科、忌标在星名旁。此宫的「${star.name}」带「${star.siHua}」。有些宫没有四化，读时以实际标签为准。`,
      ];
    },
    drill: (chart, final) => {
      const { p, star } = marked(chart);
      return final
        ? question(`在「${p.name}」找到带「${star.siHua}」的星曜。`, star.name, p.stars.map(s => s.name), '读星名旁的标签，找到和题目相同的四化字。')
        : question(`读出「${p.name}」的主星。`, majors(p), ['无主星', ...p.stars.filter(s => s.type !== 'major').slice(0, 4).map(s => s.name), majors(p)], '看宫内最大字号的一组星名。无主星时，盘上会明确写出。');
    },
  },
  {
    title: '找对宫和三方四正', goal: '从任意一宫找到三个关联位置。',
    focus: chart => chart.mingGongBranch,
    demo: chart => [
      '从子、丑、寅、卯依次往下数，走完亥回到子。起点算第 0 格。向前走 6 格是对宫，走 4 格和 8 格是另外两个相关宫位。',
      `从教学盘的命宫「${branch(chart.mingGongBranch)}」出发，三处依次是「${related(chart)}」。加上起点就是三方四正。先找全这四宫，再读各宫的实际星曜。`,
    ],
    drill: (chart, final) => {
      const offset = final ? 4 : 6;
      return question(`从命宫「${branch(chart.mingGongBranch)}」向前走 ${offset} 格，点选落宫并选择其地支。`, branch(chart.mingGongBranch + offset), branches, '从命宫算第 0 格，沿子丑寅卯的顺序数。', (chart.mingGongBranch + offset) % 12);
    },
  },
  {
    title: '手推命宫和身宫', goal: '用农历月份和时辰，从寅宫起数。',
    focus: chart => chart.mingGongBranch,
    demo: chart => {
      const { monthIndex, monthStart, hour } = birthSteps(chart);
      return [
        `教学盘用普通农历 ${monthIndex + 1} 月、${branch(hour)}时。从寅起正月，寅算第 1 月，顺数生月：${path(2, monthIndex, 1)}。生月起点是「${branch(monthStart)}」。`,
        `在生月起点记为子时，丑时才走第一格。逆数生时定命宫：${path(monthStart, hour, -1)}。回到同一起点顺数生时定身宫：${path(monthStart, hour, 1)}。`,
        '真实出生资料应先在排盘页确认采用的日期和时辰。闰月、子时换日或真太阳时可能改变起盘输入。',
      ];
    },
    drill: (chart, final) => {
      const target = final ? chart.shenGongBranch : chart.mingGongBranch;
      const { monthIndex, hour } = birthSteps(chart);
      return question(`农历 ${monthIndex + 1} 月、${branch(hour)}时。推算${final ? '身宫' : '命宫'}，然后点选落宫和地支。`, branch(target), branches, final ? '从生月宫起子时，顺数到生时。' : '先从寅起正月，顺数到生月；再从生月宫起子时，逆数。', target);
    },
  },
  {
    title: '完成一张本命盘', goal: '把五行局、十四主星和生年四化连成一条排盘顺序。',
    focus: chart => chart.ziweiPos,
    demo: chart => {
      const ming = palace(chart, chart.mingGongBranch);
      const { day } = birthSteps(chart);
      const marks = chart.palaces.flatMap(p => p.stars.filter(s => s.siHua).map(s => `${s.name}化${s.siHua}（${p.name}）`));
      const added = (chart.wuxingJu - day % chart.wuxingJu) % chart.wuxingJu;
      const quotient = (day + added) / chart.wuxingJu;
      const tianfu = chart.palaces.find(p => p.stars.some(s => s.type === 'major' && s.name === '天府'))!;
      return [
        `① 用命宫干支「${STEMS[ming.stem]}${branch(ming.branch)}」查纳音五行，再换成局数：水二、木三、金四、土五、火六。本盘为「${chart.wuxingJuName}」。`,
        `② 安紫微。给生日数 ${day} 加上最小补数 ${added}，使它能被局数 ${chart.wuxingJu} 整除，得到商 ${quotient}。以寅为第 1 格顺数到商的位置。补数是偶数则顺移该数，是奇数则逆移该数，补 0 不移动。本盘紫微落「${branch(chart.ziweiPos)}」。`,
        `③ 安十四主星。以寅宫为镜像起点：紫微从寅顺数几步，天府就从寅逆数几步。本盘天府落「${branch(tianfu.branch)}」。紫微系逆布：紫微、天机、空、太阳、武曲、天同、空、空、廉贞。天府系顺布：天府、太阴、贪狼、巨门、天相、天梁、七杀、空、空、空、破军。每项占一宫，遇到「空」也走一格。`,
        `④ 按生年天干「${STEMS[chart.lunarInfo.yearStem]}」查四化表，给对应星曜标上禄、权、科、忌。本盘核对：${marks.join('；')}。`,
      ];
    },
    drill: (chart, final) => final
      ? question('核对这张练习盘的紫微落在哪个地支。点选对应宫位，并选出地支。', branch(chart.ziweiPos), branches, '先找大字主星「紫微」，再看同一格右上角的地支。', chart.ziweiPos)
      : question('这个例子的五行局是什么？', chart.wuxingJuName, ['水二局', '木三局', '金四局', '土五局', '火六局'], '查命宫干支的纳音，核对盘心的五行局。'),
  },
  {
    title: '用新盘复盘', goal: '在陌生命盘上把观察结果与盘面证据对应起来。',
    focus: chart => marked(chart).p.branch,
    demo: chart => {
      const { p, star } = marked(chart);
      return [
        `先确认盘心的资料，再找命宫。读每宫时按「宫名和地支 → 主星 → 四化」记录。例如「${p.name}在${branch(p.branch)}，本宫主星为${majors(p)}，${star.name}化${star.siHua}」。`,
        '下一步查对宫和另外两处三方宫位。记下你看到了什么；后续阅读流派解读时，把解释和盘面证据分别记在笔记里。',
      ];
    },
    drill: (chart, final) => {
      const { p, star } = marked(chart);
      return final
        ? question(`找出「${star.name}化${star.siHua}」所在的宫位，点选后选择宫名。`, p.name, chart.palaces.map(item => item.name), '先找星名与四化标签的组合，再读该格左上角的宫名。', p.branch)
        : question('从命宫出发，对宫在哪个地支？', branch(chart.mingGongBranch + 6), branches, '命宫为第 0 格，沿地支顺序数 6 格。');
    },
  },
];
