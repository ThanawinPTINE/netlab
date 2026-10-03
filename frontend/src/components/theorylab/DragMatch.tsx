import { useState } from 'react';
import type { DragPair } from '../../types/theoryLab';

/** One assignment: target `ti` holds left item `pi` (index into the shuffled left column). */
export interface MatchAssign {
  pi: number;
  lv: string;
}

export interface MatchState {
  sel: { pi: number; lv: string } | null;
  assign: Record<number, MatchAssign>;
  /** targets graded correct — locked from then on */
  filled: Record<number, true>;
  /** targets graded wrong this round, value shown as "✗ lv" until cleared */
  wrong: Record<number, string>;
}

export const emptyMatch = (): MatchState => ({ sel: null, assign: {}, filled: {}, wrong: {} });

export function shuffledIndices(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
}

/** Grade every not-yet-filled target. Correct ones lock; wrong ones show ✗. */
export function gradeMatch(pairs: DragPair[], st: MatchState): { state: MatchState; ok: boolean; okCount: number } {
  const filled = { ...st.filled };
  const wrong: Record<number, string> = {};
  let ok = true;
  pairs.forEach((pair, ti) => {
    if (filled[ti]) return;
    const mp = st.assign[ti];
    if (mp && mp.lv.trim() === pair.left.trim()) filled[ti] = true;
    else {
      ok = false;
      if (mp) wrong[ti] = mp.lv;
    }
  });
  return { state: { ...st, sel: null, filled, wrong }, ok, okCount: Object.keys(filled).length };
}

/** Drop every assignment that didn't lock, so those pairs can be dragged again. */
export function clearWrongMatch(st: MatchState): MatchState {
  const assign: Record<number, MatchAssign> = {};
  Object.keys(st.assign).forEach((k) => {
    const ti = Number(k);
    if (st.filled[ti]) assign[ti] = st.assign[ti];
  });
  return { ...st, assign, wrong: {} };
}

export function revealMatch(pairs: DragPair[], leftOrder: number[]): MatchState {
  const assign: Record<number, MatchAssign> = {};
  const filled: Record<number, true> = {};
  pairs.forEach((p, ti) => {
    assign[ti] = { pi: leftOrder.indexOf(ti), lv: p.left };
    filled[ti] = true;
  });
  return { sel: null, assign, filled, wrong: {} };
}

export interface DragMatchProps {
  pairs: DragPair[];
  /** leftOrder[pi] = index into `pairs` shown at left position pi */
  leftOrder: number[];
  state: MatchState;
  onChange: (s: MatchState) => void;
  locked?: boolean;
}

export default function DragMatch({ pairs, leftOrder, state, onChange, locked }: DragMatchProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [overTi, setOverTi] = useState<number | null>(null);

  const matchedLeft = new Set<number>();
  const pendingLeft = new Set<number>();
  Object.keys(state.assign).forEach((k) => {
    const ti = Number(k);
    const a = state.assign[ti];
    if (state.filled[ti]) matchedLeft.add(a.pi);
    else if (state.wrong[ti] === undefined) pendingLeft.add(a.pi);
  });

  function pick(pi: number, lv: string) {
    if (locked || matchedLeft.has(pi)) return;
    if (state.sel && state.sel.pi === pi) onChange({ ...state, sel: null });
    else onChange({ ...state, sel: { pi, lv } });
  }

  function drop(ti: number, sel = state.sel) {
    if (locked || !sel || state.filled[ti]) return;
    const assign: Record<number, MatchAssign> = {};
    Object.keys(state.assign).forEach((k) => {
      const t = Number(k);
      if (state.assign[t].pi !== sel.pi || state.filled[t]) assign[t] = state.assign[t];
    });
    assign[ti] = { pi: sel.pi, lv: sel.lv };
    const wrong = { ...state.wrong };
    delete wrong[ti];
    onChange({ ...state, sel: null, assign, wrong });
  }

  return (
    <div className="dd-grid">
      <div>
        <div className="dd-col-label">คลิกเลือก</div>
        <div className="dd-items">
          {leftOrder.map((idx, pi) => {
            const lv = pairs[idx].left;
            const matched = matchedLeft.has(pi);
            const cls = ['dd-item'];
            if (matched) cls.push('matched');
            else if (pendingLeft.has(pi)) cls.push('pending');
            if (state.sel?.pi === pi) cls.push('sel');
            if (dragging === pi) cls.push('dragging');
            return (
              <div
                key={pi}
                className={cls.join(' ')}
                draggable={!matched && !locked}
                onDragStart={(e) => {
                  if (matched || locked) {
                    e.preventDefault();
                    return;
                  }
                  setDragging(pi);
                  onChange({ ...state, sel: { pi, lv } });
                  try {
                    e.dataTransfer.setData('text/plain', String(pi));
                    e.dataTransfer.effectAllowed = 'move';
                  } catch {
                    /* some browsers refuse setData on certain targets */
                  }
                }}
                onDragEnd={() => setDragging(null)}
                onClick={() => pick(pi, lv)}
              >
                {lv}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="dd-col-label">จับคู่กับ</div>
        <div className="dd-items">
          {pairs.map((p, ti) => {
            const a = state.assign[ti];
            const cls = ['dd-target'];
            let text = p.right;
            if (state.filled[ti]) {
              cls.push('filled');
              text = '✓ ' + p.left;
            } else if (state.wrong[ti] !== undefined) {
              cls.push('wrong-m');
              text = '✗ ' + state.wrong[ti];
            } else if (a) {
              cls.push('pending');
              text = '→ ' + a.lv;
            }
            if (overTi === ti && !state.filled[ti]) cls.push('drag-over');
            return (
              <div
                key={ti}
                className={cls.join(' ')}
                onDragOver={(e) => {
                  if (!state.sel) return;
                  e.preventDefault();
                  setOverTi(ti);
                }}
                onDragLeave={() => setOverTi(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverTi(null);
                  setDragging(null);
                  drop(ti);
                }}
                onClick={() => drop(ti)}
              >
                {text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
