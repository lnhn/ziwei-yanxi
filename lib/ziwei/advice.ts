/**
 * 核心建议 —— 解完盘之后，人真正会问的那几句
 *
 * 判据回答「这盘是什么」；建议回答「那我该怎么做」。两者用的数据完全一样（宫、星、亮度、四化、煞星），
 * 区别只在落点：建议必须带「做 / 避 / 什么时候」这三样，否则就是正确的废话。
 *
 * 六维按人的实际生活切：事业、财、感情、家庭生活、身体、心性。
 * 每维输出：一句总判断（headline）、2–4 条盘上依据（basis）、3 条可做的、2 条该避的、一个时间窗口（window）。
 *
 * 边界：不写「必成 / 必败 / 必病 / 必离」，只写「哪里推力足、哪里容易卡、卡的时候怎么走」。
 * 身体一维只谈养护方向，不做诊断。
 */

import type { Star, StarBrightness, ZiweiChart } from './types';
import { BRANCHES, STEMS } from './constants';
import { getSiHuaByStem } from './sihua';
import { getStarPlain } from './star-plain';
import { buildLifeKline } from './life-kline';

export type AdviceKey = 'career' | 'wealth' | 'love' | 'life' | 'health' | 'mind';

export interface Advice {
  key: AdviceKey;
  label: string;
  /** 一句总判断 */
  headline: string;
  /** 盘上依据：都写清从哪颗星、哪一化来 */
  basis: string[];
  /** 可以做的三件 */
  do: string[];
  /** 该避的两件 */
  avoid: string[];
  /** 时间窗口 */
  window: string;
}

// ── 与 reading.ts 同一套口径 ──────────────────────────────────
const SHA_HARD = ['擎羊', '陀罗', '火星', '铃星'];
const SHA_KONG = ['地空', '地劫'];
const SHA_ALL = [...SHA_HARD, ...SHA_KONG];
const LUCKY = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马'];

const HIGH: StarBrightness[] = ['庙', '旺'];
const LOW: StarBrightness[] = ['不', '闲', '陷'];

type Tone = 'strong' | 'flat' | 'weak';

function baseName(n: string): string {
  return n.replace(/宫$/, '');
}

function palaceByName(chart: ZiweiChart, name: string) {
  return chart.palaces.find((p) => baseName(p.name) === baseName(name));
}

function disp(n: string): string {
  return n.endsWith('宫') ? n : `${n}宫`;
}

function majorsOf(chart: ZiweiChart, palaceName: string): string[] {
  const p = palaceByName(chart, palaceName);
  if (!p) return [];
  const ms = p.stars.filter((s) => s.type === 'major').map((s) => s.name);
  if (ms.length) return ms;
  // 空宫借对宫：这一宫的「人」其实是隔壁那一格的
  return p.borrowedStars ?? [];
}

function starOf(chart: ZiweiChart, palaceName: string, name: string): Star | undefined {
  return palaceByName(chart, palaceName)?.stars.find((s) => s.name === name);
}

function toneOf(chart: ZiweiChart, palaceName: string): Tone {
  const p = palaceByName(chart, palaceName);
  if (!p) return 'flat';
  const ms = p.stars.filter((s) => s.type === 'major');
  const brights = ms.map((s) => s.brightnessRaw).filter(Boolean) as StarBrightness[];
  const hi = brights.filter((b) => HIGH.includes(b)).length;
  const lo = brights.filter((b) => LOW.includes(b)).length;
  const sha = p.stars.filter((s) => SHA_ALL.includes(s.name)).length;
  const lucky = p.stars.filter((s) => LUCKY.includes(s.name)).length;
  const huaHappy = p.stars.some((s) => s.siHua === '禄' || s.siHua === '权' || s.siHua === '科');
  const huaJi = p.stars.some((s) => s.siHua === '忌');

  let score = 0;
  score += hi * 2 - lo * 2 - sha * 1.2 + lucky * 0.8 + (huaHappy ? 1.5 : 0) - (huaJi ? 1.5 : 0);
  if (!ms.length) score -= 0.5;
  if (score >= 1.5) return 'strong';
  if (score <= -1.5) return 'weak';
  return 'flat';
}

