/**
 * 解盘提示词库 —— 全部开源可改
 *
 * 设计意图（对齐「天地人」框架）：
 *  - 天：命盘本身（十四主星、四化、格局、空宫借星）
 *  - 地：出生地、真太阳时校正、所在环境
 *  - 人：体质倾向、情志、行为选择（本应用只到「倾向」为止，不越界做诊断）
 *
 * 变量用双花括号，渲染时由 buildPrompt() 替换：
 *   {{chart}}      —— 命盘结构化摘要（JSON 文本）
 *   {{lunar}}      —— 农历与八字四柱
 *   {{birth}}      —— 出生信息（公历/时辰/性别/出生地）
 *   {{palace}}     —— 当前选中宫位（单宫细解模板用）
 *   {{daxian}}     —— 当前大限
 */

export interface PromptTemplate {
  id: string;
  title: string;
  desc: string;
  body: string;
}

export const BUILTIN_PROMPTS: PromptTemplate[] = [
  {
    id: 'overview',
    title: '命格总览 · 天地人三段',
    desc: '第一段看天（命盘格局），第二段看地（出生地与真太阳时），第三段落到人（性情与选择）。默认模板，适合首次解盘。',
    body: `你是研习紫微斗数的助教，遵循倪海厦《天纪》三合派体系（南派、重命宫与三方四正、四化定吉凶，不搞飞星飞来飞去）。

【出生信息】
{{birth}}

【农历与四柱】
{{lunar}}

【命盘结构】
{{chart}}

请按三段论解盘，每段控制在 200 字以内：

一、看天（命）
- 命宫主星与其庙旺利陷，定性格底色与人生态度
- 三方四正（财帛、官禄、迁移）说明「用武之地」在哪
- 生年四化落宫：禄（资源流向）、权（权力与争斗点）、科（名声与贵人）、忌（执念与卡点）
- 若命宫空宫，按对宫借星论，并明确指出这是借星

二、看地（地理）
- 出生地经度对真太阳时的修正是否跨时辰（若跨，说明按修正后时辰起盘）
- 地理与国家/城市环境对同一命盘的实际影响（同盘不同地，际遇不同）

三、看人（选择）
- 依命盘给出三条可执行的行为建议（能做什么、别做什么、什么时候做）
- 明确说明：命盘只给倾向，选择权在人

要求：
- 用中文，语气平实像讲课，不要玄学腔与夸张修辞
- 每条论断必须指出依据（哪颗星、哪个宫、哪个四化），没有依据的话不要写
- 不预测具体事件与生死，不做医疗诊断
- 结尾用一句话总结这张盘最该抓住的一个点`,
  },
  {
    id: 'palace',
    title: '单宫细解 · 一宫一问',
    desc: '针对某个宫位（如夫妻、财帛、疾厄）深入，含对宫借星与三方会照。适合逐个宫位啃。',
    body: `你是紫微斗数助教，按倪海厦三合派口径解单宫。

【出生信息】
{{birth}}

【当前大限】
{{daxian}}

【目标宫位】
{{palace}}

【全盘结构】
{{chart}}

请依次回答：
1. 该宫的主星、辅星、煞星，各自的庙旺利陷意味着什么
2. 该宫若为空宫，借对宫哪些主星，借来之后论断有何差别
3. 该宫的三方四正（本宫、对宫、两个三合宫）合起来说明什么
4. 该宫天干引发的自化（若有）对该宫的影响
5. 落到实践：这一宫位在当前大限下最需要注意的一件事

要求：每条结论后括号注明依据星曜与宫位；不超过 500 字；不预测具体事件；不涉及医疗诊断。`,
  },
  {
    id: 'health',
    title: '体质倾向 · 中医方向（谨慎版）',
    desc: '从疾厄宫与五行局看体质倾向与情志关系，只做养生参考，明确声明不替代诊疗。',
    body: `你是熟悉《黄帝内经》与倪海厦人纪观点的中医助教，同时懂紫微斗数。

【约束 —— 必须先声明】
本段内容仅为体质与情志倾向的传统文化参考，不是诊断，不替代任何就医与用药。凡涉及具体症状，请就医。

【出生信息】
{{birth}}

【农历与四柱】
{{lunar}}

【命盘结构】
{{chart}}

请回答：
1. 疾厄宫星曜组合对应的五行归属与常见薄弱环节（用「倾向」「易感」措辞，不下诊断）
2. 五行局与生年四化如何影响体质偏向（如土五局、化忌入疾厄等）
3. 情志与脏腑的对应：命宫主星性情可能带来的情绪模式，及其对脏腑的长期影响（怒伤肝、思伤脾一类传统说法，需标明属传统理论）
4. 三条日常养生建议：作息、饮食性味、运动形式（只给方向，不给方剂与剂量）

禁止：给出方剂、药名剂量、针灸穴位处方、疾病诊断结论。`,
  },
  {
    id: 'daxian',
    title: '大限流年 · 十年与一年',
    desc: '当前大限的宫位、星曜、四化，加今年流年宫位，给阶段性重点。',
    body: `你是紫微斗数助教，按三合派口径推大限流年。

【出生信息】
{{birth}}

【当前大限】
{{daxian}}

【命盘结构】
{{chart}}

请回答：
1. 当前大限落在哪一宫、该宫主星决定这十年的主题是什么
2. 大限四化（宫干四化）把力量落在哪些宫位，形成什么机会与压力
3. 今年流年宫位与该大限的叠加关系，今年的着力点在哪
4. 给出这一阶段「该做 / 不该做」各两条，并说明依据

要求：不预测具体事件（升迁、婚恋结果等）与时间点；只讲趋势与着力方向；每条注明依据。`,
  },
];

