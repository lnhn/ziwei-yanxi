'use client';

/**
 * PracticeManual —— 手工推盘手册（/study/practice 下半页）
 *
 * 目的不是「把书抄一遍」，而是让第一次推盘的人真的能落笔：
 *   每一步都按同一套骨架写 —— 一句口诀 → 拆成能照做的算术 → 一个真算例 → 常见错 → 自检。
 * 算例全部用 1984-02-03 卯时（男）这一张盘，与引擎现算的结果一致，
 * 所以照着抄一遍，得到的答案与页面上半部分的判分完全对得上。
 */

import { useState } from 'react';
import { PAPER_COLORS as C, SIHUA_COLORS, mix } from './paper';
import { FONT, T, SHAPE } from './type';

type Block =
  | { t: 'p'; text: string }
  | { t: 'formula'; lines: string[] }
  | { t: 'example'; lines: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'warn'; text: string }
  | { t: 'check'; text: string };

type Step = { title: string; sub: string; blocks: Block[] };

const STEPS: Step[] = [
  {
    title: '农历换算',
    sub: '把公历生日换成「农历月 + 农历日 + 时支」三样东西',
    blocks: [
      { t: 'p', text: '紫微斗数整套规则都建立在农历上：生月决定命宫起点，生日决定紫微落宫。所以第一步不是算命，是换算。' },
      { t: 'formula', lines: ['要取出的三个数：', '农历月 M（正月 = 1，冬月 = 11，腊月 = 12）', '农历日 D（初一 = 1 … 三十 = 30）', '时支 T（子 0、丑 1、寅 2、卯 3 … 亥 11）'] },
      { t: 'table', head: ['时辰', '钟点', '时支序'], rows: [
        ['子', '23:00–01:00', '0'], ['丑', '01:00–03:00', '1'], ['寅', '03:00–05:00', '2'], ['卯', '05:00–07:00', '3'],
        ['辰', '07:00–09:00', '4'], ['巳', '09:00–11:00', '5'], ['午', '11:00–13:00', '6'], ['未', '13:00–15:00', '7'],
        ['申', '15:00–17:00', '8'], ['酉', '17:00–19:00', '9'], ['戌', '19:00–21:00', '10'], ['亥', '21:00–23:00', '11'],
      ] },
      { t: 'example', lines: ['1984 年 2 月 3 日 早上 6:30 → 农历 正月初二 · 卯时', 'M = 1，D = 2，T = 3'] },
      { t: 'warn', text: '两个坑：一是拿北京时间直接定时辰 —— 出生地经度每偏离 120°E 一度就差 4 分钟，太原差 −30 分钟，6:30 生的按北京时间可能还算卯时，校正后仍是卯时，但换个城市就可能掉进寅时。二是忘了 23:00 之后要按「次日」的农历日算。' },
      { t: 'check', text: '自检：M 在 1–12 之间；D 不超过当月天数（月小 29、月大 30）；闰月按本月算（本应用口径），若按分流法（前半月归本月、后半月归下月），命宫会整宫差一位。' },
    ],
  },
  {
    title: '定命宫',
    sub: '命宫是全盘的参照系，一步错，后面全错',
    blocks: [
      { t: 'p', text: '口诀：「寅宫起正月，顺数到生月；再从这一宫起子时，逆数到生时。」' },
      { t: 'formula', lines: ['把空盘按地支摆好（寅在左下角，顺行往左上是丑、子、亥…）：', '巳 午 未 申', '辰 ······ 酉', '卯 ······ 戌', '寅 丑 子 亥', '1) 从「寅」起 1，顺数到第 M 宫 —— 这是生月宫。', '2) 从生月宫起「子时」，逆时针数 T 个宫（子时不必数，原地就是）。', '3) 落在哪一宫，哪一宫就是命宫。'] },
      { t: 'example', lines: ['M = 1（正月）→ 生月宫就是寅。', 'T = 3（卯时）→ 从寅逆数 3 宫：寅 → 丑 → 子 → 亥。', '命宫 = 亥。'] },
      { t: 'warn', text: '三个最常见的错：① 把「正月」当成地支「寅」以外的宫位；② 逆数时把子时算成第 1 宫（子时是 0，站在生月宫不动）；③ 用公历月份代替农历月份。' },
      { t: 'check', text: '自检：命宫与生月宫的关系 = 逆时支数；改时辰一格，命宫就移一位 —— 这也是「先验时辰」的道理。' },
    ],
  },
  {
    title: '定五行局',
    sub: '命宫干支 → 纳音五行 → 局数（水二、木三、金四、土五、火六）',
    blocks: [
      { t: 'p', text: '先要拿到命宫的天干。天干由生年干起「五虎遁」：甲己之年丙作首、乙庚之岁戊为头、丙辛必定寻庚起、丁壬壬位顺行流、戊癸何方发，甲寅之上好追求 —— 意思是从寅宫起排出天干，顺行。' },
      { t: 'table', head: ['生年干', '寅宫天干', '顺排'], rows: [
        ['甲 / 己', '丙', '丙寅 丁卯 戊辰 己巳 庚午 辛未 壬申 癸酉 甲戌 乙亥'],
        ['乙 / 庚', '戊', '戊寅 己卯 庚辰 辛巳 壬午 癸未 甲申 乙酉 丙戌 丁亥'],
        ['丙 / 辛', '庚', '庚寅 辛卯 壬辰 癸巳 甲午 乙未 丙申 丁酉 戊戌 己亥'],
        ['丁 / 壬', '壬', '壬寅 癸卯 甲辰 乙巳 丙午 丁未 戊申 己酉 庚戌 辛亥'],
        ['戊 / 癸', '甲', '甲寅 乙卯 丙辰 丁巳 戊午 己未 庚申 辛酉 壬戌 癸亥'],
      ] },
      { t: 'formula', lines: ['纳音取数口诀：', '甲乙丙丁一到五（甲乙1 丙丁2 戊己3 庚辛4 壬癸5）', '子丑午未一来数，寅卯申酉二上走，辰巳戌亥三为足。', '干支数相加，超过 5 就减 5，以差定五行：', '1 木 → 木三局　2 金 → 金四局　3 水 → 水二局', '4 火 → 火六局　5 土 → 土五局'] },
      { t: 'example', lines: ['1984 年干为甲 → 五虎遁：丙寅、丁卯、戊辰、己巳、庚午、辛未、壬申、癸酉、甲戌、乙亥。', '命宫在亥 → 命宫干支 = 乙亥。', '乙取 1，亥取 3，1 + 3 = 4 → 4 为火 → 火六局。'] },
      { t: 'warn', text: '别拿「生年纳音」定局 —— 定局用的是命宫干支的纳音。加出 6、7 时忘了减 5，会得到不存在的局数。' },
      { t: 'check', text: '自检：局数只可能是 2、3、4、5、6 这五个数；局数同时也是大限起限的岁数（火六局 6 岁起运）。' },
    ],
  },
  {
    title: '安紫微',
    sub: '用局数和农历日，算出紫微落宫',
    blocks: [
      { t: 'p', text: '古诀：「局数除日数，商数宫前走；若见数无余，便要起虎口；日数小于局，还直宫中守。」虎口就是寅宫。' },
      { t: 'formula', lines: ['设局数 j（2–6），农历日 D。', '1) 找一个最小的补数 k（k ≥ 0），使 (D + k) 能被 j 整除。', '2) 商 q = (D + k) / j。', '3) 从寅宫起数第 q 宫（寅 = 第 1 宫），这是基准宫。', '4) k 是偶数 → 从基准宫顺行 k 宫；k 是奇数 → 逆行 k 宫。', '落宫即紫微。'] },
      { t: 'example', lines: ['火六局（j = 6），农历初二（D = 2）。', '2 + k 要能被 6 整除 → k = 4（2 + 4 = 6）。', 'q = 6 / 6 = 1 → 从寅起数第 1 宫 = 寅。', 'k = 4 为偶数 → 从寅顺行 4 宫：寅 → 卯 → 辰 → 巳 → 午。', '紫微 = 午。'] },
      { t: 'warn', text: '方向弄反是这一支最常见的错：补数为偶顺行、为奇逆行，记住「偶数走顺、奇数走逆」。另外 q 要按「第几宫」数，寅是第 1，不是从 0 开始。' },
      { t: 'check', text: '自检：D + k 一定能被 j 整除；商 q 不会超过 12（超过就取余）。若算出紫微在辰、巳之间的「夹缝」，一定是数错了一宫。' },
    ],
  },
  {
    title: '安天府',
    sub: '紫微与天府以「寅—申」为轴对称，不是对宫',
    blocks: [
      { t: 'p', text: '十四主星里，紫微、天府这一对是整张盘的骨架。它们的关系是「以寅申连线为轴镜像」，不是相隔六宫的对宫关系。' },
      { t: 'table', head: ['紫微', '天府', '紫微', '天府'], rows: [
        ['寅', '寅', '申', '申'], ['卯', '丑', '酉', '未'], ['辰', '子', '戌', '午'],
        ['巳', '亥', '亥', '巳'], ['午', '戌', '子', '辰'], ['未', '酉', '丑', '卯'],
      ] },
      { t: 'formula', lines: ['只用记一句：紫微进一宫，天府退一宫；到了寅、申两宫，两者同宫。'] },
      { t: 'example', lines: ['紫微在午 → 沿轴翻过去：午 ↔ 戌。', '天府 = 戌。'] },
      { t: 'warn', text: '把天府当「紫微的对宫」（午 → 子）是最常见的错，那样整盘主星会全部错位。' },
      { t: 'check', text: '自检：紫微在寅或申时，紫微天府同宫；其余情况两星永不同宫。' },
    ],
  },
  {
    title: '定身宫',
    sub: '与命宫同一套起点，但「顺数」而不是「逆数」',
    blocks: [
      { t: 'p', text: '口诀：「从生月宫起子时，顺数到生时，所落之宫即身宫。」' },
      { t: 'formula', lines: ['1) 起点仍是生月宫（同第②步）。', '2) 从生月宫起子时，顺时针数 T 个宫。', '3) 落宫即身宫。', '快捷法：身宫 = 命宫顺行 (2 × T) 宫；子时身宫与命宫同宫。'] },
      { t: 'example', lines: ['M = 1 → 生月宫 = 寅；T = 3（卯时）→ 寅顺数 3：寅 → 卯 → 辰 → 巳。', '身宫 = 巳。', '快捷核对：命宫亥 + 2×3 = 亥 + 6 → 巳 ✓'] },
      { t: 'warn', text: '把身宫当成「命宫的对宫」是错的；身宫与命宫的间距必须是偶数（0、2、4、6、8、10），出现奇数间距就一定数错了。' },
      { t: 'check', text: '自检：子时生人身命同宫；午时生人身宫在命宫对宫。' },
    ],
  },
  {
    title: '起四化',
    sub: '按生年天干，定禄、权、科、忌四颗星',
    blocks: [
      { t: 'p', text: '四化是紫微斗数里「动」的那一层：星还是那些星，但被年干一点，就有了吉凶的方向。十天干的四化是死表，背下来最省事。' },
      { t: 'table', head: ['年干', '化禄', '化权', '化科', '化忌'], rows: [
        ['甲', '廉贞', '破军', '武曲', '太阳'], ['乙', '天机', '天梁', '紫微', '太阴'],
        ['丙', '天同', '天机', '文昌', '廉贞'], ['丁', '太阴', '天同', '天机', '巨门'],
        ['戊', '贪狼', '太阴', '右弼', '天机'], ['己', '武曲', '贪狼', '天梁', '文曲'],
        ['庚', '太阳', '武曲', '太阴', '天同'], ['辛', '巨门', '太阳', '文曲', '文昌'],
        ['壬', '天梁', '紫微', '左辅', '武曲'], ['癸', '破军', '巨门', '太阴', '贪狼'],
      ] },
      { t: 'example', lines: ['1984 年为甲子年 → 年干甲。', '化禄 廉贞，化权 破军，化科 武曲，化忌 太阳。'] },
      { t: 'warn', text: '两个层次别混：这里是「生年四化」（按出生那一年的天干）。到了解盘阶段还会遇到「宫干自化」（某一宫的天干让本宫星曜起四化），那是另一层意思，不要混着背。' },
      { t: 'check', text: '自检：四化表里化禄、化权、化科、化忌四颗星不一定互不相同（例如癸年化忌贪狼、化禄破军）；但对同一张盘，四颗星是确定的。' },
    ],
  },
  {
    title: '之后还有三步',
    sub: '主星落位只是骨架，撑起判语的是辅星、大限与流年',
    blocks: [
      { t: 'p', text: '十四主星安完，一张盘还只是骨架。真到解盘，还要往下推三层 —— 这三层步骤多、但规律性更强，练熟前两步之后再补。' },
      { t: 'formula', lines: ['① 安辅星（各有起法）：', '左辅右弼看生月；文昌文曲看生时；天魁天钺看年干；', '禄存、擎羊、陀罗看年干；火星、铃星看年支 + 生时；', '地空、地劫看生时；天马看年支（只落寅申巳亥）。', '', '② 起大限：从命宫起，阳男阴女顺行、阴男阳女逆行，', '一宫十年，起限岁数 = 五行局数（火六局 6 岁起运）。', '', '③ 起小限 / 流年：小限按年支与性别起，流年则一年一宫，', '与本命盘叠看，才有「哪一年该注意什么」。'] },
      { t: 'check', text: '练习顺序建议：先把①②④⑤⑥背成肌肉记忆（这五步只涉及月份、时辰、日数、年干），再回头补辅星。' },
    ],
  },
];

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', margin: '10px 0 4px' }}>
      <table style={{
        borderCollapse: 'collapse', width: '100%', fontSize: T.sub,
        fontVariantNumeric: 'tabular-nums',
      }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} style={{
                textAlign: 'left', padding: '7px 10px', color: C.ink3, fontWeight: 600,
                fontSize: T.micro, letterSpacing: '0.1em', borderBottom: `1px solid ${C.line}`,
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} style={{
                  padding: '7px 10px', color: j === 0 ? C.ink : C.ink2,
                  borderBottom: `1px solid ${mix(C.line, 60)}`, whiteSpace: 'nowrap',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  if (b.t === 'p') {
    return <p style={{ margin: '10px 0 0', fontSize: T.body, color: C.ink2, lineHeight: 2, letterSpacing: '0.02em' }}>{b.text}</p>;
  }
  if (b.t === 'formula') {
    return (
      <pre style={{
        margin: '12px 0 0', padding: '14px 16px', borderRadius: SHAPE.radiusBtn,
        background: C.paper, border: `1px solid ${C.line}`, borderLeft: `2px solid ${C.gold}`,
        fontFamily: FONT.mono, fontSize: 13, color: C.ink, lineHeight: 1.95,
        whiteSpace: 'pre-wrap', overflowX: 'auto',
      }}>{b.lines.join('\n')}</pre>
    );
  }
  if (b.t === 'example') {
    return (
      <div style={{
        margin: '12px 0 0', padding: '12px 15px', borderRadius: SHAPE.radiusBtn,
        background: mix(C.gold, 6), border: `1px solid ${mix(C.gold, 26)}`,
      }}>
        <div style={{ fontSize: T.micro, color: C.gold, letterSpacing: '0.2em', marginBottom: 8 }}>算例 · 1984 正月初二 卯时</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 13, color: C.ink, lineHeight: 1.95, whiteSpace: 'pre-wrap' }}>
          {b.lines.join('\n')}
        </div>
      </div>
    );
  }
  if (b.t === 'warn') {
    return (
      <div style={{ margin: '12px 0 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color: C.cinnabar, fontSize: T.micro, letterSpacing: '0.16em', flexShrink: 0, paddingTop: 3 }}>常见错</span>
        <span style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.9 }}>{b.text}</span>
      </div>
    );
  }
  if (b.t === 'check') {
    return (
      <div style={{ margin: '10px 0 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color: SIHUA_COLORS.禄, fontSize: T.micro, letterSpacing: '0.16em', flexShrink: 0, paddingTop: 3 }}>自检</span>
        <span style={{ fontSize: T.sub, color: C.ink3, lineHeight: 1.9 }}>{b.text}</span>
      </div>
    );
  }
  return <Table head={b.head} rows={b.rows} />;
}

export default function PracticeManual() {
  const [open, setOpen] = useState<number[]>([0, 1, 2]);

  function toggle(i: number) {
    setOpen((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  }

  return (
    <div id="manual" style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${mix(C.gold, 36)})` }} />
        <span style={{ display: 'inline-block', width: 5, height: 5, background: C.gold, transform: 'rotate(45deg)' }} />
        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${mix(C.gold, 36)}, transparent)` }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: T.eyebrow, letterSpacing: '0.28em', color: C.ink3 }}>MANUAL · 七步推法</div>
          <h2 style={{ fontFamily: FONT.display, fontSize: T.h1, margin: '10px 0 0', letterSpacing: '0.08em', color: C.ink }}>
            手工推盘手册
          </h2>
          <p style={{ margin: '10px 0 0', fontSize: T.sub, color: C.ink3, lineHeight: 2, maxWidth: 640 }}>
            每一步都是同一套骨架：一句口诀 → 拆成能照做的算术 → 一个真算例 → 常见错 → 自检。
            算例统一用 1984 年 2 月 3 日卯时（男）这张盘，照着抄一遍，答案与上面判分完全一致。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setOpen(open.length === STEPS.length ? [] : STEPS.map((_, i) => i))}
            style={{
              padding: '7px 13px', borderRadius: SHAPE.radiusBtn, fontSize: T.sub, cursor: 'pointer',
              fontFamily: 'inherit', background: 'transparent', color: C.ink2, border: `1px solid ${C.line}`,
            }}
          >{open.length === STEPS.length ? '全部收起' : '全部展开'}</button>
        </div>
      </div>

      {/* 三样东西先备齐 */}
      <div style={{
        marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
      }}>
        {[
          ['一张空盘', '12 格按地支摆死：巳午未申 / 辰…酉 / 卯…戌 / 寅丑子亥。宫名会换，地支不动。'],
          ['农历月与日', '不是公历。生月定命宫起点，生日定紫微落宫。'],
          ['时支（真太阳时）', '子 0 … 亥 11。时辰差一格，命宫、身宫一起移，整盘作废。'],
        ].map(([h, t]) => (
          <div key={h} style={{
            padding: '13px 15px', background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
          }}>
            <div style={{ fontSize: T.micro, color: C.gold, letterSpacing: '0.18em', marginBottom: 6 }}>{h}</div>
            <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.9 }}>{t}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((s, i) => {
          const isOpen = open.includes(i);
          return (
            <div key={s.title} style={{
              background: C.card, border: `1px solid ${isOpen ? mix(C.gold, 30) : C.line}`,
              borderRadius: SHAPE.radiusCard, overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => toggle(i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px',
                  background: isOpen ? mix(C.gold, 5) : 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: isOpen ? C.gold : mix(C.gold, 10),
                  color: isOpen ? '#1C1810' : C.gold, fontSize: 13, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: FONT.serif, fontSize: 18, color: C.ink, letterSpacing: '0.06em' }}>
                    {s.title}
                  </span>
                  <span style={{ display: 'block', fontSize: T.micro, color: C.ink3, marginTop: 3, letterSpacing: '0.02em' }}>
                    {s.sub}
                  </span>
                </span>
                <span style={{ marginLeft: 'auto', color: C.ink3, fontSize: 13 }}>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '2px 18px 18px', borderTop: `1px solid ${mix(C.line, 70)}` }}>
                  {s.blocks.map((b, k) => <BlockView key={k} b={b} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ margin: '16px 0 0', fontSize: T.micro, color: C.ink3, lineHeight: 2 }}>
        本手册的算法口径与引擎一致：紫微「补数凑整」法、天府「寅申镜像」、身宫「顺数」。
        古书另传分流法（闰月前半月归本月、后半月归下月），若师承不同，命宫会差一宫 —— 那就按你自己的师承推，本页判分以引擎口径为准。
      </p>
    </div>
  );
}
