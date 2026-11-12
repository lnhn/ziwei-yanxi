'use client';

import { useEffect, useState } from 'react';
import ChartBoardDark from '@/components/study/ChartBoardDark';
import { Btn, PageHead } from '@/components/study/ui';
import { BRANCHES } from '@/lib/ziwei/constants';
import { lessons, practice, teaching } from './lessons';
import styles from './learn.module.css';

type Progress = { lesson: number; step: number; completed: number[]; passed?: boolean };
const key = 'zw.learn.v1';
const initial: Progress = { lesson: 0, step: 0, completed: [] };
const phases = ['看示范', '自己做一次', '换盘核对'];

export default function LearnPage() {
  const [progress, setProgress] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [choice, setChoice] = useState('');
  const [feedback, setFeedback] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Progress | null;
      const valid = saved && Number.isInteger(saved.lesson) && lessons[saved.lesson] && phases[saved.step] && Array.isArray(saved.completed);
      const restored = valid ? saved : initial;
      setProgress(new URLSearchParams(location.search).get('start') === '1' ? { ...restored, lesson: 0, step: 0, passed: false } : restored);
    } catch { setStorageFailed(true); }
  }, []);

  const { lesson, step, completed, passed } = progress;
  const current = lessons[lesson];
  const chart = step === 2 ? practice : teaching;
  const exercise = current.drill(chart, step === 2);
  const { birthInfo: birth } = chart;

  function save(next: Progress) {
    setProgress(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }

  function open(nextLesson: number, nextStep: number) {
    save({ ...progress, lesson: nextLesson, step: nextStep, passed: false });
    setSelected(null);
    setChoice('');
    setFeedback('');
  }

  function clearFeedback() {
    setFeedback('');
    if (passed) save({ ...progress, passed: false });
  }

  function check() {
    const correct = (exercise.pick === undefined || selected === exercise.pick) && choice === exercise.answer;
    setFeedback(correct ? `正确。答案是「${exercise.answer}」。${exercise.hint}` : `再试一次。${exercise.hint}`);
    save({
      ...progress, passed: correct,
      completed: correct && step === 2 && !completed.includes(lesson) ? [...completed, lesson] : completed,
    });
  }

  return (
    <div className={styles.page}>
      <PageHead title="入门学习" 
        crumbs={[{ href: '/study', label: '研习' }, { label: '入门学习' }]} />
      <div className={styles.layout}>
      
      <div className={styles.content}>

      <header className={styles.heading}>
        <div><span>第 {lesson + 1} 课</span><h2>{current.title}</h2><p>{current.goal}</p></div>
        <details className={styles.catalog}>
          <summary>课程目录 <span>已完成 {completed.length} / {lessons.length} 课</span></summary>
          <nav aria-label="课程" className={styles.lessons}>
        {lessons.map((item, index) => (
          <button key={item.title} type="button" aria-current={index === lesson ? 'step' : undefined}
            onClick={event => { if (index !== lesson) open(index, 0); event.currentTarget.closest("details")?.removeAttribute("open"); }}>
            <span>第 {index + 1} 课{completed.includes(index) && ' · 已完成'}</span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </nav>
        </details>
      </header>
      <ol className={styles.phases} aria-label="课内进度">
        {phases.map((phase, index) => <li key={phase} aria-current={index === step ? 'step' : undefined}>{phase}</li>)}
      </ol>

      <p className={styles.scrollHint}>窄窗口可横向滚动查看完整命盘。</p>
      <div role="region" aria-label="互动命盘工作区" tabIndex={0} className={styles.scroll}>
        <div className={styles.workspace}>
          <section className={styles.guide} aria-label="课程说明与作答">
            <div className={styles.meta}>{phases[step]}</div>
            <h3>{step === 0 ? '跟着盘面看一遍' : '轮到你了'}</h3>
            {step === 0 ? (
              <>
                <ol className={styles.instructions}>{current.demo(chart).map(line => <li key={line}>{line}</li>)}</ol>
                {lesson === 1 && <Btn href="/knowledge">查星曜知识</Btn>}
                {(lesson === 3 || lesson === 4) && <Btn href="/study/practice">打开手工推演</Btn>}
              </>
            ) : (
              <>
                <label className={styles.question}>
                  {exercise.prompt}
                  <select value={choice} onChange={event => { setChoice(event.target.value); clearFeedback(); }}>
                    <option value="">请选择</option>
                    {exercise.options.map(option => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <div className={styles.actions}>
                  <Btn primary onClick={check} disabled={!choice || (exercise.pick !== undefined && selected === null)}>核对</Btn>
                  <Btn onClick={() => setFeedback(`答案是「${exercise.answer}」。${exercise.hint}`)}>查看答案</Btn>
                </div>
                <p className={feedback || passed ? styles.feedback : undefined} role="status">
                  {feedback || (passed ? '本节已通过，可以继续。' : '')}
                </p>
              </>
            )}
            <div className={styles.footer}>
              {step > 0 && <Btn onClick={() => open(lesson, step - 1)}>上一步</Btn>}
              {step < 2 && <Btn primary onClick={() => open(lesson, step + 1)} disabled={step === 1 && !passed}>下一步</Btn>}
              {step === 2 && passed && lesson + 1 < lessons.length && <Btn primary onClick={() => open(lesson + 1, 0)}>开始第 {lesson + 2} 课</Btn>}
              {step === 2 && passed && lesson + 1 === lessons.length && <Btn href="/cases" primary>打开案例库</Btn>}
              {step === 2 && <Btn onClick={() => open(lesson, 0)}>重学本课</Btn>}
            </div>
            {storageFailed && <p role="status">无法保存本机进度。本次作答仍可继续。</p>}
          </section>

          <section aria-label="命盘">
            <div className={styles.chartHeader}>
              <strong>{birth.name}</strong>
              <span>公历 {birth.year} 年 {birth.month} 月 {birth.day} 日 · {BRANCHES[birth.hour]}时</span>
            </div>
            <ChartBoardDark chart={chart} selectedBranch={selected ?? (step === 0 ? current.focus(chart) : null)}
              onSelect={value => { setSelected(value); if (exercise.pick !== undefined) clearFeedback(); }} />
          </section>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
