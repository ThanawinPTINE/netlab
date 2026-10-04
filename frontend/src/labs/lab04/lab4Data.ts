/* NETLab — Lab 4 (Basic Configuration) data, ported 1:1 from
   public/labnetwork1/lab04-basic-configuration/lab4.html's inline <STEPS>/
   <NODES>/<LINKS>/<PRETEST> globals. Third Config Lab built on the shared
   <ConfigLab/> engine (see src/labs/lab05 for the template notes). This lab has
   only 2 routers (R1-R2), so its pcping step uses ttl:126 per CLAUDE.md's
   "default ttl assumes 3 hops" rule. */
import {
  CONFT_PAT,
  CRYPTO_KEY_PAT,
  ENABLE_PAT,
  END_OR_EXIT_PAT,
  EXIT_PAT,
  LOGIN_LOCAL_PAT,
  NOSHUT_PAT,
  TRANSPORT_INPUT_SSH_PAT,
  enableSecretPat,
  hostnamePat,
  ifpat,
  ipAddrPat,
  ipDomainNamePat,
  ipRoutePat,
  lineVtyPat,
  showRunPat,
  tracerouteBasicPat,
  usernameSecretPat,
  writeMemPat,
} from '../../lib/ciscoPatterns';
import type { PretestQuestion, Step, TopoLink, TopoNode } from '../../types/configLab';

export const NODES: TopoNode[] = [
  { id: 'PC-A', x: 90, role: 'host' },
  { id: 'R1', x: 340, role: 'router' },
  { id: 'R2', x: 590, role: 'router' },
  { id: 'PC-B', x: 840, role: 'host' },
];

export const LINKS: TopoLink[] = [
  { from: 'PC-A', to: 'R1', subnet: '192.168.10.0/24', if1: '', if2: 'g0/0', activateOnSteps: [4, 200] },
  { from: 'R1', to: 'R2', subnet: '10.4.4.0/30', if1: 'g0/1', if2: 'g0/0', activateOnSteps: [5, 12] },
  { from: 'R2', to: 'PC-B', subnet: '192.168.20.0/24', if1: 'g0/1', if2: '', activateOnSteps: [13, 201] },
];

export const NODE_IP_LABELS: Record<string, string> = {
  'PC-A': '192.168.10.10',
  R1: '192.168.10.1',
  R2: '192.168.20.1',
  'PC-B': '192.168.20.10',
};

const SHOW_IP_INT_BRIEF_PAT = /^do\s+sh(ow)?\s+ip\s+int(erface)?\s+br(ief)?$/i;

