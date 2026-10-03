export interface LabCompleteModalProps {
  open: boolean;
  title: string;
  subLines: string[];
  nextLabHref: string | null;
  nextLabLabel: string;
  closeLabel?: string;
  closeTitle?: string;
  onClose: () => void;
  onReset: () => void;
  onNextLab: () => void;
}

export default function LabCompleteModal({
  open,
  title,
  subLines,
  nextLabHref,
  nextLabLabel,
  closeLabel = 'ปิด — ดู Terminal',
  closeTitle = 'ปิด (ดู Terminal ที่ทำไปได้)',
  onClose,
  onReset,
  onNextLab,
}: LabCompleteModalProps) {
  return (
    <div
      className={'lab-complete' + (open ? ' show' : '')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lab-complete-box" role="dialog" aria-labelledby="completeTitle">
        <button className="lab-complete-close" onClick={onClose} title={closeTitle}>
          {'✕'}
        </button>
        <div className="complete-title" id="completeTitle">
          {title}
        </div>
        <div className="complete-sub">
          {subLines.map((l, i) => (
            <span key={i}>
              {l}
              {i < subLines.length - 1 && <br />}
            </span>
          ))}
        </div>
        <div className="lab-complete-actions">
          <button className="btn-skip2" onClick={onClose}>
            {closeLabel}
          </button>
          <button className="btn-check" onClick={onReset}>
            ทำ Lab นี้อีกครั้ง →
          </button>
          {nextLabHref && (
            <button className="btn-next-lab" onClick={onNextLab}>
              {nextLabLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
