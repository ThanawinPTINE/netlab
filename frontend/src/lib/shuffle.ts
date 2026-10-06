/** Display order for a question's options.
 *
 * The answer positions in the data are spread evenly, but a fixed order is
 * still shareable: "ข้อ 1 ตอบ ข, ข้อ 2 ตอบ ง" is the cheapest way to pass a quiz
 * along, and it costs the student who receives it nothing to use. Shuffling per
 * attempt makes a letter meaningless to anyone but the person looking at the
 * screen. It does not stop someone sharing the answer's *text* — nothing in the
 * browser can — it removes the shortcut that takes no effort at all.
 *
 * Returns original indices. Callers render in this order but keep passing the
 * original index to selection and grading, so the shuffle is invisible to every
 * comparison against `ans` and cannot affect whether an answer counts.
 */
export function shuffledOrder(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  // Fisher-Yates
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Orders for a list of questions, in the same order as the list. */
export function shuffledOrders(counts: number[]): number[][] {
  return counts.map((n) => shuffledOrder(n));
}
