/**
 * 解盘引擎 —— 把一张命盘读成「可核对、可复制、可追问」的判据
 *
 * 为什么要有这一层：
 *   市面上的 AI 解盘大多是「整张盘甩给模型，让它自由发挥」，结果是一段看着像样、
 *   实际上谁都能套的话。普通人真正需要的是：先知道该看哪几处、每一处怎么判、
 *   这一条判语是从盘上哪颗星来的；判错了，能回头查。
 *
 * 所以这里只做一件事：按「五看」的顺序，从盘面取数，生成带出处、带读法、
 * 带失效条件的判据（ReadingPoint）。所有判断都来自类型化字段（星、亮度、四化、
 * 宫位、大限、格局识别），不含主观发挥。
 *
 * 五看：
 *   一定盘 → 二看命宫 → 三看三方四正 → 四看生年四化 → 五看当下大限
 * 六亲、疾厄、财官这类「按需取用」的，放在第六层 gongwei，不主动念一遍十二宫。
 *
 * 本模块纯函数、无副作用，客户端可直接调用。
 */

import type { DaXianSiHua, Palace, Star, StarBrightness, ZiweiChart, SiHua } from './types';
import { BRANCHES, STEMS } from './constants';
import { getSiHuaByStem } from './sihua';
import { detectPatterns } from './patterns';
import { getStarPlain } from './star-plain';

// ─────────────────────────── 类型 ───────────────────────────

export type ReadLayer = 'dingpan' | 'mingge' | 'sanfang' | 'sihua' | 'daxian' | 'gongwei';

export type Verdict = 'good' | 'neutral' | 'caution';

export interface ReadingPoint {
  id: string;
  layer: ReadLayer;
  title: string;
  /** 盘上事实：(宫、星、亮度、四化) —— 只写能核对的 */
  fact: string;
  /** 读法：一句话规则，教人「怎么判」 */
  rule: string;
  /** 结论：白话，落到能感觉到的行为上 */
  reading: string;
  /** 古籍或语料出处 */
  source: string;
  /** 判语方向，用于卡片上色 */
  verdict: Verdict;
  /** 涉及宫位，点「看这一宫」时用 */
  palaceBranch?: number;
  /** 成立前提 / 什么时候这条会失效 —— 防止把判语当判决 */
  caveat?: string;
}

export interface LayerMeta {
  id: ReadLayer;
  ordinal: string;
  name: string;
  /** 这一层要回答的问题 */
  question: string;
  /** 怎么看（方法论，一句话） */
  method: string;
}

export const LAYERS: LayerMeta[] = [
  {
    id: 'dingpan',
    ordinal: '一',
    name: '定盘',
    question: '这张盘，像不像这个人？',
    method: '拿命宫主星的脾气、身宫的着落点去对本人。对不上先怀疑时辰，别急着往下解。',
  },
  {
    id: 'mingge',
    ordinal: '二',
    name: '命宫底色',
    question: '这个人的底子是什么成色？',
    method: '只看命宫：主星是谁、亮不亮、旁边站着贵人还是煞星。命宫是全盘的参照系，它一错，后面全错。',
  },
  {
    id: 'sanfang',
    ordinal: '三',
    name: '三方四正',
    question: '一辈子能借到多少力，要扛多少磨？',
    method: '命、财、官、迁四宫合看。吉星多而煞少＝底盘稳；煞多＝先修心性再谈发财。格局也在这里认。',
  },
  {
    id: 'sihua',
    ordinal: '四',
    name: '生年四化',
    question: '这一生，顺在哪、卡在哪？',
    method: '禄＝顺，权＝争，科＝名，忌＝卡。四条四化落在哪一宫，那一宫就是一生的主战场。这一层最容易被忽略，也最好用。',
  },
  {
    id: 'daxian',
    ordinal: '五',
    name: '当下大限',
    question: '这十年，主题是什么？',
    method: '当前大限宫名＝十年主题；大限禄落宫＝省力处；大限忌落宫＝最费劲处。再看流年只作微调。',
  },
  {
    id: 'gongwei',
    ordinal: '六',
    name: '按需取用',
    question: '具体想问的那件事，该看哪一宫？',
    method: '不问就不念。要问财看财帛、要问事业看官禄、要问关系看夫妻、要问身体看疾厄，各取该宫的主星与煞忌。',
  },
];

// ─────────────────────────── 语料表 ───────────────────────────

/** 宫位管什么（白话） */
const PALACE_ROLE: Record<string, string> = {
  命宫: '整个人的底色与总格，所有判语的参照系',
  兄弟宫: '手足、平辈、合伙，也管「跟人并肩做事」的方式',
  夫妻宫: '亲密关系与伴侣样貌，也管「一对一怎么相处」',
  子女宫: '子女缘，也管作品、桃花、带人的能力',
  财帛宫: '赚钱的方式与现金流，不是「有多少」，而是「怎么来」',
  疾厄宫: '身体与情绪，哪里容易出状况',
  迁移宫: '出门、异地、外界怎么看你，也管「离开熟悉环境后的表现」',
  交友宫: '朋友、下属、人脉，也管「合作里的位置」',
  官禄宫: '事业形态与工作方式，也管「靠什么立身」',
  田宅宫: '不动产、家、仓库，也管「攒得住攒不住」',
  福德宫: '精神消费、兴趣、内在的满足感，也管「快不快乐」',
  父母宫: '长辈、上级、文书、庇荫，也管「有没有靠山」',
};