/** 该宫的星曜摘要，写进依据 */
function palaceDigest(chart: ZiweiChart, palaceName: string): string {
  const p = palaceByName(chart, palaceName);
  if (!p) return `${disp(palaceName)}：未落宫`;
  const label = (s: Star) => `${s.name}${s.brightnessRaw ? `[${s.brightnessRaw}]` : ''}${s.siHua ? `(化${s.siHua})` : ''}`;
  const ms = p.stars.filter((s) => s.type === 'major');
  const others = p.stars.filter((s) => s.type !== 'major');
  const main = ms.length ? ms.map(label).join('、') : `空宫（借${p.borrowedFromName ?? '对宫'}：${(p.borrowedStars ?? []).join('、') || '无主星'}）`;
  const rest = others.slice(0, 5).map(label).join('、');
  const stem = p.stem !== undefined ? `宫干${STEMS[p.stem] ?? ''}` : '';
  return `${BRANCHES[p.branch]}${disp(palaceName)}${stem ? `（${stem}）` : ''}：主星 ${main}${rest ? `；同宫 ${rest}` : ''}`;
}

function shaLine(chart: ZiweiChart, palaceName: string): string {
  const p = palaceByName(chart, palaceName);
  const sha = p?.stars.filter((s) => SHA_ALL.includes(s.name)) ?? [];
  if (!sha.length) return `${disp(palaceName)}无煞：这一格的过程顺，成本低，敢往前推。`;
  return `${disp(palaceName)}见 ${sha.map((s) => s.name).join('、')}：事情能成，但过程有返工与阻力，预算时间要留一手。`;
}

function huaLine(chart: ZiweiChart, palaceName: string): string | null {
  const p = palaceByName(chart, palaceName);
  const withHua = p?.stars.filter((s) => s.siHua) ?? [];
  if (!withHua.length) return null;
  return `生年四化：${withHua.map((s) => `${s.name}化${s.siHua}`).join('、')} —— 这一格的「入口 / 课题」都在这几颗星上。`;
}

/**
 * 当下大限 + 这一维在未来十年里的高/低点
 * 六张卡不能共用同一句「45 岁指数最高」——每张卡该报的是它自己那一维的峰谷。
 */
function windowOf(chart: ZiweiChart, key: AdviceKey): string {
  const cur = chart.daXians.find((d) => chart.currentAge >= d.startAge && chart.currentAge <= d.endAge);
  const k = buildLifeKline(chart);
  const ahead = k.bars.filter((b) => b.age >= chart.currentAge && b.age <= chart.currentAge + 10);

  /** 生活这一维没有单独的指数，用「心性 + 身体」的平均代表安顿感 */
  const score = (b: (typeof k.bars)[number]) => {
    if (key === 'life') {
      const mind = b.dims.find((d) => d.key === 'mind')?.score ?? 50;
      const health = b.dims.find((d) => d.key === 'health')?.score ?? 50;
      return Math.round((mind + health) / 2);
    }
    return b.dims.find((d) => d.key === key)?.score ?? 50;
  };

  const sorted = [...ahead].sort((a, b) => score(b) - score(a));
  const top = sorted[0];
  const low = sorted[sorted.length - 1];

  const curText = cur
    ? `当下 ${cur.startAge}–${cur.endAge} 岁走 ${BRANCHES[cur.palaceBranch]}${disp(cur.palaceName)}`
    : '当下在童限';
  const topText = top ? `；往后十年里 ${top.age} 岁（${top.year}）这一维最高（${score(top)}），重的事放这前后` : '';
  const lowText = low && low !== top ? `；${low.age} 岁（${low.year}）这一维最低（${score(low)}），那年收着走` : '';
  return `${curText}${topText}${lowText}。`;
}

// ── 六维建议 ─────────────────────────────────────────────────

