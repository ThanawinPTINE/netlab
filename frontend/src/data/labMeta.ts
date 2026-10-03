/* Shared Lab I catalog metadata — was duplicated between course.html and
   dashboard.html (per CLAUDE.md's note on that duplication); now a single
   source both pages import. */
export interface LabMeta {
  n: number;
  title: string;
  href: string;
}

export const LAB_META: LabMeta[] = [
  { n: 1, title: 'Course Introduction and Basic Network Knowledge Review', href: '/labnetwork1/lab01-course-intro/lab1.html' },
  { n: 2, title: 'UTP CAT5 Cable Termination, RJ45, Keystone Jack and Patch Panel', href: '/labnetwork1/lab02-cable-termination/lab2.html' },
  { n: 3, title: 'IP Address และ Subnet IPv4', href: '/labnetwork1/lab03-ip-subnetting/lab3.html' },
  { n: 4, title: 'Basic Configuration', href: '/labnetwork1/lab04-basic-configuration/lab4.html' },
  { n: 5, title: 'Static Route', href: '/labnetwork1/lab05-static-route/lab5.html' },
  { n: 6, title: 'RIP v1', href: '/labnetwork1/lab06-rip-v1/lab6.html' },
  { n: 7, title: 'RIP v2', href: '/labnetwork1/lab07-rip-v2/lab7.html' },
  { n: 8, title: 'EIGRP', href: '/labnetwork1/lab08-eigrp/lab8.html' },
  { n: 9, title: 'OSPF', href: '/labnetwork1/lab09-ospf/lab9.html' },
  { n: 10, title: 'Redistribution', href: '/labnetwork1/lab10-redistribution/lab10.html' },
  { n: 11, title: 'BGP', href: '/labnetwork1/lab11-bgp/lab11.html' },
];

// Labs not yet built stay "locked" forever even if their turn in the queue comes
// up — flip to true here the day a new lab page goes live.
export const LAB_BUILT: Record<number, boolean> = {
  1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true,
};

export const COURSE_ID = 'netlab1';

export type LabStatus = 'done' | 'active' | 'locked';

export interface LabWithStatus extends LabMeta {
  status: LabStatus;
  stepsDone: number;
  totalSteps: number;
  timeSpentSec: number;
  wrong: number;
}

export const STATUS_LABEL: Record<LabStatus, string> = {
  done: 'เรียนจบแล้ว',
  active: 'กำลังเรียน',
  locked: 'ยังไม่ปลดล็อก',
};

/** Ported 1:1 from course.html's buildLabsFromProgress(). Labs without a built
 * page are "transparent" — they don't block the unlock queue, so Lab 5 isn't
 * stuck locked just because some earlier lab has no page yet. */
export function buildLabsFromProgress(
  rows: { course_id?: string; lab_id: number; completed: number; steps_done: number; total_steps: number; time_spent_sec: number; wrong_count: number }[],
): LabWithStatus[] {
  const byId: Record<number, (typeof rows)[number]> = {};
  (rows || []).forEach((r) => {
    if (!r.course_id || r.course_id === COURSE_ID) byId[r.lab_id] = r;
  });
  let unlockedSoFar = true;
  return LAB_META.map((meta) => {
    const p = byId[meta.n];
    const done = !!(p && p.completed);
    const started = !!(p && p.steps_done > 0);
    let status: LabStatus = 'locked';
    if (!LAB_BUILT[meta.n]) {
      status = 'locked';
    } else if (done) {
      status = 'done';
      unlockedSoFar = true;
    } else if (started || unlockedSoFar) {
      status = 'active';
      unlockedSoFar = false;
    }
    return {
      n: meta.n,
      title: meta.title,
      href: meta.href,
      status,
      stepsDone: p ? p.steps_done : 0,
      totalSteps: p ? p.total_steps : 0,
      timeSpentSec: p ? p.time_spent_sec : 0,
      wrong: p ? p.wrong_count : 0,
    };
  });
}