/** 四化的读法（一句规则） */
const SIHUA_RULE: Record<SiHua, string> = {
  禄: '禄是「顺」：这一宫的事来得自然，有人给、不太费劲。别把它当本事，把它当入口。',
  权: '权是「争」：这一宫你想做主，也容易在这里起摩擦。用力方向对，就不必退。',
  科: '科是「名」：这一宫的事容易被看见、被认可，适合靠「讲清楚、写明白」取胜。',
  忌: '忌是「卡」：这一宫是一生反复的课题，越急越堵；认下来慢慢磨，反成专长。',
};

/** 四化的白话落点（按宫位 × 四化各给一句） */
const SIHUA_READING: Record<SiHua, Record<string, string>> = {
  禄: {
    命宫: '天生的顺在「做自己」这件事上：不装的时候最有说服力，越自然越吃香。',
    兄弟宫: '平辈、合伙上容易得助；开口求人这件事对你来说不丢人，反而常有回音。',
    夫妻宫: '感情里来得顺，容易被人先喜欢；注意别把「顺」当成不用经营。',
    子女宫: '带人、带作品顺，作品容易被接住；也主桃花不缺。',
    财帛宫: '钱来得相对自然，适合「靠本事换钱」而不是「靠算计换钱」。',
    疾厄宫: '身体底子相对能扛，恢复力不错；但顺不等于可以透支。',
    迁移宫: '出门顺，换个环境常有意外之助；你的机会常在「离开熟悉的地方」之后。',
    交友宫: '人脉是你的资源入口，朋友、下属常常主动帮你。',
    官禄宫: '工作上容易遇到给机会的人，事业靠「被人看见」向上走。',
    田宅宫: '家与房子上顺，容易有安身之处；也主攒得住。',
    福德宫: '享受生活这件事你不缺条件，兴趣就是你的补给站。',
    父母宫: '长辈、上级愿意扶你，文书、资格这类事容易过关。',
  },
  权: {
    命宫: '天生要强，做主欲强；好处是有主心骨，坏处是不太肯听人。',
    兄弟宫: '平辈之间容易争主导，合伙要先把权责写清楚。',
    夫妻宫: '关系里你更想说了算，争执常从「谁定」开始。',
    子女宫: '带人时管得细、抓得紧，容易累在「放不下手」。',
    财帛宫: '钱上想掌控，适合自己管账、自己定价，不适合把钱交给别人打理。',
    疾厄宫: '身体上容易硬撑，病也常是累出来的。',
    迁移宫: '在外想争一口气，出门办事敢冲，也容易得罪人。',
    交友宫: '在圈子里想做主，容易当那个「说话算数」的人，也容易被推着担责。',
    官禄宫: '事业上有主导欲，适合能拍板的岗位；不适合事事请示的位置。',
    田宅宫: '家产、房子上想自己做主，容易为此与家人较劲。',
    福德宫: '精神上不肯将就，享受也要按自己的方式来。',
    父母宫: '与长辈、上级之间容易有角力；你的成长常是「反着长辈走」出来的。',
  },
  科: {
    命宫: '气质里有「清」的一面，容易被评价为有教养、有分寸。',
    兄弟宫: '平辈间靠讲理、讲清楚来相处，名声在熟人中传。',
    夫妻宫: '感情里重「体面」，也容易因对方的评价而起伏。',
    子女宫: '作品、名声类的事容易出彩，适合做出可署名的东西。',
    财帛宫: '钱靠「名声、专业、口碑」来，不适合闷声赚快钱。',
    疾厄宫: '对身体敏感，容易因过度在意而紧张。',
    迁移宫: '在外名声不错，适合靠形象与表达打开局面。',
    交友宫: '圈子里的名声是你的资源，靠「靠谱」二字攒人。',
    官禄宫: '事业靠专业名声立身，适合走「被认可」的路，而非「被使唤」的路。',
    田宅宫: '住得讲究，也重「家的样子」。',
    福德宫: '精神生活讲究品质，读书、审美是你的补给。',
    父母宫: '文书、学历、资格类的事顺；长辈面前容易被夸。',
  },
  忌: {
    命宫: '这一生最容易「卡在自我」上：想证明自己，又常被自己绊住。学会降低对自己的苛求。',
    兄弟宫: '平辈、合伙是反复的课题：借钱、拆伙、误会容易重演。合作先立字据。',
    夫妻宫: '感情是重灾区也是必修课：易反复、易拉扯；先学会把话说完，再谈输赢。',
    子女宫: '子女缘或作品上容易操心、反复；急不得，慢工才出。',
    财帛宫: '钱是反复的卡点：现金流容易紧、易为钱焦虑。先把「稳定现金流」放第一位，再谈投资。',
    疾厄宫: '身体是最该留意的一宫：容易旧病复发，别拖、别硬撑，定期查。',
    迁移宫: '出门、异地容易出岔子；行程留余量，别把计划排满。',
    交友宫: '人脉上易受拖累：帮人反被怨、合作被放鸽子。留一手，不轻易做担保。',
    官禄宫: '事业上反复卡壳：换赛道、换岗位常遇阻。别急着跳，先把手上的事做穿。',
    田宅宫: '家与房子是课题：买卖、搬迁、家里的事容易反复。大额置产要多一轮冷静期。',
    福德宫: '心里容易不安，情绪内耗是常态；养成一个「能自己消化的出口」。',
    父母宫: '与长辈、上级的缘分带磨；文书、合同要反复核对。',
  },
};

