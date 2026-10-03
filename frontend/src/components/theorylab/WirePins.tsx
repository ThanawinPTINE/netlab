/* Click-to-place UTP wire ordering (Lab 2). Cable colors are fixed hex by
   nature (see the w-* rules in theorylab.css), so they don't follow the theme. */

export const WIRE_COLORS: Record<string, { label: string; cls: string }> = {
  'white-orange': { label: 'ขาว/ส้ม', cls: 'w-white-orange' },
  orange: { label: 'ส้ม', cls: 'w-orange' },
  'white-green': { label: 'ขาว/เขียว', cls: 'w-white-green' },
  blue: { label: 'น้ำเงิน', cls: 'w-blue' },
  'white-blue': { label: 'ขาว/น้ำเงิน', cls: 'w-white-blue' },
  green: { label: 'เขียว', cls: 'w-green' },
  'white-brown': { label: 'ขาว/น้ำตาล', cls: 'w-white-brown' },
  brown: { label: 'น้ำตาล', cls: 'w-brown' },
};

export interface WireState {
  /** pin index (0-7) -> color key */
  placement: Record<number, string>;
  sel: string | null;
  marks: Record<number, 'correct' | 'wrong'>;
}

export const emptyWire = (): WireState => ({ placement: {}, sel: null, marks: {} });

export const shuffledWireKeys = () => Object.keys(WIRE_COLORS).sort(() => Math.random() - 0.5);

export function gradeWire(order: string[], st: WireState): { state: WireState; ok: boolean } {
  const marks: Record<number, 'correct' | 'wrong'> = {};
  let ok = true;
  order.forEach((key, i) => {
    if (st.placement[i] === key) marks[i] = 'correct';
    else {
      marks[i] = 'wrong';
      ok = false;
    }
  });
  return { state: { ...st, marks }, ok };
}

export function revealWire(order: string[]): WireState {
  const placement: Record<number, string> = {};
  const marks: Record<number, 'correct' | 'wrong'> = {};
  order.forEach((key, i) => {
    placement[i] = key;
    marks[i] = 'correct';
  });
  return { placement, sel: null, marks };
}

export interface WirePinsProps {
  order: string[];
  poolOrder: string[];
  state: WireState;
  onChange: (s: WireState) => void;
  locked?: boolean;
  /** top-level exercises wrap each pool chip in .wire-chip-wrap; review items use a plain relative box */
  chipWrapClass?: string;
}

export default function WirePins({ order, poolOrder, state, onChange, locked, chipWrapClass }: WirePinsProps) {
  const placed = new Set(Object.values(state.placement));

  function pickChip(key: string) {
    if (locked || placed.has(key)) return;
    onChange({ ...state, sel: state.sel === key ? null : key });
  }

  function placeAt(i: number) {
    if (locked) return;
    const placement = { ...state.placement };
    const marks = { ...state.marks };
    delete marks[i];
    if (placement[i] != null && !state.sel) {
      // clicking a filled pin with nothing selected returns that wire to the pool
      delete placement[i];
      onChange({ ...state, placement, marks });
      return;
    }
    if (!state.sel) return;
    placement[i] = state.sel;
    onChange({ placement, sel: null, marks });
  }

  return (
    <>
      <div className="wire-pins">
        {order.map((_, i) => {
          const key = state.placement[i];
          const cls = ['wire-pin-slot'];
          if (key) cls.push('filled');
          if (state.marks[i]) cls.push(state.marks[i]);
          return (
            <div className="wire-pin" key={i}>
              <div className="wire-pin-num">Pin {i + 1}</div>
              <div className={cls.join(' ')} onClick={() => placeAt(i)}>
                {key && <div className={'wire-chip ' + WIRE_COLORS[key].cls} style={{ width: '90%', height: '80%', cursor: 'default' }} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="wire-pool-label">คลิกเลือกสี</div>
      <div className="wire-pool">
        {poolOrder.map((key) => {
          const cls = ['wire-chip', WIRE_COLORS[key].cls];
          if (placed.has(key)) cls.push('placed');
          else if (state.sel === key) cls.push('sel');
          return (
            <div key={key} className={chipWrapClass} style={chipWrapClass ? undefined : { position: 'relative' }}>
              <div className={cls.join(' ')} onClick={() => pickChip(key)} />
              <div className="wire-chip-label">{WIRE_COLORS[key].label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