function careerAdvice(chart: ZiweiChart): Advice {
  const tone = toneOf(chart, '官禄宫');
  const ming = majorsOf(chart, '命宫')[0] ?? '';
  const plain = ming ? getStarPlain(ming) : undefined;
  const headline =
    tone === 'strong'
      ? '事业上你是有底气的那一类：位置给到，你能接得住；要争的是「名分」，不是「活多」。'
      : tone === 'weak'
        ? '事业这一格现在偏弱：不是能力问题，是环境给的位子不够。少硬闯，先换环境、换赛道。'
        : '事业这一格不上不下：能做事，但「被看见」的程度取决于你怎么选位置。';

  const basis = [
    palaceDigest(chart, '官禄宫'),
    shaLine(chart, '官禄宫'),
    ...(huaLine(chart, '官禄宫') ? [huaLine(chart, '官禄宫') as string] : []),
    ...(plain ? [`命宫底色（${ming}）：${plain.groups.career}`] : []),
  ];

  const dos =
    tone === 'strong'
      ? [
          '把目标写成「三年一个位子」：先拿到能拍板的岗位/项目主导权，再谈钱。',
          '在你已有的专业上叠一层「能对外讲」的东西（文章、课程、方案），名分是攒出来的。',
          '遇到要用人的场合别自己扛：这一格的能量靠「带人做事」放大。',
        ]
      : tone === 'weak'
        ? [
            '先换环境再谈努力：同样的力气，放在有资源的地方才见效。',
            '把手艺磨到「别人替不了」的程度，用专业换位子，别用情绪争位子。',
            '给自己留一条副线（第二收入或第二身份），主线的风险就没那么致命。',
          ]
        : [
            '先定「做什么」再定「在哪做」：这两件事分开想，容易在错的平台上耗。',
            '每年留一件能拿得出手的作品，用成果代替辩解。',
            '找一个能替你说好话的人（上级、合作方），别指望靠加班被看见。',
          ];

  const avoid =
    tone === 'weak'
      ? ['别在没名分的地方长期「先干着」——时间换不来位子，只会换来自我怀疑。', '别一次性押上全部筹码（裸辞、全资投入），这一格经不起一次大赌。']
      : ['别把「忙」当成绩：这一格最怕用力方向错，越忙越远。', '别在同一个组织里跟人比资历，比不过就换维度比。'];

  return { key: 'career', label: '事业', headline, basis, do: dos, avoid, window: windowOf(chart, 'career') };
}

function wealthAdvice(chart: ZiweiChart): Advice {
  const tone = toneOf(chart, '财帛宫');
  const tianZhai = toneOf(chart, '田宅宫');
  const headline =
    tone === 'strong'
      ? '财路是通的：钱从「事」上来，不靠省；关键是把它落成资产，而不是落成开销。'
      : tone === 'weak'
        ? '财这一格偏紧：不是赚不到，是留不住。先把「漏点」堵上，再谈开源。'
        : '财这一格平：进得来也出得去，攒不攒得下全看有没有制度。';

  const basis = [
    palaceDigest(chart, '财帛宫'),
    palaceDigest(chart, '田宅宫'),
    shaLine(chart, '财帛宫'),
    ...(huaLine(chart, '财帛宫') ? [huaLine(chart, '财帛宫') as string] : []),
  ];

  const dos =
    tone === 'strong'
      ? ['把收入拆成「现金流 / 资产 / 试错金」三份，比例先定死再执行。', '赚钱的着力点放在你的专业变现上，别放在「找机会」上。', '大额决策留 72 小时冷静期：这一格怕的是顺的时候手大。']
      : tone === 'weak'
        ? ['先做「支出清单」不做「收入计划」：这一格的漏点比缺口更伤人。', '把钱放在不易动用的地方（定期、固定资产），别放在随手能花的账户里。', '别替人担保、别借名、别参与说不清结构的分账。']
        : ['每月固定先转出一笔「看不见的钱」，剩下的才是可花的。', '把一件副业做成能复购的小生意，比多打一份工稳。', '大额支出前问一句：这笔钱买的是资产还是情绪。'];

  const avoid =
    tianZhai === 'weak'
      ? ['别把大钱压在「住」上（过度加杠杆买房/装修），这一格田宅弱，容易变成长期负担。', '别用短期钱做长期事：期限错配在这一格最容易翻车。']
      : ['别在情绪高的时候做大额投资，尤其别加杠杆。', '别把「朋友介绍的机会」当尽调，钱出去之前一定自己看一遍结构。'];

  return { key: 'wealth', label: '财', headline, basis, do: dos, avoid, window: windowOf(chart, 'wealth') };
}