/** 身宫落宫 → 中年之后的着力点 */
const SHEN_GONG_MEANING: Record<string, string> = {
  命宫: '身命同宫：一生都在「做自己」这件事上用力，性格即命运，改脾气就是改命。',
  兄弟宫: '中年后重心落在「同行、搭档」上，成败多与身边的人有关。',
  夫妻宫: '中年后重心落在关系上：伴侣与家庭的状态，直接决定你的精神水位。',
  子女宫: '中年后重心落在「带人、带作品、带下一代」上。',
  财帛宫: '中年后重心落在钱与资源上：赚得到，也要守得住。',
  疾厄宫: '中年后重心落在身体上：健康就是你的本钱，别拿命换。',
  迁移宫: '中年后重心在「外面」：异地、外部市场、走出去才有戏。',
  交友宫: '中年后重心在人脉与团队上：靠人成事，也因人翻船。',
  官禄宫: '中年后重心落在事业与位置上：工作即身份。',
  田宅宫: '中年后重心落在家庭、不动产与「守住基本盘」上。',
  福德宫: '中年后重心落在精神生活上：内在安稳，外在才顺。',
  父母宫: '中年后重心落在长辈、上级或「名分、资格」上。',
};

// ─────────────────────────── 小工具 ───────────────────────────

const SHA_HARD = ['擎羊', '陀罗', '火星', '铃星'];
const SHA_KONG = ['地空', '地劫'];
const SHA_ALL = [...SHA_HARD, ...SHA_KONG];
const LUCKY_STARS = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马'];
/** 亮度三档 */
const BRIGHT_HIGH: StarBrightness[] = ['庙', '旺'];
const BRIGHT_LOW: StarBrightness[] = ['不', '闲', '陷'];

/** 宫名保留「宫」字（古籍与界面都这么叫），只在这里集中处理，便于以后改口径 */
function shortName(name: string): string {
  return name;
}

/** 去掉「宫」字，仅用于比较与 JSON 键 */
function baseName(name: string): string {
  return name.replace(/宫$/, '');
}

function palaceOf(chart: ZiweiChart, branch: number): Palace | undefined {
  return chart.palaces.find((p) => p.branch === ((branch % 12) + 12) % 12);
}

function palaceByName(chart: ZiweiChart, name: string): Palace | undefined {
  return chart.palaces.find((p) => baseName(p.name) === baseName(name));
}

function majorStars(p: Palace): Star[] {
  return p.stars.filter((s) => s.type === 'major');
}

function starLabel(s: Star): string {
  const b = s.brightnessRaw ? `[${s.brightnessRaw}]` : '';
  const h = s.siHua ? `(化${s.siHua})` : '';
  return `${s.name}${b}${h}`;
}

function starList(p: Palace, filter?: (s: Star) => boolean): string {
  const arr = filter ? p.stars.filter(filter) : p.stars;
  return arr.map(starLabel).join('、') || '（无星）';
}

/** 命宫三方四正：命、财（+4）、官（+8）、迁（+6） */
function sanfangBranches(ming: number): number[] {
  return [ming, (ming + 4) % 12, (ming + 8) % 12, (ming + 6) % 12];
}

function whereIsStar(chart: ZiweiChart, starName: string): Palace | undefined {
  return chart.palaces.find((p) => p.stars.some((s) => s.name === starName));
}

function palaceTitle(p: Palace | undefined): string {
  if (!p) return '（未落宫）';
  const n = shortName(p.name);
  return `${BRANCHES[p.branch]}${n.endsWith('宫') ? n : `${n}宫`}`;
}

/** 主星判语：一眼看出「亮不亮」 */
function brightnessVerdict(p: Palace): { verdict: Verdict; text: string } {
  const majors = majorStars(p);
  if (!majors.length) return { verdict: 'neutral', text: '空宫' };
  const brights = majors.map((s) => s.brightnessRaw).filter(Boolean) as StarBrightness[];
  const high = brights.filter((b) => BRIGHT_HIGH.includes(b)).length;
  const low = brights.filter((b) => BRIGHT_LOW.includes(b)).length;
  if (high > low) {
    return { verdict: 'good', text: `主星得地（${brights.join('、') || '无亮度注'}）：这一宫的能量足，做事有底气，别人也容易信你。` };
  }
  if (low > high) {
    return { verdict: 'caution', text: `主星落弱（${brights.join('、') || '无亮度注'}）：不是说命不好，而是这一宫的事需要后天补——靠环境、靠手艺、靠贵人，别指望天赐。` };
  }
  return { verdict: 'neutral', text: `主星平度（${brights.join('、') || '无亮度注'}）：不上不下，成色取决于同宫的辅星与四化，看后面几条。` };
}

function shaCount(p: Palace, list: string[] = SHA_ALL): number {
  return p.stars.filter((s) => list.includes(s.name)).length;
}

function luckyCount(p: Palace): number {
  return p.stars.filter((s) => LUCKY_STARS.includes(s.name)).length;
}

// ─────────────────────────── 五看取数 ───────────────────────────