export const STEPS: Step[] = [
  {
    id: 1,
    router: 'R1',
    name: 'R1 — enable & configure terminal',
    short: 'R1 enable',
    mode: 'exec',
    prompt: 'Router>',
    cmdHint: { cmd: 'Router> enable', desc: 'เข้า Privileged EXEC ก่อน แล้วพิมพ์ configure terminal' },
    hints: [
      { cmd: 'Router> enable', desc: 'เข้าสู่ Privileged EXEC mode ก่อน' },
      { cmd: 'Router# configure terminal', desc: 'เข้าสู่ Global Configuration mode' },
    ],
    answer: 'enable\nconfigure terminal',
    commands: [
      { mode: 'exec', pat: ENABLE_PAT, next: 'exec-priv', pr: 'Router#', adv: false, msg: '' },
      { mode: 'exec-priv', pat: CONFT_PAT, next: 'config', pr: 'Router(config)#', adv: true, msg: 'Enter configuration commands, one per line.\nRouter(config)#' },
    ],
  },
  {
    id: 2,
    router: 'R1',
    name: 'R1 — ตั้งชื่อ Hostname เป็น R1',
    short: 'hostname R1',
    mode: 'config',
    prompt: 'Router(config)#',
    cmdHint: { cmd: 'Router(config)# hostname R1', desc: 'ตั้งชื่ออุปกรณ์ก่อนเป็นอันดับแรก เพื่อให้แยกแยะได้ง่ายในเครือข่าย' },
    answer: 'hostname R1',
    commands: [{ mode: 'config', pat: hostnamePat('R1'), next: 'config', pr: 'R1(config)#', adv: true, msg: '✓ Hostname เปลี่ยนเป็น R1 แล้วครับ (สังเกต prompt ที่เปลี่ยนไป)' }],
  },
  {
    id: 7,
    router: 'R1',
    name: 'R1 — ตั้งชื่อ Domain Name',
    short: 'domain-name',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# ip domain-name netlab.local', desc: 'ตั้งชื่อ domain เป็น netlab.local — จำเป็นสำหรับสร้าง RSA key ของ SSH ในขั้นถัดไป' },
    answer: 'ip domain-name netlab.local',
    commands: [{ mode: 'config', pat: ipDomainNamePat('netlab.local'), next: 'config', pr: 'R1(config)#', adv: true, msg: '✓ ตั้งชื่อ Domain เป็น netlab.local แล้วครับ' }],
  },
  {
    id: 3,
    router: 'R1',
    name: 'R1 — ตั้งรหัสผ่าน Privileged Mode (enable secret)',
    short: 'enable secret',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: {
      cmd: 'R1(config)# enable secret cisco123',
      desc: 'ตั้งรหัสผ่านเข้า Privileged EXEC แบบเข้ารหัส (ปลอดภัยกว่า enable password) — ใช้รหัสผ่าน cisco123 ตามที่กำหนดไว้ในแล็บนี้',
    },
    answer: 'enable secret cisco123',
    commands: [{ mode: 'config', pat: enableSecretPat('cisco123'), next: 'config', pr: 'R1(config)#', adv: true, msg: '✓ ตั้งรหัสผ่าน Privileged EXEC แบบเข้ารหัส (encrypted) เรียบร้อยครับ' }],
  },
  {
    id: 18,
    router: 'R1',
    name: 'R1 — สร้าง Username และ RSA Key สำหรับ SSH',
    short: 'user+crypto',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# username admin secret cisco123', desc: 'สร้าง user สำหรับ login ผ่าน SSH — username: admin, password: cisco123' },
    hints: [
      { cmd: 'R1(config)# username admin secret cisco123', desc: 'สร้าง user สำหรับ login ผ่าน SSH — username: admin, password: cisco123' },
      {
        cmd: 'R1(config)# crypto key generate rsa general-keys modulus 1024',
        desc: 'สร้างกุญแจเข้ารหัส RSA สำหรับ SSH (ต้องตั้ง domain-name ไว้ก่อนแล้ว) — general-keys คือ key ใช้งานทั่วไปชุดเดียว (ตรงข้ามกับ usage-keys ที่แยก key เข้ารหัส/เซ็นชื่อคนละชุด) และระบุ modulus ไว้ตรงคำสั่งเลย ถ้าไม่ระบุ Router จะถามย้อนแบบ interactive แทน (จำลองในหน้านี้ไม่รองรับ)',
      },
      { cmd: 'R1(config)# line vty 0 4', desc: 'เข้าสู่โหมดตั้งค่า virtual terminal (VTY) ทั้ง 5 line — Router รุ่นนี้นับ line เริ่มจาก 0 ถึง 4 (รวม 5 line) จึงพิมพ์ line vty 0 4 (ไม่ใช่ 0 5)' },
    ],
    answer: 'username admin secret cisco123\ncrypto key generate rsa general-keys modulus 1024\nline vty 0 4',
    commands: [
      { mode: 'config', pat: usernameSecretPat('admin', 'cisco123'), next: 'config', pr: 'R1(config)#', adv: false, msg: '' },
      { mode: 'config', pat: CRYPTO_KEY_PAT, next: 'config', pr: 'R1(config)#', adv: false, msg: 'The name for the keys will be: R1.netlab.local\n% The key modulus size is 1024 bits\n[OK]' },
      { mode: 'config', pat: lineVtyPat('0', '4'), next: 'config-line', pr: 'R1(config-line)#', adv: true, msg: '' },
    ],
  },
  {
    id: 8,
    router: 'R1',
    name: 'R1 — ตั้งค่า Login ผ่าน SSH (VTY line)',
    short: 'VTY login',
    mode: 'config-line',
    prompt: 'R1(config-line)#',
    cmdHint: { cmd: 'R1(config-line)# login local', desc: 'ให้ตรวจสอบ login ด้วย username/password ที่ตั้งไว้ (local database)' },
    hints: [
      { cmd: 'R1(config-line)# login local', desc: 'ให้ตรวจสอบ login ด้วย username/password ที่ตั้งไว้ (local database)' },
      { cmd: 'R1(config-line)# transport input ssh', desc: 'อนุญาตเฉพาะ SSH เท่านั้น (ปิด Telnet ที่ไม่เข้ารหัส)' },
      { cmd: 'R1(config-line)# exit', desc: 'ออกจาก line mode กลับสู่ config mode' },
    ],
    answer: 'login local\ntransport input ssh\nexit',
    commands: [
      { mode: 'config-line', pat: LOGIN_LOCAL_PAT, next: 'config-line', pr: 'R1(config-line)#', adv: false, msg: '' },
      { mode: 'config-line', pat: TRANSPORT_INPUT_SSH_PAT, next: 'config-line', pr: 'R1(config-line)#', adv: false, msg: '✓ SSH พร้อมใช้งานแล้ว (Telnet ถูกปิด)' },
      {
        mode: 'config-line',
        pat: EXIT_PAT,
        next: 'config',
        pr: 'R1(config)#',
        adv: true,
        msg: '✓ ตั้งค่าพื้นฐานของ R1 ครบแล้วครับ (Hostname, Domain, Password, SSH) — ต่อไปมาตั้งค่า IP กันครับ',
      },
    ],
  },
  {
    id: 4,
    router: 'R1',
    name: 'R1 — g0/0 LAN 192.168.10.1/24',
    short: 'g0/0 LAN',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# interface g0/0', desc: 'LAN ฝั่ง PC-A: 192.168.10.1/24 — เส้น PC-A—R1 จะเขียว' },
    hints: [
      { cmd: 'R1(config)# interface g0/0', desc: 'LAN ฝั่ง PC-A: 192.168.10.1/24 — เส้น PC-A—R1 จะเขียว' },
      { cmd: 'R1(config-if)# ip address 192.168.10.1 255.255.255.0', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R1(config-if)# no shutdown', desc: 'เปิดใช้งาน interface (ไม่งั้นจะ down ตลอด)' },
      { cmd: 'R1(config-if)# exit', desc: 'ออกจาก interface mode กลับสู่ config mode' },
    ],
    answer: 'interface g0/0\nip address 192.168.10.1 255.255.255.0\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('0'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('192.168.10.1', '255.255.255.0'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up' },
      { mode: 'config-if', pat: EXIT_PAT, next: 'config', pr: 'R1(config)#', adv: true, msg: '✓ g0/0 → 192.168.10.1/24 UP\n  เส้น PC-A—R1 เขียวครึ่งเดียว รอ PC-A ตั้ง IP ด้วยครับ' },
    ],
  },
  {
    id: 5,
    router: 'R1',
    name: 'R1 — g0/1 WAN 10.4.4.1/30',
    short: 'g0/1 WAN',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# interface g0/1', desc: 'WAN ฝั่ง R2: 10.4.4.1/30 — เส้น R1—R2 จะเขียว' },
    hints: [
      { cmd: 'R1(config)# interface g0/1', desc: 'WAN ฝั่ง R2: 10.4.4.1/30 — เส้น R1—R2 จะเขียว' },
      { cmd: 'R1(config-if)# ip address 10.4.4.1 255.255.255.252', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R1(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R1(config-if)# exit', desc: 'ออกจาก interface mode กลับสู่ config mode' },
    ],
    answer: 'interface g0/1\nip address 10.4.4.1 255.255.255.252\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('1'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('10.4.4.1', '255.255.255.252'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up' },
      {
        mode: 'config-if',
        pat: EXIT_PAT,
        next: 'config',
        pr: 'R1(config)#',
        adv: true,
        msg: '✓ g0/1 → 10.4.4.1/30 UP\n  เส้น R1—R2 เขียวแล้วครับ — ต่อไปตั้งค่า PC-A ก่อน แล้วค่อยไปตั้ง IP ของ R2',
      },
    ],
  },
  {
    id: 200,
    router: 'PC-A',
    type: 'pcconfig',
    name: 'PC-A — กำหนดค่า IP Configuration',
    short: 'PC-A IP',
    mode: 'pcconfig',
    prompt: '(คลิก PC-A)',
    cmdHint: { cmd: '(คลิกที่ไอคอน PC-A บนแผนภาพด้านบน)', desc: 'กำหนด IP Address, Subnet Mask, Default Gateway ให้ PC-A ให้ตรงกับ Topology (Gateway = IP ของ R1 g0/0)' },
    expected: { ip: '192.168.10.10', mask: '255.255.255.0', gateway: '192.168.10.1' },
  },
  {
    id: 10,
    router: 'R2',
    name: 'R2 — enable & configure terminal',
    short: 'R2 enable',
    mode: 'exec',
    prompt: 'Router>',
    cmdHint: { cmd: 'Router> enable', desc: 'สลับไปทำ R2 — enable แล้ว configure terminal' },
    hints: [
      { cmd: 'Router> enable', desc: 'สลับไปทำ R2 — เข้าสู่ Privileged EXEC' },
      { cmd: 'Router# configure terminal', desc: 'เข้าสู่ Global Configuration mode' },
    ],
    answer: 'enable\nconfigure terminal',
    commands: [
      { mode: 'exec', pat: ENABLE_PAT, next: 'exec-priv', pr: 'Router#', adv: false, msg: '' },
      { mode: 'exec-priv', pat: CONFT_PAT, next: 'config', pr: 'Router(config)#', adv: true, msg: 'Enter configuration commands, one per line.\nRouter(config)#' },
    ],
  },
  {
    id: 11,
    router: 'R2',
    name: 'R2 — ตั้งชื่อ Hostname เป็น R2',
    short: 'hostname R2',
    mode: 'config',
    prompt: 'Router(config)#',
    cmdHint: { cmd: 'Router(config)# hostname R2', desc: 'ตั้งชื่ออุปกรณ์ก่อนเป็นอันดับแรก เพื่อให้แยกแยะได้ง่ายในเครือข่าย' },
    answer: 'hostname R2',
    commands: [{ mode: 'config', pat: hostnamePat('R2'), next: 'config', pr: 'R2(config)#', adv: true, msg: '✓ Hostname เปลี่ยนเป็น R2 แล้วครับ' }],
  },
  {
    id: 12,
    router: 'R2',
    name: 'R2 — g0/0 WAN (←R1) 10.4.4.2/30',
    short: 'g0/0 ←R1',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# interface g0/0', desc: 'ฝั่ง R1: 10.4.4.2/30' },
    hints: [
      { cmd: 'R2(config)# interface g0/0', desc: 'ฝั่ง R1: 10.4.4.2/30' },
      { cmd: 'R2(config-if)# ip address 10.4.4.2 255.255.255.252', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R2(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R2(config-if)# exit', desc: 'ออกจาก interface mode' },
    ],
    answer: 'interface g0/0\nip address 10.4.4.2 255.255.255.252\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('0'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('10.4.4.2', '255.255.255.252'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up' },
      { mode: 'config-if', pat: EXIT_PAT, next: 'config', pr: 'R2(config)#', adv: true, msg: '✓ g0/0 → 10.4.4.2/30 UP' },
    ],
  },
  {
    id: 13,
    router: 'R2',
    name: 'R2 — g0/1 LAN 192.168.20.1/24',
    short: 'g0/1 LAN',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# interface g0/1', desc: 'LAN ฝั่ง PC-B: 192.168.20.1/24 — เส้น R2—PC-B จะเขียว' },
    hints: [
      { cmd: 'R2(config)# interface g0/1', desc: 'LAN ฝั่ง PC-B: 192.168.20.1/24 — เส้น R2—PC-B จะเขียว' },
      { cmd: 'R2(config-if)# ip address 192.168.20.1 255.255.255.0', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R2(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R2(config-if)# exit', desc: 'ออกจาก interface mode' },
    ],
    answer: 'interface g0/1\nip address 192.168.20.1 255.255.255.0\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('1'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('192.168.20.1', '255.255.255.0'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up' },
      {
        mode: 'config-if',
        pat: EXIT_PAT,
        next: 'config',
        pr: 'R2(config)#',
        adv: true,
        msg: '✓ g0/1 → 192.168.20.1/24 UP\n  ต่อไปตั้งค่า PC-B ให้ครบตามหลักการก่อนครับ',
      },
    ],
  },
  {
    id: 201,
    router: 'PC-B',
    type: 'pcconfig',
    name: 'PC-B — กำหนดค่า IP Configuration',
    short: 'PC-B IP',
    mode: 'pcconfig',
    prompt: '(คลิก PC-B)',
    cmdHint: {
      cmd: '(คลิกที่ไอคอน PC-B บนแผนภาพด้านบน)',
      desc: 'กำหนด IP Address, Subnet Mask, Default Gateway ให้ PC-B ให้ตรงกับ Topology (Gateway = IP ของ R2 g0/1) — ตั้งชื่อ+IP ครบทุกอุปกรณ์แล้ว ต่อไปมาลงรายละเอียดที่เหลือกันครับ',
    },
    expected: { ip: '192.168.20.10', mask: '255.255.255.0', gateway: '192.168.20.1' },
  },

  // ── เฟส 2: ที่เหลือของ R2 (static route, ตรวจสอบ, save) ──
  {
    id: 14,
    router: 'R2',
    name: 'R2 — Static Route ไป LAN PC-A (192.168.10.0/24)',
    short: 'Static R2',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# ip route 192.168.10.0 255.255.255.0 10.4.4.1', desc: 'Route ย้อนกลับไป LAN PC-A ผ่าน R1 (next-hop 10.4.4.1)' },
    answer: 'ip route 192.168.10.0 255.255.255.0 10.4.4.1',
    commands: [
      { mode: 'config', pat: ipRoutePat('192.168.10.0', '255.255.255.0', '10.4.4.1'), next: 'config', pr: 'R2(config)#', adv: true, msg: '✓ Static Route: 192.168.10.0/24 via 10.4.4.1 (R1)' },
    ],
  },
  {
    id: 101,
    router: 'R2',
    name: 'R2 — ตรวจสอบด้วย show ip interface brief (Checkpoint)',
    short: 'show int',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# do show ip interface brief', desc: 'ตรวจสอบสถานะ Interface ก่อน save' },
    answer: 'do show ip interface brief',
    commands: [
      {
        mode: 'config',
        pat: SHOW_IP_INT_BRIEF_PAT,
        next: 'config',
        pr: 'R2(config)#',
        adv: true,
        msg: 'Interface              IP-Address      OK? Method Status    Protocol\nGigabitEthernet0/0     10.4.4.2        YES manual up        up\nGigabitEthernet0/1     192.168.20.1    YES manual up        up\n\n✓ Interface ทั้งสองพอร์ต up/up แล้วครับ — บันทึกความคืบหน้าไว้แล้ว',
      },
    ],
  },
  {
    id: 15,
    router: 'R2',
    name: 'R2 — end & write memory',
    short: 'save R2',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# end  →  write memory', desc: 'บันทึก config R2' },
    hints: [
      { cmd: 'R2(config)# end', desc: 'ออกจาก config mode (end หรือ exit ก็ได้)' },
      { cmd: 'R2# write memory', desc: 'บันทึก config R2 ที่ตั้งค่าไว้ให้ถาวร' },
    ],
    answer: 'end\nwrite memory',
    commands: [
      { mode: 'config', pat: END_OR_EXIT_PAT, next: 'exec-priv', pr: 'R2#', adv: false, msg: 'R2#' },
      { mode: 'exec-priv', pat: writeMemPat(), next: 'exec-priv', pr: 'R2#', adv: true, msg: 'Building configuration...\n[OK]\n✓ R2 config บันทึกแล้วครับ' },
    ],
  },
  {
    id: 102,
    router: 'R2',
    name: 'R2 — ตรวจสอบด้วย show running-config (Checkpoint)',
    short: 'show run',
    mode: 'exec-priv',
    prompt: 'R2#',
    cmdHint: { cmd: 'R2# show running-config', desc: 'ตรวจสอบว่า config ทั้งหมดของ R2 ถูกบันทึกไว้ครบถ้วนหลัง write memory' },
    answer: 'show running-config',
    commands: [
      {
        mode: 'exec-priv',
        pat: showRunPat(),
        next: 'exec-priv',
        pr: 'R2#',
        adv: true,
        msg: 'Building configuration...\n\nCurrent configuration : 684 bytes\n!\nhostname R2\n!\ninterface GigabitEthernet0/0\n ip address 10.4.4.2 255.255.255.252\n no shutdown\n!\ninterface GigabitEthernet0/1\n ip address 192.168.20.1 255.255.255.0\n no shutdown\n!\nip route 192.168.10.0 255.255.255.0 10.4.4.1\n!\nend\n\n✓ เห็น config ครบทุกส่วนที่ตั้งค่าไว้ — R2 บันทึกถูกต้องแล้วครับ สลับไปทำ R1 ต่อครับ',
      },
    ],
  },

  // ── เฟส 3: ที่เหลือของ R1 (static route, ตรวจสอบ, save) ──
  {
    id: 6,
    router: 'R1',
    name: 'R1 — Static Route ไป LAN PC-B (192.168.20.0/24)',
    short: 'Static R1',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# ip route 192.168.20.0 255.255.255.0 10.4.4.2', desc: 'Static Route ไป LAN PC-B ผ่าน R2 (next-hop 10.4.4.2)' },
    answer: 'ip route 192.168.20.0 255.255.255.0 10.4.4.2',
    commands: [
      { mode: 'config', pat: ipRoutePat('192.168.20.0', '255.255.255.0', '10.4.4.2'), next: 'config', pr: 'R1(config)#', adv: true, msg: '✓ Static Route: 192.168.20.0/24 via 10.4.4.2 (R2)' },
    ],
  },
  {
    id: 100,
    router: 'R1',
    name: 'R1 — ตรวจสอบด้วย show ip interface brief (Checkpoint)',
    short: 'show int',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# do show ip interface brief', desc: 'ตรวจสอบสถานะ Interface ก่อน save — ใช้ do นำหน้าเพื่อรันคำสั่ง show จาก config mode ได้เลยโดยไม่ต้อง exit' },
    answer: 'do show ip interface brief',
    commands: [
      {
        mode: 'config',
        pat: SHOW_IP_INT_BRIEF_PAT,
        next: 'config',
        pr: 'R1(config)#',
        adv: true,
        msg: 'Interface              IP-Address      OK? Method Status    Protocol\nGigabitEthernet0/0     192.168.10.1    YES manual up        up\nGigabitEthernet0/1     10.4.4.1        YES manual up        up\n\n✓ Interface ทั้งสองพอร์ต up/up แล้วครับ — บันทึกความคืบหน้าไว้แล้ว',
      },
    ],
  },
  {
    id: 9,
    router: 'R1',
    name: 'R1 — end & write memory',
    short: 'save R1',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# end  →  write memory', desc: 'บันทึก config R1 ไปยัง NVRAM' },
    hints: [
      { cmd: 'R1(config)# end', desc: 'ออกจาก config mode กลับสู่ Privileged EXEC (end หรือ exit ก็ได้)' },
      { cmd: 'R1# write memory', desc: 'บันทึก config ที่ตั้งค่าไว้ให้ถาวรไปยังหน่วยความจำของ Router' },
    ],
    answer: 'end\nwrite memory',
    commands: [
      { mode: 'config', pat: END_OR_EXIT_PAT, next: 'exec-priv', pr: 'R1#', adv: false, msg: 'R1#' },
      { mode: 'exec-priv', pat: writeMemPat(), next: 'exec-priv', pr: 'R1#', adv: true, msg: 'Building configuration...\n[OK]\n✓ R1 config บันทึกแล้วครับ' },
    ],
  },
  {
    id: 103,
    router: 'R1',
    name: 'R1 — ตรวจสอบด้วย show running-config (Checkpoint)',
    short: 'show run',
    mode: 'exec-priv',
    prompt: 'R1#',
    cmdHint: { cmd: 'R1# show running-config', desc: 'ตรวจสอบว่า config ความปลอดภัย (enable secret, SSH) และ IP ทั้งหมดของ R1 ถูกบันทึกไว้ครบถ้วน' },
    answer: 'show running-config',
    commands: [
      {
        mode: 'exec-priv',
        pat: showRunPat(),
        next: 'exec-priv',
        pr: 'R1#',
        adv: true,
        msg: 'Building configuration...\n\nCurrent configuration : 1284 bytes\n!\nhostname R1\n!\nenable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0\n!\nip domain-name netlab.local\n!\nusername admin secret 5 $1$mERr$3sM9xF2vQjLp8ZbGkR1Yt0\n!\ninterface GigabitEthernet0/0\n ip address 192.168.10.1 255.255.255.0\n no shutdown\n!\ninterface GigabitEthernet0/1\n ip address 10.4.4.1 255.255.255.252\n no shutdown\n!\nip route 192.168.20.0 255.255.255.0 10.4.4.2\n!\nline vty 0 4\n login local\n transport input ssh\n!\nend\n\n✓ เห็น config ครบทุกส่วน — สังเกตว่า enable secret/username password ถูกเข้ารหัสเป็น hash ไม่โชว์ cisco123 ตรงๆ เลย และไม่มีคำสั่ง crypto key generate rsa ปรากฏ (RSA key เก็บแยกต่างหาก ไม่ใช่ config line) — R1 บันทึกถูกต้องแล้วครับ',
      },
    ],
  },

  // ── เฟส 4: ตรวจสอบผลลัพธ์รวม ──
  {
    id: 16,
    router: 'PC-A',
    type: 'pcping',
    name: 'PC-A — ทดสอบ ping ไปยัง PC-B ผ่าน Command Prompt',
    short: 'ping PC-B (PC)',
    mode: 'pcping',
    prompt: '(คลิก PC-A)',
    target: { ip: '192.168.20.10', label: 'PC-B', ttl: 126 },
    cmdHint: {
      cmd: '(คลิกที่ไอคอน PC-A บนแผนภาพด้านบน แล้วพิมพ์ ping 192.168.20.10 ในหน้า Command Prompt)',
      desc: 'ทดสอบว่า PC-A คุยกับ PC-B ได้จริงจากมุมมองผู้ใช้งานทั่วไป (ไม่ผ่าน Router) — ยืนยันว่า routing ถูกต้อง',
    },
  },
  {
    id: 17,
    router: 'R1',
    name: 'R1 — Verify: traceroute PC-B',
    short: 'traceroute',
    mode: 'exec-priv',
    prompt: 'R1#',
    cmdHint: { cmd: 'R1# traceroute 192.168.20.10', desc: 'ดู path ที่ packet เดินทางผ่านทีละ hop ไปยัง PC-B' },
    answer: 'traceroute 192.168.20.10',
    commands: [
      {
        mode: 'exec-priv',
        // .10 only. Accepting .1 as well let the student trace to R2's own
        // interface and call the step done, which verifies the router is up —
        // not that PC-B is reachable, which is what this step is for. Both the
        // answer and cmdHint above say .10.
        pat: tracerouteBasicPat('192.168.20.10'),
        next: 'exec-priv',
        pr: 'R1#',
        adv: true,
        msg: 'Type escape sequence to abort.\nTracing the route to 192.168.20.10\n  1 10.4.4.2 2 msec 1 msec 1 msec\n  2 192.168.20.10 2 msec 1 msec 1 msec\n\n✓ traceroute สำเร็จ! เห็น hop ผ่าน R2 (10.4.4.2) ก่อนถึงปลายทาง',
      },
    ],
  },
];