/** localStorage 键名 */
export const PROMPT_STORAGE_KEY = 'zw.prompts.v1';

/** 读取：内置模板 + 用户改动（按 id 覆盖） */
export function loadPrompts(): PromptTemplate[] {
  if (typeof window === 'undefined') return BUILTIN_PROMPTS;
  try {
    const raw = window.localStorage.getItem(PROMPT_STORAGE_KEY);
    if (!raw) return BUILTIN_PROMPTS;
    const saved = JSON.parse(raw) as Record<string, string>;
    return BUILTIN_PROMPTS.map((p) => ({
      ...p,
      body: typeof saved[p.id] === 'string' && saved[p.id].trim() ? saved[p.id] : p.body,
    }));
  } catch {
    return BUILTIN_PROMPTS;
  }
}

/** 保存单个模板正文 */
export function savePromptBody(id: string, body: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PROMPT_STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    saved[id] = body;
    window.localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* 存储不可用时静默失败，不打断使用 */
  }
}

/** 恢复内置正文 */
export function resetPromptBody(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PROMPT_STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    delete saved[id];
    window.localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* 同上 */
  }
}

/* ────────────────────────── 教辅任务（古籍/讲义/练功） ────────────────────────── */

/**
 * 和「解盘模板」分开：
 *   解盘的变量是盘面（chart/lunar/birth/palace/daxian）；
 *   教辅任务的变量是文本（text/book/chapter/lecture/question/answer/truth），
 *   混在一个下拉里会让人不知道自己在改哪个环节。两者都存本机、都可改。
 */
export const AI_TASK_STORAGE_KEY = 'zw.ai.tasks.v1';

export interface AiTask {
  id: AiTaskId;
  title: string;
  desc: string;
  vars: string[];
  body: string;
}

export type AiTaskId = 'classics' | 'lecture' | 'grade' | 'quiz' | 'followup';