function buildDingPan(chart: ZiweiChart): ReadingPoint[] {
  const ming = palaceOf(chart, chart.mingGongBranch);
  const shen = palaceOf(chart, chart.shenGongBranch);
  if (!ming) return [];
  const majors = majorStars(ming);
  const majorNames = majors.map((s) => s.name);
  const borrowed = ming.isEmpty ? ming.borrowedStars ?? [] : [];
  const mainStar = majorNames[0] ?? borrowed[0] ?? '';
  const plain = mainStar ? getStarPlain(mainStar) : undefined;

  // 用「说人话」卡片里最可被本人验证的三段来定盘：性格、路数、身体。
  // 注意不要拿卡的「喜/忌」当自检 —— 那几项写的是「喜见什么星」，不是人的偏好。
  const checks: string[] = [];
  if (plain) {
    checks.push(`性格：${plain.person}`);
    checks.push(`路数：${plain.groups.career}`);
    checks.push(`身体：${plain.groups.health}`);
  }
  const shenName = shen ? shortName(shen.name) : '';

  const fact = [
    `${BRANCHES[chart.mingGongBranch]}宫 · 命宫`,
    majors.length ? `主星：${majors.map(starLabel).join('、')}` : `空宫，借对宫 ${ming.borrowedFromName ?? ''}（${borrowed.join('、') || '无'}）`,
    `身宫：${BRANCHES[chart.shenGongBranch]}宫 · ${shenName}`,
    `五行局：${chart.wuxingJuName}`,
    [chart.mingZhu ? `命主 ${chart.mingZhu}` : '', chart.shenZhu ? `身主 ${chart.shenZhu}` : ''].filter(Boolean).join('　'),
  ].filter(Boolean).join('　·　');

  const points: ReadingPoint[] = [
    {
      id: 'dingpan-1',
      layer: 'dingpan',
      title: '先核对：这张盘像不像你',
      fact,
      rule: '主星定气质，身宫定后半生的落点。性格、路数、身体这三条里对不上两条以上，先别解，换相邻时辰各起一盘比对。',
      reading: [
        plain ? `${mainStar}的底色：${plain.oneLine}。` : `命宫无主星，看借来的 ${borrowed.join('、') || '对宫'} 星。`,
        plain ? plain.groups.self : '',
        shenName ? SHEN_GONG_MEANING[shenName] ?? '' : '',
      ].filter(Boolean).join('\n'),
      source: '星曜白话卡 · 据《紫微斗数全书》诸星问答',
      verdict: 'neutral',
      palaceBranch: ming.branch,
      caveat: `这张盘建立在「${BRANCHES[chart.birthInfo.hour]}时」这个前提上；时辰差一个，命宫与身宫都会移位，整盘判语随之作废。`,
    },
    ...(checks.length
      ? [{
          id: 'dingpan-2',
          layer: 'dingpan' as ReadLayer,
          title: '三条自检：性格 · 路数 · 身体',
          fact: `取自 ${mainStar} 的白话卡（性格 / 适合的路 / 身体倾向）`,
          rule: '这三条是盘上最容易拿来自证的：拿自己、也拿身边熟人对一遍，对不上两条以上，就该怀疑时辰。',
          reading: checks.join('\n'),
          source: `星曜白话卡 · ${mainStar}`,
          verdict: 'neutral' as Verdict,
          palaceBranch: ming.branch,
          caveat: '性格描述是概率性的，不是判决。人对自己的认知也有偏差，最好找熟人替你勾一遍。',
        }]
      : []),
  ];
  return points;
}