function loveAdvice(chart: ZiweiChart): Advice {
  const tone = toneOf(chart, '夫妻宫');
  const ming = majorsOf(chart, '命宫')[0] ?? '';
  const plain = ming ? getStarPlain(ming) : undefined;
  const spouseStars = majorsOf(chart, '夫妻宫');
  const headline =
    tone === 'strong'
      ? '关系这一格是有支撑的：你能遇到愿意跟你并肩的人，重点在「别把对方当工具」。'
      : tone === 'weak'
        ? '关系这一格偏磨：不是没人，是容易遇到「耗你的人」。筛选比经营更重要。'
        : '关系这一格平：能过，但需要把话说清；模糊是这一格最大的成本。';

  const basis = [
    palaceDigest(chart, '夫妻宫'),
    shaLine(chart, '夫妻宫'),
    ...(plain ? [`命宫底色（${ming}）：${plain.groups.love}`] : []),
  ];

  const dos =
    tone === 'weak'
      ? ['先定「不要什么」：这一格最怕在错的人身上讲道理，早识别早止损。', '把关系放慢：至少经历一次共同处理麻烦事，再谈长期。', '保留自己的住处与收入，这是这一格的底气来源。']
      : tone === 'strong'
        ? ['把「一起做的事」立起来：共同目标比共同情绪更能稳住关系。', '该给名分的时候给名分，这一格怕拖不怕定。', '遇到分歧用「事实—感受—请求」三步说，别用反问句。']
        : ['把边界写在明面上：钱、时间、家务、双方父母，四件事先说清。', '每月一次「不带情绪的对账」，把不满在小的时候处理掉。', '别用沉默当惩罚，这一格经不起冷战。'];

  const avoid =
    spouseStars.length && tone === 'weak'
      ? ['别被「气场强」的人吸引就交出主导权，这一格容易在关系里丢掉自己。', '别为关系做不可逆的牺牲（辞职、搬家、断掉朋友）。']
      : ['别在情绪最差的时候做关系决定（分手、结婚、搬家）。', '别把对方当情绪垃圾桶：短期能装，长期会漏。'];

  return { key: 'love', label: '感情', headline, basis, do: dos, avoid, window: windowOf(chart, 'love') };
}

function lifeAdvice(chart: ZiweiChart): Advice {
  const tianZhai = toneOf(chart, '田宅宫');
  const fu = toneOf(chart, '福德宫');
  const headline =
    tianZhai === 'strong'
      ? '生活这一块是有根的：住处、家里那摊事能托住你，越安顿越有劲。'
      : tianZhai === 'weak'
        ? '生活这一块偏飘：住处与家务容易变成消耗项，先把「安顿」这件事办了。'
        : '生活这一块平：能过，但节奏是被动被推着走的，需要自己定一个节律。';

  const basis = [
    palaceDigest(chart, '田宅宫'),
    palaceDigest(chart, '福德宫'),
    shaLine(chart, '田宅宫'),
  ];

  const dos =
    tianZhai === 'weak'
      ? ['先解决「住」：光线、通风、收纳三件事到位，人的状态立刻不一样。', '把家里的固定支出与家务分工写下来，别靠记性和默契。', '给自己一个「不被打扰的角落」——这一格需要靠空间换回心气。']
      : ['把住处当成长期项目经营：小修小补比大折腾有效。', '定一个稳定的日常节律（起床、运动、吃饭三件事固定），这一格靠规律养。', '一年安排两次真正的休息（走开三天以上），别用周末补。'];

  const avoid =
    fu === 'weak'
      ? ['别用「买」来缓解情绪，这一格容易把花钱当成休息。', '别把日程排满：排满不是充实，是逃。']
      : ['别把生活全让位给工作：这一格的家是补能量的地方，荒了就要回来修。', '别长期睡在噪音与乱里，环境和心气是同一条线。'];

  return { key: 'life', label: '家庭生活', headline, basis, do: dos, avoid, window: windowOf(chart, 'life') };
}

function healthAdvice(chart: ZiweiChart): Advice {
  const tone = toneOf(chart, '疾厄宫');
  const ming = majorsOf(chart, '命宫')[0] ?? '';
  const plain = ming ? getStarPlain(ming) : undefined;
  const headline =
    tone === 'weak'
      ? '身体这一格提示「长期小耗」：不是急病，是容易在同一个地方反复——要按节律养，不靠猛补。'
      : '身体这一格尚可：底子在，但会被作息和情绪拖下来，养护比治疗划算。';

  const basis = [
    palaceDigest(chart, '疾厄宫'),
    shaLine(chart, '疾厄宫'),
    ...(plain ? [`命宫底色（${ming}）：${plain.groups.health}`] : []),
  ];

  const dos = [
    '选低强度、长时间的运动（快走、游泳、慢跑），这一格吃耐力不吃爆发。',
    '把睡眠当成硬指标：固定上床时间比睡多久更管用。',
    '每年一次体检，盯住你这一格提示的部位，做趋势记录而不是单次数值。',
  ];
  const avoid = [
    '别用「扛」处理不适：这一格的信号来得轻，拖久了才重。',
    '别在情绪最紧的时候做身体上的硬消耗（熬夜赶工、连轴出差）。',
  ];

  return {
    key: 'health', label: '身体', headline, basis, do: dos, avoid,
    window: `${windowOf(chart, 'health')}这一维只讲养护方向，具体症状请就医，命盘不作诊断。`,
  };
}

