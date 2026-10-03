import type { KeyboardEvent } from 'react';

/** Props that make a non-button element behave as one for a keyboard.
 *
 * Several components are divs (and two SVG shapes) carrying an onClick: quiz
 * options, drag-drop targets, wire pins and colour chips, the tab strip, the
 * sidebar step rows, and the PC icon on the topology. A pointer reaches them; a
 * keyboard does not, which means a student working without a mouse cannot answer
 * a pre-test question or open the PC dialog a lab's final step depends on.
 *
 * Pass `undefined` when the element is not currently clickable and the spread
 * contributes nothing — no role, no tab stop. That matters for the step rows,
 * which are only clickable for steps already unlocked, and for the topology,
 * where only the PC of the current step responds.
 *
 * `data-kbd` is what shared.css hangs the focus ring on; DESIGN.md requires a
 * visible focus-visible ring on everything interactive, and these were
 * interactive all along without looking it.
 *
 * Not used for dismiss surfaces — a modal backdrop closes on click but its
 * dialog has its own cancel button, so a tab stop on the backdrop would be a
 * stop on nothing.
 */
export interface ClickableProps {
  role?: 'button';
  tabIndex?: number;
  'data-kbd'?: string;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

export function clickable(onActivate?: (() => void) | false | null): ClickableProps {
  if (!onActivate) return {};
  return {
    role: 'button',
    tabIndex: 0,
    'data-kbd': '1',
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      // Space would otherwise scroll the page out from under the student
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