function buildMingGe(chart: ZiweiChart): ReadingPoint[] {
  const ming = palaceOf(chart, chart.mingGongBranch);
  if (!ming) return [];
  const out: ReadingPoint[] = [];

  const bv = brightnessVerdict(ming);
  if (!ming.isEmpty) {
    out.push({
      id: 'mingge-1',
      layer: 'mingge',
      title: `命宫成色：${majorStars(ming).map((s) => s.name).join('、')}`,
      fact: `命宫 ${BRANCHES[ming.branch]} · ${starList(ming)}`,
      rule: '庙旺＝能量足，说话有人听；平度＝看辅星；落弱＝靠后天补，别把「弱」当命定。',
      reading: `${bv.text}${majorStars(ming)[0] ? `\n${majorStars(ming)[0].name} 当命，主事的方式是「${getStarPlain(majorStars(ming)[0].name)?.hua ?? ''}」这一路。` : ''}`,
      source: '《紫微斗数全书·十二宫诸星得地合格诀》',
      verdict: bv.verdict,
      palaceBranch: ming.branch,
      caveat: '亮度只影响「表达得顺不顺」，不决定成败；同宫的辅煞与四化权重更高。',
    });
  } else {
    out.push({
      id: 'mingge-1',
      layer: 'mingge',
      title: '命宫空宫：借对宫的星',
      fact: `命宫 ${BRANCHES[ming.branch]} 无主星，借 ${ming.borrowedFromName ?? '对宫'}（${ming.borrowedStars?.join('、') || '无'}）`,
      rule: '空宫不是没命，是「主体随环境而变」：换个圈子就换一个人，环境对你的塑造比别人强。',
      reading: `你的性格更像「映照」而不是「固定」：在什么圈子、跟什么人，就会长出什么样子。借来的星隔了一层，力量打折——所以选环境比努力更重要。`,
      source: '《紫微斗数全书·空宫借星说》',
      verdict: 'neutral',
      palaceBranch: ming.branch,
      caveat: '借星只管「像不像」，不算该宫的实际吉凶；吉凶要看对宫本身的煞忌。',
    });
  }

  // 辅煞结构：决定「靠自己还是靠人」
  const lucky = luckyCount(ming);
  const sha = shaCount(ming);
  if (lucky > 0 || sha > 0) {
    const parts: string[] = [];
    parts.push(`吉星 ${lucky} 颗${lucky ? `（${ming.stars.filter((s) => LUCKY_STARS.includes(s.name)).map((s) => s.name).join('、')}）` : ''}`);
    parts.push(`煞星 ${sha} 颗${sha ? `（${ming.stars.filter((s) => SHA_ALL.includes(s.name)).map((s) => s.name).join('、')}）` : ''}`);
    let reading = '';
    let verdict: Verdict = 'neutral';
    if (lucky >= 2 && sha === 0) {
      reading = '命宫干净，贵人多、磨少：你走得顺不是偶然，是身边总有人递手。别把顺当理所当然，也别因为顺而轻敌。';
      verdict = 'good';
    } else if (sha >= 2) {
      reading = '命宫带煞，磨多：从小就比同龄人多扛一些事。这类盘不适合「等运气」，适合「练手艺」——煞星磨出来的耐性，恰是你后来的本钱。';
      verdict = 'caution';
    } else if (sha === 1) {
      reading = '命宫一颗煞：一生有一处反复卡你的地方，通常表现为「同一个毛病犯几次」。认出它，就是止损。';
      verdict = 'neutral';
    } else {
      reading = '命宫辅星不多：做事主要靠自己，贵人是加分不是常态。把「自己能干」当第一策略。';
      verdict = 'neutral';
    }
    out.push({
      id: 'mingge-2',
      layer: 'mingge',
      title: '命宫的人事结构：靠人还是靠己',
      fact: `命宫 ${BRANCHES[ming.branch]}：${parts.join('　·　')}`,
      rule: '吉多煞少＝靠人成事；煞多吉少＝靠手艺成事；一两颗煞＝一生有一处反复。',
      reading,
      source: '《紫微斗数全书·诸星问答》 ＋ 倪师《天纪》讲义',
      verdict,
      palaceBranch: ming.branch,
      caveat: '辅煞只在命宫时代表「你的性格配置」；同一颗煞落在别的宫，事就不同。',
    });
  }

  // 身宫（若与命宫不同）
  if (chart.shenGongBranch !== chart.mingGongBranch) {
    const shen = palaceOf(chart, chart.shenGongBranch);
    const shenName = shen ? shortName(shen.name) : '';
    out.push({
      id: 'mingge-3',
      layer: 'mingge',
      title: `身宫在${shenName}：后半生往哪使劲`,
      fact: `身宫 ${BRANCHES[chart.shenGongBranch]}${shenName} · ${shen ? starList(shen) : ''}`,
      rule: '身宫是「三十岁之后真正在意的那个东西」；它与命宫不同宫时，人生前后半场的重心会明显换位。',
      reading: SHEN_GONG_MEANING[shenName] ?? '',
      source: '《紫微斗数全书·身命论》',
      verdict: 'neutral',
      palaceBranch: shen?.branch,
      caveat: '身宫管「着力点」，不管吉凶；吉凶仍看该宫本身的星曜与四化。',
    });
  }
  return out;
}

