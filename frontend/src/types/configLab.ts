/* NETLab — shared type definitions for the Config Lab engine (Lab 4, 6-11; Lab 5
   is the template). Mirrors the STEPS/NODES/LINKS/PRETEST shapes that every
   labN.html's inline <script> used to define as loose global vars. */

export interface CommandPattern {
  mode: string;
  pat: RegExp;
  next: string;
  pr: string;
  adv: boolean;
  msg: string;
}

export interface HintEntry {
  cmd: string;
  desc: string;
}

interface StepBase {
  id: number;
  router: string;
  name: string;
  short: string;
  mode: string;
  prompt: string;
  cmdHint: HintEntry;
}

export interface RegularStep extends StepBase {
  type?: undefined;
  hint?: string;
  hints?: HintEntry[];
  answer: string;
  commands: CommandPattern[];
}

export interface PcConfigStep extends StepBase {
  type: 'pcconfig';
  expected: { ip: string; mask: string; gateway: string };
}

export interface PcPingStep extends StepBase {
  type: 'pcping';
  target: { ip: string; label: string; ttl?: number };
}

export type Step = RegularStep | PcConfigStep | PcPingStep;

export interface TopoNode {
  id: string;
  x: number;
  role: 'host' | 'router';
}

export interface TopoLink {
  from: string;
  to: string;
  subnet: string;
  if1: string;
  if2: string;
  /** step ids that must ALL be in stepsDone before this link is drawn green. */
  activateOnSteps: number[];
}

export interface McqQuestion {
  id: string;
  type: 'mcq';
  q: string;
  opts: string[];
  ans: number;
  exp: string;
}

export interface DragDropQuestion {
  id: string;
  type: 'dragdrop';
  q: string;
  pairs: { left: string; right: string }[];
}

export type PretestQuestion = McqQuestion | DragDropQuestion;

export interface SyntaxTemplate {
  re: RegExp;
  tpl: string;
  desc: string;
}