export const PRETEST: PretestQuestion[] = [
  {
    id: 'q1',
    type: 'mcq',
    q: 'คำสั่ง hostname มีไว้ทำอะไร?',
    opts: ['เปลี่ยน IP Address ของอุปกรณ์', 'ตั้งชื่ออุปกรณ์เพื่อให้แยกแยะได้ในเครือข่าย', 'เปิด/ปิด interface', 'ตั้งรหัสผ่าน'],
    ans: 1,
    exp: 'hostname ใช้ตั้งชื่อเรียกอุปกรณ์ (เช่น hostname R1) ช่วยให้ผู้ดูแลระบบแยกแยะอุปกรณ์แต่ละตัวได้ง่ายเวลาดู prompt หรือ log',
  },
  {
    id: 'q2',
    type: 'mcq',
    q: 'ระหว่าง enable password กับ enable secret ตัวไหนปลอดภัยกว่ากัน เพราะอะไร?',
    opts: ['enable password เพราะตั้งค่าได้ง่ายกว่า', 'enable secret เพราะเข้ารหัสรหัสผ่านเสมอ', 'ปลอดภัยเท่ากันทั้งคู่', 'enable password เพราะเป็นคำสั่งใหม่กว่า'],
    ans: 1,
    exp: 'enable secret จะเข้ารหัสรหัสผ่านด้วย MD5 เสมอ ต่างจาก enable password ที่เก็บเป็น plain text ถ้าไม่เปิด service password-encryption จึงควรใช้ enable secret เป็นหลัก',
  },
  {
    id: 'q3',
    type: 'mcq',
    q: 'ทำไมควรใช้ SSH แทน Telnet ในการเข้าถึงอุปกรณ์ระยะไกล?',
    opts: ['SSH เร็วกว่า Telnet', 'SSH เข้ารหัสข้อมูลที่รับส่ง ส่วน Telnet ส่งเป็น plain text', 'Telnet ใช้ได้แค่ในเครือข่ายภายในเท่านั้น', 'ไม่มีความแตกต่างกัน'],
    ans: 1,
    exp: 'SSH (Secure Shell) เข้ารหัสข้อมูลทั้งหมดรวมถึง username/password ขณะที่ Telnet ส่งข้อมูลแบบ plain text ทำให้ถูกดักจับ (sniff) ได้ง่าย จึงควรปิด Telnet และใช้ SSH แทน',
  },
  {
    id: 'q4',
    type: 'dragdrop',
    q: 'จับคู่คำสั่งกับหน้าที่ของมัน',
    pairs: [
      { left: 'hostname R1', right: 'ตั้งชื่ออุปกรณ์เป็น R1' },
      { left: 'enable secret cisco123', right: 'ตั้งรหัสผ่านเข้า Privileged EXEC แบบเข้ารหัส' },
      { left: 'line vty 0 4', right: 'เข้าสู่โหมดตั้งค่าการเข้าถึงระยะไกลผ่าน VTY' },
      { left: 'transport input ssh', right: 'อนุญาตให้เข้าถึงผ่าน SSH เท่านั้น' },
    ],
  },
];