function buildSanFang(chart: ZiweiChart): ReadingPoint[] {
  const ming = palaceOf(chart, chart.mingGongBranch);
  if (!ming) return [];
  const branches = sanfangBranches(chart.mingGongBranch);
  const palaces = branches.map((b) => palaceOf(chart, b)).filter(Boolean) as Palace[];

  const luckyNames: string[] = [];
  const shaNames: string[] = [];
  for (const p of palaces) {
    for (const s of p.stars) {
      if (LUCKY_STARS.includes(s.name)) luckyNames.push(`${s.name}(${shortName(p.name)})`);
      if (SHA_ALL.includes(s.name)) shaNames.push(`${s.name}(${shortName(p.name)})`);
    }
  }

  const fact = palaces
    .map((p) => `${shortName(p.name)}(${BRANCHES[p.branch]})：${majorStars(p).map((s) => s.name).join('、') || '空宫'}`)
    .join('　｜　');

  let verdict: Verdict = 'neutral';
  let reading = '';
  if (luckyNames.length >= 3 && shaNames.length <= 1) {
    verdict = 'good';
    reading = `吉星会照 ${luckyNames.length} 颗、煞 ${shaNames.length} 颗：底盘稳。你的路是「顺着走就能上去」的那种，重点不在拼命，在别走错方向、别把好牌打散。`;
  } else if (shaNames.length >= 3) {
    verdict = 'caution';
    reading = `煞星会照 ${shaNames.length} 颗：一辈子「磨」比「顺」多。这类盘的正确打法是先修心性、再谈事业——心一乱，钱与关系都守不住；心定了，煞反成狠劲。`;
  } else if (luckyNames.length >= 1 && shaNames.length >= 1) {
    reading = `吉 ${luckyNames.length}、煞 ${shaNames.length} 交错：你属于「有贵人也有对手」的路数，成败常取决于关键那一次站队。`;
  } else {
    reading = `三方吉煞都少：格局平实，人生起伏不大。这种盘最适合「一门手艺吃到底」，不必追风口。`;
  }
  if (shaNames.length) reading += `\n要点：${shaNames.join('、')} 会照，别在该让的时候硬顶。`;

  const out: ReadingPoint[] = [
    {
      id: 'sanfang-1',
      layer: 'sanfang',
      title: '三方四正：底盘稳不稳',
      fact,
      rule: '命、财、官、迁四宫一起看：吉多煞少＝有人托；煞多＝自己扛，先修心。',
      reading: `${reading}\n吉星：${luckyNames.join('、') || '无'}　煞星：${shaNames.join('、') || '无'}`,
      source: '《骨髓赋》 · 三方四正会照法',
      verdict,
      palaceBranch: ming.branch,
      caveat: '会照是「隔着宫位的力量」，比本宫弱一级；煞星会照多主「过程辛苦」，不主结果坏。',
    },
  ];

  // 格局：用既有识别器，取最强的两条
  try {
    const patterns = detectPatterns(chart)
      .filter((p) => p.level === 'excellent' || p.level === 'good' || p.level === 'caution')
      .slice(0, 2);
    for (const [i, pat] of patterns.entries()) {
      out.push({
        id: `sanfang-ge-${i}`,
        layer: 'sanfang',
        title: `格局：${pat.name}`,
        fact: `涉及宫位：${pat.palaces.join('、') || '—'}　成立条件：${pat.conditions?.required?.join('；') || '—'}`,
        rule: '格局是「一组星凑成的固定结构」，成格看必要条件，破格看警示项。成格不等于必发，破格也不等于必败。',
        reading: `${pat.description}${pat.conditions?.breaking?.length ? `\n破格警示：${pat.conditions.breaking.join('；')} —— 出现这些，格局打折。` : ''}`,
        source: pat.source ?? '《紫微斗数全书·诸格局》',
        verdict: pat.level === 'caution' ? 'caution' : pat.level === 'excellent' || pat.level === 'good' ? 'good' : 'neutral',
        caveat: '格局是古人对「结构」的命名，用来快速归类，不是吉凶判决书。',
      });
    }
  } catch {
    // 格局识别失败不影响其它判据
  }
  return out;
}

function buildSiHua(chart: ZiweiChart): ReadingPoint[] {
  const out: ReadingPoint[] = [];
  const order: SiHua[] = ['禄', '权', '科', '忌'];
  for (const hua of order) {
    const star = chart.palaces
      .flatMap((p) => p.stars)
      .find((s) => s.siHua === hua);
    if (!star) continue;
    const p = whereIsStar(chart, star.name);
    if (!p) continue;
    const name = shortName(p.name);
    // 宫名在不同数据源里可能带或不带「宫」字，取语料时两种都试，避免判语出现空句
    const role = PALACE_ROLE[name] ?? PALACE_ROLE[`${baseName(name)}宫`] ?? '';
    const specific = SIHUA_READING[hua]?.[name] ?? SIHUA_READING[hua]?.[`${baseName(name)}宫`] ?? '';
    const disp = name.endsWith('宫') ? name : `${name}宫`;
    out.push({
      id: `sihua-${hua}`,
      layer: 'sihua',
      title: `生年化${hua}：${star.name} 落 ${disp}`,
      fact: `${star.name}${star.brightnessRaw ? `[${star.brightnessRaw}]` : ''} 化${hua}，坐 ${BRANCHES[p.branch]} · ${disp}（${p.stars.map(starLabel).join('、') || '无'}）`,
      rule: SIHUA_RULE[hua],
      reading: [`这一宫管：${role}。`, specific].filter(Boolean).join('\n'),
      source:
        hua === '忌'
          ? '《紫微斗数全书·四化论》 · 倪师「忌为收藏、为执着」之说'
          : '《紫微斗数全书·四化论》',
      verdict: hua === '忌' ? 'caution' : hua === '禄' ? 'good' : 'neutral',
      palaceBranch: p.branch,
      caveat:
        hua === '忌'
          ? '忌不是灾，是「注意力被锁住的地方」；它常在同一个主题上反复，改法不是硬冲，而是换一种处理方式。'
          : '四化是「气」的走向，落宫只说明落在哪一领域，强度还要看该宫主星庙陷与同宫煞忌。',
    });
  }
  return out;
}

