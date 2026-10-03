import type { Step, TopoLink } from '../../types/configLab';

export interface IpTableProps {
  steps: Step[];
  links: TopoLink[];
}

interface IpRow {
  dev: string;
  itf: string;
  ip: string;
  mask: string;
  gw: string;
}

// Built from `steps` every render rather than duplicated as a separate data
// table, so it can never drift from the lab's actual answer content.
function buildIpTable(steps: Step[]): IpRow[] {
  const rows: IpRow[] = [];
  let curIf: string | null = null;
  steps.forEach((s) => {
    if (s.type === 'pcconfig') {
      rows.push({ dev: s.router, itf: 'NIC', ip: s.expected.ip, mask: s.expected.mask, gw: s.expected.gateway || '—' });
      return;
    }
    if (s.type === 'pcping' || !s.answer) return;
    s.answer.split('\n').forEach((line) => {
      const l = line.trim();
      const mi = l.match(/^int(?:erface)?\s+(\S+)$/i);
      if (mi) {
        curIf = mi[1];
        return;
      }
      const ma = l.match(/^ip\s+add(?:ress)?\s+(\S+)\s+(\S+)$/i);
      if (ma && s.router) {
        rows.push({ dev: s.router, itf: curIf || '—', ip: ma[1], mask: ma[2], gw: '—' });
      }
    });
  });
  return rows;
}

export default function IpTable({ steps, links }: IpTableProps) {
  const rows = buildIpTable(steps);

  return (
    <>
      <div className="iptab-head">
        <div className="iptab-title">ตาราง IP Address ของ Lab นี้</div>
        <div className="iptab-sub">ค่าทั้งหมดที่ต้องใช้ตลอด Lab รวมไว้ที่เดียว — เปิดดูควบคู่กับแผนภาพได้ตลอดเวลา ไม่ต้องจำหรือเลื่อนหาย้อนหลัง</div>
      </div>

      <div className="iptab-wrap">
        <table className="iptab">
          <caption>ค่าที่ต้องตั้งบนอุปกรณ์แต่ละตัว</caption>
          <thead>
            <tr>
              <th>อุปกรณ์</th>
              <th>Interface</th>
              <th>IP Address</th>
              <th>Subnet Mask</th>
              <th>Default Gateway</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="ipt-dev">{r.dev}</td>
                <td className="ipt-mono">{r.itf}</td>
                <td className="ipt-mono">{r.ip}</td>
                <td className="ipt-mono">{r.mask}</td>
                <td className="ipt-mono">{r.gw}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {links.length > 0 && (
        <div className="iptab-wrap">
          <table className="iptab">
            <caption>เครือข่ายแต่ละวงและ Interface ที่ต่ออยู่</caption>
            <thead>
              <tr>
                <th>เชื่อมระหว่าง</th>
                <th>Network</th>
                <th>Interface ฝั่งซ้าย</th>
                <th>Interface ฝั่งขวา</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l, i) => (
                <tr key={i}>
                  <td className="ipt-dev">
                    {l.from} — {l.to}
                  </td>
                  <td className="ipt-mono">{l.subnet}</td>
                  <td className="ipt-mono">{l.if1 || '—'}</td>
                  <td className="ipt-mono">{l.if2 || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ipt-note">
        <b>อ่านตารางนี้ยังไง:</b> คอลัมน์ Network คือเลขวงเครือข่าย ซึ่งเป็นค่าที่ต้องใช้ตอนประกาศ <code>network</code> ให้ Routing Protocol
        ส่วนเลขหลังเครื่องหมาย / บอกขนาดของวง เอาไว้คำนวณ Subnet Mask และ Wildcard Mask เอง
      </div>
    </>
  );
}
