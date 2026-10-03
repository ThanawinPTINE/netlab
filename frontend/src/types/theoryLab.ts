/* NETLab — step shapes for the Theory Lab engine (Lab 1-3). Lesson bodies and
   figures are raw HTML/SVG strings; items inside quiz/review steps reuse the
   same shapes as top-level checkpoint/calc/wireorder steps plus a `topic` tag
   used by the review draw (one question per topic). */

export interface DragPair {
  left: string;
  right: string;
}

export interface CalcField {
  key: string;
  label: string;
  placeholder: string;
}

/** Any gradable question: an MCQ, a drag-drop match, a subnet calc or a wire order. */
export interface TheoryItem {
  id?: number;
  type?: 'checkpoint' | 'calc' | 'wireorder';
  topic?: string;
  section?: string;
  final?: boolean;
  title?: string;
  q?: string;
  // mcq
  opts?: string[];
  ans?: number;
  exp?: string;
  // drag-drop
  dragdrop?: boolean;
  pairs?: DragPair[];
  // calc
  scenario?: string;
  fields?: CalcField[];
  answer?: Record<string, string>;
  // wireorder
  standard?: string;
  order?: string[];
}

export interface TheoryStep extends Omit<TheoryItem, 'type'> {
  id: number;
  type: 'lesson' | 'checkpoint' | 'calc' | 'wireorder' | 'quiz' | 'review';
  section: string;
  // lesson
  body?: string;
  fig?: string;
  figCap?: string;
  // quiz / review
  intro?: string;
  items?: TheoryItem[];
  pool?: TheoryItem[];
  fromQuizzes?: boolean;
}