function buildDaXian(chart: ZiweiChart): ReadingPoint[] {
  const d =
    chart.daXians.find((x) => x.startAge <= chart.currentAge && x.endAge >= chart.currentAge) ??
    chart.daXians[chart.currentDaXianIndex];
  if (!d) return [];
  const p = palaceOf(chart, d.palaceBranch);
  // 大限的 palaceName 有的数据源带「宫」字，有的不带 —— 统一补齐
  const name = d.palaceName.endsWith('宫') ? d.palaceName : `${d.palaceName}宫`;
  // 大限四化优先用已算好的；缺失时按「大限宫的宫干」补算
  // （chart.daXians 目前只带宫位与年龄，不带干，所以这里从宮位取 stem）
  const dxStem = typeof d.stemIndex === 'number' ? d.stemIndex : p?.stem;
  const sihua: DaXianSiHua | undefined =
    d.siHua ??
    (typeof dxStem === 'number'
      ? (() => {
          const map = getSiHuaByStem(dxStem);
          return {
            stemIndex: dxStem,
            stemName: d.stemName ?? STEMS[dxStem] ?? '',
            lu: map['禄'],
            quan: map['权'],
            ke: map['科'],
            ji: map['忌'],
          };
        })()
      : undefined);

  const luPalace = sihua ? whereIsStar(chart, sihua.lu) : undefined;
  const jiPalace = sihua ? whereIsStar(chart, sihua.ji) : undefined;

  const out: ReadingPoint[] = [
    {
      id: 'daxian-1',
      layer: 'daxian',
      title: `当下大限：${d.startAge}–${d.endAge} 岁走 ${name}`,
      fact: [
        `大限落 ${BRANCHES[d.palaceBranch]}宫 · ${name}${sihua?.stemName ? `（宫干${sihua.stemName}）` : ''}`,
        p ? `本宫星曜：${starList(p)}` : '',
        sihua ? `大限四化：禄${sihua.lu}／权${sihua.quan}／科${sihua.ke}／忌${sihua.ji}` : '',
      ].filter(Boolean).join('　·　'),
      rule: '大限宫名＝这十年的主题；大限禄落宫＝省力处；大限忌落宫＝最费劲处。三者合看，就知道这十年该攻还是该守。',
      reading: [
        `十年主题：${name}。${PALACE_ROLE[name] ?? PALACE_ROLE[`${baseName(name)}宫`] ?? ''}`,
        luPalace ? `省力处：大限化禄入 ${palaceTitle(luPalace)}——这十年往这个方向使劲，回报最顺。` : '',
        jiPalace ? `费劲处：大限化忌入 ${palaceTitle(jiPalace)}——这十年在这里最容易反复受阻，别在这里加杠杆。` : '',
      ].filter(Boolean).join('\n'),
      source: '《紫微斗数全书·大限论》',
      verdict: 'neutral',
      palaceBranch: d.palaceBranch,
      caveat: '大限看十年大势，不判单年吉凶；具体到某一年还要叠流年四化，且大限只给方向，不给结果。',
    },
  ];
  return out;
}

function buildGongWei(chart: ZiweiChart): ReadingPoint[] {
  const picks: { name: string; ask: string }[] = [
    { name: '财帛', ask: '钱从哪来、漏在哪' },
    { name: '官禄', ask: '靠什么立身' },
    { name: '夫妻', ask: '关系里怎么相处' },
    { name: '疾厄', ask: '身体该防什么' },
  ];
  const out: ReadingPoint[] = [];
  for (const pk of picks) {
    const p = palaceByName(chart, pk.name);
    if (!p) continue;
    const majors = majorStars(p);
    const sha = shaCount(p);
    const lucky = luckyCount(p);
    const hua = p.stars.find((s) => s.siHua);
    const bv = brightnessVerdict(p);
    const opp = palaceOf(chart, (p.branch + 6) % 12);

    const lines: string[] = [];
    lines.push(`要问「${pk.ask}」，先看这一宫。这一宫管：${PALACE_ROLE[`${pk.name}宫`] ?? ''}`);
    lines.push(
      majors.length
        ? `${majors.map((s) => s.name).join('、')}坐宫：${bv.text}`
        : `空宫，借对宫 ${p.borrowedFromName ?? ''}——这一块「没有固定的样貌」，随环境与人而变。`,
    );
    if (hua && hua.siHua) {
      const huaType = hua.siHua;
      lines.push(`本宫带生年化${huaType}（${hua.name}）：${SIHUA_READING[huaType][`${pk.name}宫`] ?? ''}`);
    }
    if (sha) lines.push(`煞 ${sha} 颗（${p.stars.filter((s) => SHA_ALL.includes(s.name)).map((s) => s.name).join('、')}）：这一宫的过程会磨，别指望一次到位。`);
    else lines.push('无煞：这一宫的过程相对平顺。');
    if (lucky) lines.push(`辅星 ${lucky} 颗：有外面的助力。`);
    if (opp) lines.push(`对宫 ${shortName(opp.name)}（${opp.stars.map((s) => s.name).join('、') || '空'}）会来冲照：这一宫的事，常被对面那一宫牵着走。`);

    out.push({
      id: `gongwei-${pk.name}`,
      layer: 'gongwei',
      title: `问${pk.ask}：看${pk.name}宫`,
      fact: `${BRANCHES[p.branch]}宫 · ${pk.name}宫　${starList(p)}`,
      rule: '先认主星（做什么像什么），再看煞忌（过程磨不磨），最后看对宫（外部牵制）。',
      reading: lines.join('\n'),
      source: '《紫微斗数全书·十二宫论断》',
      verdict: bv.verdict,
      palaceBranch: p.branch,
      caveat: '单宫不足以断事：这一宫的事一定与三方（各差四宫）和对宫联动，别只看一格。',
    });
  }
  return out;
}

/** 生成全部判据（按五看顺序） */
export function buildReading(chart: ZiweiChart): ReadingPoint[] {
  return [
    ...buildDingPan(chart),
    ...buildMingGe(chart),
    ...buildSanFang(chart),
    ...buildSiHua(chart),
    ...buildDaXian(chart),
    ...buildGongWei(chart),
  ];
}

/** 按层分组 */
export function groupReading(points: ReadingPoint[]): { meta: LayerMeta; points: ReadingPoint[] }[] {
  return LAYERS.map((meta) => ({ meta, points: points.filter((p) => p.layer === meta.id) })).filter(
    (g) => g.points.length > 0,
  );
}