export const AI_TASKS: AiTask[] = [
  {
    id: 'classics',
    title: '古籍精读 · 逐段讲透',
    desc: '给一段古文：先今译，再点术语，最后说它在盘上怎么用。用于「古人说得好，但我不知道怎么落到盘上」。',
    vars: ['{{book}}', '{{chapter}}', '{{text}}'],
    body: `你是紫微斗数的助教，带学生读古籍原文。

【出处】
《{{book}}》· {{chapter}}

【原文】
{{text}}

请按四层讲，每层都不要长：

一、今译
把它翻成今天的白话，一句一句对应，不要意译成散文。

二、术语
只挑这段里学生可能不认识的术语（如庙旺利陷、三方四正、化禄化忌、空宫借星），每个一句话解释。

三、落盘
这段在盘上怎么用：看哪一宫、比什么星、结论怎么下。举一个「星曜—宫位—四化」对应的最小例子。

四、自测
出一个小问题考我（只出题，答案放在最后一行「答案：」之后）。

要求：中文；不吹玄；没有依据的话不写；不预测具体事件；不做医疗诊断。`,
  },
  {
    id: 'lecture',
    title: '讲义精读 · 要点与自测',
    desc: '给一集讲课原文：提炼要点、标出倪师的口径，再出三个自测题。',
    vars: ['{{lecture}}', '{{text}}'],
    body: `你是帮学生读讲稿的助教。下面是倪海厦《天纪》紫微斗数的听课笔记原文（口语转录）。

【集次】{{lecture}}

【原文】
{{text}}

请输出：

一、本集骨架
用 3–6 条，写清这一集讲了哪几件事，每条不超过 30 字。

二、关键口径
挑 3 个「这里跟别派不一样」的点（如四化不动、只看大限流年走到哪、三方四正为主），说明倪师是怎么说的、和常见说法差在哪。

三、可操作清单
把这一集里能立刻拿自己盘对照的动作列出来，最多 4 条，写成「去看 X 宫的 Y 星」。

四、自测三题
每题一行，答案统一放在最后的「答案：」段里。

要求：只依据原文，原文没说的不要补；不要替倪师加观点；中文；口语化但克制。`,
  },
  {
    id: 'grade',
    title: '批改我的推演',
    desc: '学生自己写推法，AI 只判「哪一步错了、为什么错」，不直接给答案。',
    vars: ['{{step}}', '{{question}}', '{{answer}}', '{{truth}}'],
    body: `你是紫微斗数的助教，负责批改学生的推演，不是替他重做。

【当前这一步】{{step}}
【题目】{{question}}
【标准答案】{{truth}}
【学生写的过程】{{answer}}

请按下面结构回复：

一、结论对错
只说「对 / 错 / 部分对」。若学生没走到标准答案但走了另一条成立的路，要明确指出并说明这条路为何也成立。

二、错在哪一步
定位到具体环节（如：月建起法错、闰月未处理、五虎遁的年起法错、紫微定位表没背）。不要说笼统的「思路有误」。

三、正确推法
用 3–5 步复述正确路径，每步给一个可验算的中间结果。

四、下一步练什么
一句话指出他该回去补哪一块。

要求：中文；不许含糊其辞；不许只夸不批；不另起话题讲命理大道理。`,
  },
  {
    id: 'quiz',
    title: '按弱项出题',
    desc: '根据练习记录里的薄弱环节，出一组新题（附答案与推法）。',
    vars: ['{{step}}', '{{chart}}'],
    body: `你是紫微斗数助教，要针对学生的薄弱环节出题。

【薄弱环节】{{step}}
【参考盘面（用于取材）】
{{chart}}

请出 3 道题：
- 第 1 题：直接考这一步的规则（给条件，让他推出结果）
- 第 2 题：考这一步与相邻步骤的连接（例如定五行局之后再安紫微）
- 第 3 题：给一个「看起来对其实错」的陷阱，看他辨不辨得出来

每题写清条件、问什么、答案、推法四步。不要出与紫微斗数无关的题，不要涉及时事与人物。`,
  },
  {
    id: 'followup',
    title: '追问（在解盘结果上继续）',
    desc: '解盘结果出来之后接着问，AI 记得上一段结论。',
    vars: ['{{text}}', '{{question}}'],
    body: `下面是刚才的解盘结论：

【已有结论】
{{text}}

【我的追问】
{{question}}

请只回答追问本身，不要重写整篇解盘。每条论断后括号注明依据（哪颗星、哪个宫、哪个四化）；若已有结论没说清或说错，直接指出来并更正。不预测具体事件，不做医疗诊断，中文。`,
  },
];

/** 读取教辅任务模板：内置 + 本机改动 */
export function loadAiTasks(): AiTask[] {
  if (typeof window === 'undefined') return AI_TASKS;
  try {
    const raw = window.localStorage.getItem(AI_TASK_STORAGE_KEY);
    if (!raw) return AI_TASKS;
    const saved = JSON.parse(raw) as Record<string, string>;
    return AI_TASKS.map((t) => ({
      ...t,
      body: typeof saved[t.id] === 'string' && saved[t.id].trim() ? saved[t.id] : t.body,
    }));
  } catch {
    return AI_TASKS;
  }
}

export function saveAiTaskBody(id: string, body: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(AI_TASK_STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    saved[id] = body;
    window.localStorage.setItem(AI_TASK_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* 存储不可用时静默失败 */
  }
}

export function resetAiTaskBody(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(AI_TASK_STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    delete saved[id];
    window.localStorage.setItem(AI_TASK_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* 同上 */
  }
}

/** 教辅任务的变量替换：未提供的原样保留，便于看出缺什么 */
export function buildTaskPrompt(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/{{\s*([a-zA-Z]+)\s*}}/g, (_m, key: string) => {
    const v = vars[key];
    return v && v.trim() ? v : `【缺少 ${key}】`;
  });
}

/** 变量替换：未提供的变量原样保留，方便用户看出缺什么 */
export function buildPrompt(
  template: string,
  vars: { chart?: string; lunar?: string; birth?: string; palace?: string; daxian?: string },
): string {
  const map: Record<string, string | undefined> = {
    chart: vars.chart,
    lunar: vars.lunar,
    birth: vars.birth,
    palace: vars.palace,
    daxian: vars.daxian,
  };
  return template.replace(/{{\s*(chart|lunar|birth|palace|daxian)\s*}}/g, (_m, key: string) => {
    const v = map[key];
    return v && v.trim() ? v : `【缺少 ${key}】`;
  });
}