export const INTRO_LINES = [
  { text: '# Ch.4 Basic Configuration — NETLab', cls: 't-info' },
  { text: '# อ้างอิง: Cisco Networking Academy W4', cls: 't-hint' },
  { text: '# Topology: PC-A—R1—R2—PC-B', cls: 't-dim' },
  { text: '# R1: g0/0=192.168.10.1/24  g0/1=10.4.4.1/30', cls: 't-dim' },
  { text: '# R2: g0/0=10.4.4.2/30      g0/1=192.168.20.1/24', cls: 't-dim' },
  { text: '# รหัสผ่านที่ใช้ในแล็บนี้: enable secret = cisco123 | SSH domain = netlab.local | SSH user/pass = admin / cisco123', cls: 't-dim' },
  { text: '' },
  { text: '# เริ่มที่ R1 — พิมพ์: enable', cls: 't-hint' },
];

export const WELCOME_MSG =
  'สวัสดีครับ! Ch.4 Basic Configuration\n\nTopology: PC-A—R1—R2—PC-B\nขั้นแรกของแต่ละ Router: ตั้ง Hostname, Domain Name, Password (enable secret), Username และ SSH (crypto key) ให้ครบก่อน แล้วค่อยตั้งค่า IP (รวม PC ด้วย — คลิกที่ไอคอน PC บนแผนภาพเพื่อกำหนดค่า) รวม 24 steps (มีจุด Checkpoint ตรวจสอบ interface ระหว่างทาง และ show running-config ตรวจสอบ config ทั้งหมดหลัง save ทุก Router)\nแต่ละเส้นจะเขียวเมื่อทั้งสองฝั่งตั้งค่าเสร็จครบครับ\n\nทำ Pre-test ก่อนหรือข้ามไป Lab เลยก็ได้ครับ';

export const COMPLETE_CHAT_SUMMARY =
  'ยินดีด้วยครับ! Lab Ch.4 เสร็จสมบูรณ์!\n\nสรุป:\n• R1: Hostname, Domain Name, Enable secret, Username, SSH (crypto key), g0/0 LAN, g0/1 WAN, Static Route\n• R2: Hostname, g0/0←R1, g0/1 LAN, Static Route\n• ตรวจสอบ show running-config ยืนยัน config ครบทุกส่วนของทั้ง R1 และ R2 แล้ว\n• PC-A ping ไปหา PC-B สำเร็จผ่าน Command Prompt และ R1 traceroute ยืนยัน hop เส้นทางได้ครบ';