// ─────────────────────────── 七问 ───────────────────────────

export interface ReadingQuestion {
  id: string;
  /** 问句本身（第一人称，像本人会问的） */
  text: string;
  /** 为什么先问这个 */
  why: string;
  /** 从盘上取好的证据行 */
  evidence: string[];
  /** 涉及宫位 */
  palaceBranch?: number;
}

/** 解盘七问：由轻到重，先认人，再认路，再认当下 */
export function buildQuestions(chart: ZiweiChart): ReadingQuestion[] {
  const points = buildReading(chart);
  const pick = (ids: string[]) => points.filter((p) => ids.includes(p.id)).map((p) => `${p.title}｜${p.fact}`);
  const ming = palaceOf(chart, chart.mingGongBranch);
  const name = ming ? shortName(ming.name) : '命';

  return [
    {
      id: 'q1',
      text: '我到底是什么样的人？别人眼里的我，和我以为的我，差在哪？',
      why: '认人是解盘的起点。这一问答偏了，后面每一问都会跟着偏。',
      evidence: pick(['dingpan-1', 'mingge-1', 'mingge-2']),
      palaceBranch: chart.mingGongBranch,
    },
    {
      id: 'q2',
      text: '我这辈子靠什么本事吃饭？什么路我不适合走？',
      why: '命宫看底色，官禄看形态，三方看有没有人托——三处合起来才是「靠什么立身」。',
      evidence: pick(['sanfang-1', 'gongwei-官禄']),
      palaceBranch: palaceByName(chart, '官禄')?.branch,
    },
    {
      id: 'q3',
      text: '我的钱一般从哪来、又容易漏在哪？',
      why: '财帛看「怎么来」，田宅看「守不守得住」，生年禄忌看「顺与卡」。',
      evidence: pick(['gongwei-财帛', 'sihua-禄', 'sihua-忌']),
      palaceBranch: palaceByName(chart, '财帛')?.branch,
    },
    {
      id: 'q4',
      text: '眼下这十年，主题是什么？我该攻，还是该守？',
      why: '大限给十年基调，比流年更值得参考；很多人卡住，是因为用错了十年的打法。',
      evidence: pick(['daxian-1', 'sanfang-1']),
      palaceBranch: chart.daXians.find((d) => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge)?.palaceBranch,
    },
    {
      id: 'q5',
      text: '我在关系里是什么模式？为什么总是同一类问题反复出现？',
      why: '夫妻宫看一对一，子女与交友看「带人」与「被带」，生年忌常指向反复的那一处。',
      evidence: pick(['gongwei-夫妻', 'sihua-忌', 'sihua-权']),
      palaceBranch: palaceByName(chart, '夫妻')?.branch,
    },
    {
      id: 'q6',
      text: '身体上我该防什么？哪个部位或哪类毛病容易反复？',
      why: '疾厄宫看底子，煞忌落宫看「磨在哪」。这一问只作提醒，不作诊断。',
      evidence: pick(['gongwei-疾厄', 'sihua-忌']),
      palaceBranch: palaceByName(chart, '疾厄')?.branch,
    },
    {
      id: 'q7',
      text: '最近这段时间，我最该做与最该避免的一件事是什么？',
      why: '把大限、忌宫、当下处境合起来，才落得到「这周能做的一件小事」。',
      evidence: pick(['daxian-1', 'sihua-忌', 'mingge-2']),
      palaceBranch: chart.mingGongBranch,
    },
  ];
}

/** 把一条判据 / 一个问题，拼成可编辑的提示词 */
export function buildAskPrompt(chart: ZiweiChart, opts: { question?: ReadingQuestion; point?: ReadingPoint; summary: string }): string {
  const evidence = opts.question
    ? opts.question.evidence
    : opts.point
      ? [`${opts.point.title}｜${opts.point.fact}`, `读法：${opts.point.rule}`, `初步判语：${opts.point.reading}`]
      : [];

  return [
    '你是紫微斗数的解盘助手。要求：讲人话、不吓人、不上玄学腔；每一条结论都必须能指回盘上的某一颗星，指不回去的就不许写。',
    '',
    '【盘面事实】（唯一可用的事实来源，不得自行增删星曜或改宫位）',
    opts.summary,
    '',
    evidence.length ? '【已提取的关键判据】' : '',
    ...evidence.map((e, i) => `${i + 1}. ${e}`),
    '',
    opts.question ? '【这次只回答这一个问题】' : '【这次只解读这一条判据】',
    opts.question ? opts.question.text : `${opts.point?.title}\n${opts.point?.reading}`,
    '',
    '【输出格式，必须照写】',
    '一、盘上依据：3–5 条，每条格式「宫位 + 星曜/四化 + 亮度或结构 → 所以…」，只许引用上面的事实。',
    '二、白话结论：先一句总的，再分 2–3 点，150 字内，不用术语。',
    '三、什么情况下这条不成立：写 1–2 条具体的（比如时辰偏差、大限未到、同宫煞忌抵消）。',
    '四、可执行建议：3 条，要具体到「这周能做的事」，不要「多沟通」「要努力」这类空话。',
    '',
    '【硬性禁止】不断生死、不断寿数、不断婚期、不断疾病诊断、不做绝对化断言（一定/必然/注定）；',
    '命盘只讲倾向与用力方向，选择权在本人。',
  ]
    .filter(Boolean)
    .join('\n');
}