function mindAdvice(chart: ZiweiChart): Advice {
  const fu = toneOf(chart, '福德宫');
  const ming = majorsOf(chart, '命宫')[0] ?? '';
  const plain = ming ? getStarPlain(ming) : undefined;
  const headline =
    fu === 'strong'
      ? '心性这一格是有福的：你能从自己待着里获得能量，不必靠外界确认。'
      : fu === 'weak'
        ? '心性这一格容易内耗：想得多、放不下，需要一套「把念头落地」的办法。'
        : '心性这一格平：情绪起落正常，但需要主动安排「回血」的时间。';

  const basis = [
    palaceDigest(chart, '福德宫'),
    shaLine(chart, '福德宫'),
    ...(plain ? [`命宫底色（${ming}）：${plain.groups.self}`] : []),
  ];

  const dos = [
    '给自己一个固定的「静下来」动作（写、走、坐，任选其一），每天二十分钟。',
    '把大事拆成下一步能做的动作，这一格怕的是「想完了还是没动」。',
    '留一段不解释、不汇报的时间，用来恢复而不是用来逃。',
  ];
  const avoid = [
    '别用忙碌盖住不安：忙完还在，说明要处理的是心里那件事。',
    '别把自我价值挂在别人的评价上，这一格最容易被一句话带走。',
  ];

  return { key: 'mind', label: '心性', headline, basis, do: dos, avoid, window: windowOf(chart, 'mind') };
}

/** 六维一次算完 */
export function buildAdvice(chart: ZiweiChart): Advice[] {
  return [
    careerAdvice(chart),
    wealthAdvice(chart),
    loveAdvice(chart),
    lifeAdvice(chart),
    healthAdvice(chart),
    mindAdvice(chart),
  ];
}

/**
 * 让模型「只就这一维深挖」的提示词
 * 与解盘提示词同一套纪律：只许引用给到的事实，不许断生死婚期疾病，必须给可执行的下一步。
 */
export function buildAdvicePrompt(chart: ZiweiChart, a: Advice, summary: string): string {
  const ben = getSiHuaByStem(chart.lunarInfo.yearStem);
  return [
    '你在做紫微斗数的解盘，体系是倪海厦一脉（四化、三方四正、宫位联动；不飞星）。',
    '下面是这张盘已经由本地引擎取好的事实，你不要新增事实，也不要改数。',
    '',
    '【盘面事实】',
    summary,
    '',
    `【本命四化】禄 ${ben.禄}／权 ${ben.权}／科 ${ben.科}／忌 ${ben.忌}`,
    '',
    `【本次只谈这一维：${a.label}】`,
    `总判断：${a.headline}`,
    '依据：',
    ...a.basis.map((x) => `- ${x}`),
    '可做：',
    ...a.do.map((x) => `- ${x}`),
    '该避：',
    ...a.avoid.map((x) => `- ${x}`),
    `时间窗口：${a.window}`,
    '',
    '【输出格式，四段，不要多写】',
    `1. 一句话结论（40 字内，直接回答「${a.label}这件事我该怎么做」）`,
    '2. 为什么（把上面依据里的星、宫、四化串成一条因果，3–5 句；每个判断后面用括号标出处，如「（官禄宫 太阳庙）」）',
    '3. 接下来 90 天可以做的三件事（要具体到动作与频率，能今天就开始）',
    '4. 一条最容易踩的坑（写明触发情境与识别信号）',
    '',
    '【硬性禁止】',
    '- 不许断生死、断婚期、断疾病、断发财数额；',
    '- 不许引入上面没有的星曜、宫位、年份；',
    '- 不许写「命中注定」「必然」「一定会」这类判决口气；',
    '- 不许泛泛而谈（如「保持积极心态」），每条都要能落到动作。',
  ].join('\n');
}
