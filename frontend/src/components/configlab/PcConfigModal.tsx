export interface PcConfigModalProps {
  open: boolean;
  pcId: string | null;
  sub: string;
  ip: string;
  mask: string;
  gateway: string;
  err: string;
  fieldErr: { ip: boolean; mask: boolean; gateway: boolean };
  onChangeIp: (v: string) => void;
  onChangeMask: (v: string) => void;
  onChangeGateway: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function PcConfigModal({
  open,
  pcId,
  sub,
  ip,
  mask,
  gateway,
  err,
  fieldErr,
  onChangeIp,
  onChangeMask,
  onChangeGateway,
  onCancel,
  onSubmit,
}: PcConfigModalProps) {
  return (
    <div
      className={'pc-modal-backdrop' + (open ? ' show' : '')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="pc-modal" role="dialog" aria-labelledby="pcModalTitle">
        <div className="pc-modal-title" id="pcModalTitle">
          {pcId ? `${pcId} — IP Configuration` : 'IP Configuration'}
        </div>
        <div className="pc-modal-sub">{sub}</div>
        <label className="pc-field-label" htmlFor="pcIpInput">
          IP Address
        </label>
        <input
          className={'pc-field-input' + (fieldErr.ip ? ' err' : '')}
          id="pcIpInput"
          autoComplete="off"
          spellCheck={false}
          placeholder="เช่น 192.168.1.10"
          value={ip}
          onChange={(e) => onChangeIp(e.target.value)}
        />
        <label className="pc-field-label" htmlFor="pcMaskInput">
          Subnet Mask
        </label>
        <input
          className={'pc-field-input' + (fieldErr.mask ? ' err' : '')}
          id="pcMaskInput"
          autoComplete="off"
          spellCheck={false}
          placeholder="เช่น 255.255.255.0"
          value={mask}
          onChange={(e) => onChangeMask(e.target.value)}
        />
        <label className="pc-field-label" htmlFor="pcGwInput">
          Default Gateway
        </label>
        <input
          className={'pc-field-input' + (fieldErr.gateway ? ' err' : '')}
          id="pcGwInput"
          autoComplete="off"
          spellCheck={false}
          placeholder="เช่น 192.168.1.1"
          value={gateway}
          onChange={(e) => onChangeGateway(e.target.value)}
        />
        <div className="pc-modal-err">{err}</div>
        <div className="pc-modal-actions">
          <button className="btn-skip2" onClick={onCancel}>
            ยกเลิก
          </button>
          <button className="btn-check" onClick={onSubmit}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
