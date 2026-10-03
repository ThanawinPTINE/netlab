/* NETLab — Lab 11 (BGP) data, ported 1:1 from
   public/labnetwork1/lab11-bgp/lab11.html's inline <STEPS>/<NODES>/<LINKS>/
   <PRETEST> globals. Last Config Lab — every router sits in its own AS
   (R1=100, R2=200, R3=300), so every link is eBGP; Neighbor sessions stay
   "Active" until BOTH sides configure each other (unlike OSPF/EIGRP's
   multicast-hello auto-discovery), which this lab deliberately shows via
   checkpoints before R2 completes both sides. Same shared <ConfigLab/> engine
   as lab05-10. */
import {
  CONFT_PAT,
  ENABLE_PAT,
  END_OR_EXIT_PAT,
  EXIT_PAT,
  NOSHUT_PAT,
  hostnamePat,
  ifpat,
  ipAddrPat,
  neighborRemoteAsPat,
  networkMaskPat,
  routerBgpPat,
  writeMemPat,
} from '../../lib/ciscoPatterns';
import type { PretestQuestion, Step, TopoLink, TopoNode } from '../../types/configLab';

export const NODES: TopoNode[] = [
  { id: 'PC-A', x: 60, role: 'host' },
  { id: 'R1', x: 260, role: 'router' },
  { id: 'R2', x: 460, role: 'router' },
  { id: 'R3', x: 660, role: 'router' },
  { id: 'PC-C', x: 860, role: 'host' },
];

export const LINKS: TopoLink[] = [
  { from: 'PC-A', to: 'R1', subnet: '172.30.1.0/24', if1: '', if2: 'g0/0', activateOnSteps: [2, 200] },
  { from: 'R1', to: 'R2', subnet: '172.30.2.0/30', if1: 'g0/1', if2: 'g0/0', activateOnSteps: [3, 5] },
  { from: 'R2', to: 'R3', subnet: '172.30.2.4/30', if1: 'g0/1', if2: 'g0/0', activateOnSteps: [6, 8] },
  { from: 'R3', to: 'PC-C', subnet: '172.30.3.0/24', if1: 'g0/1', if2: '', activateOnSteps: [9, 201] },
];

export const NODE_IP_LABELS: Record<string, string> = {
  'PC-A': '172.30.1.10',
  R1: '172.30.1.1',
  R2: '172.30.2.5',
  R3: '172.30.3.1',
  'PC-C': '172.30.3.10',
};

export const CONFIG_ROUTER_WORDS = ['network', 'neighbor', 'exit', 'remote-as', 'mask'];

const SHOW_BGP_SUMMARY_PAT = /^do\s+sh(ow)?\s+ip\s+bgp\s+sum(m(a(r(y)?)?)?)?$/i;
const SHOW_BGP_SUMMARY_NO_DO_PAT = /^sh(ow)?\s+ip\s+bgp\s+sum(m(a(r(y)?)?)?)?$/i;
const SHOW_IP_ROUTE_PAT = /^sh(ow)?\s+ip\s+route$/i;

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
    id: 21,
    router: 'R1',
    name: 'R1 — ตั้งชื่อ hostname',
    short: 'hostname R1',
    mode: 'config',
    prompt: 'Router(config)#',
    cmdHint: { cmd: 'Router(config)# hostname R1', desc: 'ตั้งชื่ออุปกรณ์เป็น R1 — ควรทำเป็นอย่างแรกก่อนตั้งค่าอื่น' },
    hints: [{ cmd: 'Router(config)# hostname R1', desc: 'ตั้งชื่ออุปกรณ์เป็น R1' }],
    answer: 'hostname R1',
    commands: [{ mode: 'config', pat: hostnamePat('R1'), next: 'config', pr: 'R1(config)#', adv: true, msg: '✓ Hostname เปลี่ยนเป็น R1 แล้วครับ (สังเกต prompt ที่เปลี่ยนไป)' }],
  },
  {
    id: 2,
    router: 'R1',
    name: 'R1 — g0/0 LAN 172.30.1.1/24',
    short: 'g0/0 LAN',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# interface g0/0', desc: 'LAN ฝั่ง PC-A: 172.30.1.1/24 — เส้น PC-A—R1 จะเขียว' },
    hints: [
      { cmd: 'R1(config)# interface g0/0', desc: 'LAN ฝั่ง PC-A: 172.30.1.1/24 — เส้น PC-A—R1 จะเขียว' },
      { cmd: 'R1(config-if)# ip address 172.30.1.1 255.255.255.0', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R1(config-if)# no shutdown', desc: 'เปิดใช้งาน interface (ไม่งั้นจะ down ตลอด)' },
      { cmd: 'R1(config-if)# exit', desc: 'ออกจาก interface mode กลับสู่ config mode' },
    ],
    answer: 'interface g0/0\nip address 172.30.1.1 255.255.255.0\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('0'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('172.30.1.1', '255.255.255.0'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up' },
      { mode: 'config-if', pat: EXIT_PAT, next: 'config', pr: 'R1(config)#', adv: true, msg: '✓ g0/0 → 172.30.1.1/24 UP\n  เส้น PC-A—R1 เขียวครึ่งเดียว รอ PC-A ตั้ง IP ด้วยครับ' },
    ],
  },
  {
    id: 3,
    router: 'R1',
    name: 'R1 — g0/1 WAN 172.30.2.1/30 (ฝั่ง R2, AS200)',
    short: 'g0/1 WAN',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# interface g0/1', desc: 'WAN ฝั่ง R2 (คนละ AS — จะเป็น eBGP): 172.30.2.1/30 — เส้น R1—R2 จะเขียว' },
    hints: [
      { cmd: 'R1(config)# interface g0/1', desc: 'WAN ฝั่ง R2: 172.30.2.1/30 — เส้น R1—R2 จะเขียว' },
      { cmd: 'R1(config-if)# ip address 172.30.2.1 255.255.255.252', desc: 'กำหนด IP address ให้ interface นี้ (VLSM /30 สำหรับลิงก์จุดต่อจุด)' },
      { cmd: 'R1(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R1(config-if)# exit', desc: 'ออกจาก interface mode กลับสู่ config mode' },
    ],
    answer: 'interface g0/1\nip address 172.30.2.1 255.255.255.252\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('1'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('172.30.2.1', '255.255.255.252'), next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R1(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up' },
      {
        mode: 'config-if',
        pat: EXIT_PAT,
        next: 'config',
        pr: 'R1(config)#',
        adv: true,
        msg: '✓ g0/1 → 172.30.2.1/30 UP\n  เส้น R1—R2 เขียวแล้วครับ — ต่อไปตั้งค่า PC-A ก่อน แล้วค่อยไปตั้ง IP ของ R2',
      },
    ],
  },
  {
    id: 200,
    router: 'PC-A',
    type: 'pcconfig',
    name: 'PC-A — ตั้งค่า IP / Subnet / Gateway',
    short: 'PC-A config',
    mode: 'pcconfig',
    prompt: '(คลิก PC-A)',
    expected: { ip: '172.30.1.10', mask: '255.255.255.0', gateway: '172.30.1.1' },
    cmdHint: { cmd: '(คลิกที่ไอคอน PC-A บนแผนภาพด้านบน)', desc: 'กำหนด IP/Subnet/Gateway ให้ PC-A ผ่านหน้าต่างตั้งค่า' },
  },
  {
    id: 4,
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
    id: 22,
    router: 'R2',
    name: 'R2 — ตั้งชื่อ hostname',
    short: 'hostname R2',
    mode: 'config',
    prompt: 'Router(config)#',
    cmdHint: { cmd: 'Router(config)# hostname R2', desc: 'ตั้งชื่ออุปกรณ์เป็น R2 — Router ตัวนี้จะเป็น AS200 ทำหน้าที่ Transit ระหว่าง AS100 (R1) กับ AS300 (R3)' },
    hints: [{ cmd: 'Router(config)# hostname R2', desc: 'ตั้งชื่ออุปกรณ์เป็น R2' }],
    answer: 'hostname R2',
    commands: [{ mode: 'config', pat: hostnamePat('R2'), next: 'config', pr: 'R2(config)#', adv: true, msg: '✓ Hostname เปลี่ยนเป็น R2 แล้วครับ' }],
  },
  {
    id: 5,
    router: 'R2',
    name: 'R2 — g0/0 (←R1) 172.30.2.2/30 (ฝั่ง AS100)',
    short: 'g0/0 ←R1',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# interface g0/0', desc: 'ฝั่ง R1 (AS100): 172.30.2.2/30' },
    hints: [
      { cmd: 'R2(config)# interface g0/0', desc: 'ฝั่ง R1: 172.30.2.2/30' },
      { cmd: 'R2(config-if)# ip address 172.30.2.2 255.255.255.252', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R2(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R2(config-if)# exit', desc: 'ออกจาก interface mode' },
    ],
    answer: 'interface g0/0\nip address 172.30.2.2 255.255.255.252\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('0'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('172.30.2.2', '255.255.255.252'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up' },
      { mode: 'config-if', pat: EXIT_PAT, next: 'config', pr: 'R2(config)#', adv: true, msg: '✓ g0/0 → 172.30.2.2/30 UP' },
    ],
  },
  {
    id: 6,
    router: 'R2',
    name: 'R2 — g0/1 (→R3) 172.30.2.5/30 (ฝั่ง AS300)',
    short: 'g0/1 →R3',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# interface g0/1', desc: 'ฝั่ง R3 (AS300): 172.30.2.5/30 — เส้น R2—R3 จะเขียว' },
    hints: [
      { cmd: 'R2(config)# interface g0/1', desc: 'ฝั่ง R3: 172.30.2.5/30 — เส้น R2—R3 จะเขียว' },
      { cmd: 'R2(config-if)# ip address 172.30.2.5 255.255.255.252', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R2(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R2(config-if)# exit', desc: 'ออกจาก interface mode' },
    ],
    answer: 'interface g0/1\nip address 172.30.2.5 255.255.255.252\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('1'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('172.30.2.5', '255.255.255.252'), next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R2(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up' },
      {
        mode: 'config-if',
        pat: EXIT_PAT,
        next: 'config',
        pr: 'R2(config)#',
        adv: true,
        msg: '✓ g0/1 → 172.30.2.5/30 UP\n  เส้น R2—R3 เขียวแล้วครับ — สลับไปตั้ง IP ของ R3 ต่อได้เลยครับ',
      },
    ],
  },
  {
    id: 7,
    router: 'R3',
    name: 'R3 — enable & configure terminal',
    short: 'R3 enable',
    mode: 'exec',
    prompt: 'Router>',
    cmdHint: { cmd: 'Router> enable', desc: 'สลับไปทำ R3 — enable แล้ว configure terminal' },
    hints: [
      { cmd: 'Router> enable', desc: 'สลับไปทำ R3 — เข้าสู่ Privileged EXEC' },
      { cmd: 'Router# configure terminal', desc: 'เข้าสู่ Global Configuration mode' },
    ],
    answer: 'enable\nconfigure terminal',
    commands: [
      { mode: 'exec', pat: ENABLE_PAT, next: 'exec-priv', pr: 'Router#', adv: false, msg: '' },
      { mode: 'exec-priv', pat: CONFT_PAT, next: 'config', pr: 'Router(config)#', adv: true, msg: 'Enter configuration commands, one per line.\nRouter(config)#' },
    ],
  },
  {
    id: 23,
    router: 'R3',
    name: 'R3 — ตั้งชื่อ hostname',
    short: 'hostname R3',
    mode: 'config',
    prompt: 'Router(config)#',
    cmdHint: { cmd: 'Router(config)# hostname R3', desc: 'ตั้งชื่ออุปกรณ์เป็น R3' },
    hints: [{ cmd: 'Router(config)# hostname R3', desc: 'ตั้งชื่ออุปกรณ์เป็น R3' }],
    answer: 'hostname R3',
    commands: [{ mode: 'config', pat: hostnamePat('R3'), next: 'config', pr: 'R3(config)#', adv: true, msg: '✓ Hostname เปลี่ยนเป็น R3 แล้วครับ' }],
  },
  {
    id: 8,
    router: 'R3',
    name: 'R3 — g0/0 (←R2) 172.30.2.6/30 (ฝั่ง AS200)',
    short: 'g0/0 ←R2',
    mode: 'config',
    prompt: 'R3(config)#',
    cmdHint: { cmd: 'R3(config)# interface g0/0', desc: 'ฝั่ง R2 (AS200): 172.30.2.6/30' },
    hints: [
      { cmd: 'R3(config)# interface g0/0', desc: 'ฝั่ง R2: 172.30.2.6/30' },
      { cmd: 'R3(config-if)# ip address 172.30.2.6 255.255.255.252', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R3(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R3(config-if)# exit', desc: 'ออกจาก interface mode' },
    ],
    answer: 'interface g0/0\nip address 172.30.2.6 255.255.255.252\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('0'), next: 'config-if', pr: 'R3(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('172.30.2.6', '255.255.255.252'), next: 'config-if', pr: 'R3(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R3(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up' },
      { mode: 'config-if', pat: EXIT_PAT, next: 'config', pr: 'R3(config)#', adv: true, msg: '✓ g0/0 → 172.30.2.6/30 UP' },
    ],
  },
  {
    id: 9,
    router: 'R3',
    name: 'R3 — g0/1 LAN 172.30.3.1/24',
    short: 'g0/1 LAN',
    mode: 'config',
    prompt: 'R3(config)#',
    cmdHint: { cmd: 'R3(config)# interface g0/1', desc: 'LAN ฝั่ง PC-C: 172.30.3.1/24 — เส้น R3—PC-C จะเขียว' },
    hints: [
      { cmd: 'R3(config)# interface g0/1', desc: 'LAN ฝั่ง PC-C: 172.30.3.1/24 — เส้น R3—PC-C จะเขียว' },
      { cmd: 'R3(config-if)# ip address 172.30.3.1 255.255.255.0', desc: 'กำหนด IP address ให้ interface นี้' },
      { cmd: 'R3(config-if)# no shutdown', desc: 'เปิดใช้งาน interface' },
      { cmd: 'R3(config-if)# exit', desc: 'ออกจาก interface mode' },
    ],
    answer: 'interface g0/1\nip address 172.30.3.1 255.255.255.0\nno shutdown\nexit',
    commands: [
      { mode: 'config', pat: ifpat('1'), next: 'config-if', pr: 'R3(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: ipAddrPat('172.30.3.1', '255.255.255.0'), next: 'config-if', pr: 'R3(config-if)#', adv: false, msg: '' },
      { mode: 'config-if', pat: NOSHUT_PAT, next: 'config-if', pr: 'R3(config-if)#', adv: false, msg: '%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up' },
      {
        mode: 'config-if',
        pat: EXIT_PAT,
        next: 'config',
        pr: 'R3(config)#',
        adv: true,
        msg: '✓ g0/1 → 172.30.3.1/24 UP\n  ต่อไปตั้งค่า PC-C ให้ครบตามหลักการก่อนครับ',
      },
    ],
  },
  {
    id: 201,
    router: 'PC-C',
    type: 'pcconfig',
    name: 'PC-C — ตั้งค่า IP / Subnet / Gateway',
    short: 'PC-C config',
    mode: 'pcconfig',
    prompt: '(คลิก PC-C)',
    expected: { ip: '172.30.3.10', mask: '255.255.255.0', gateway: '172.30.3.1' },
    cmdHint: { cmd: '(คลิกที่ไอคอน PC-C บนแผนภาพด้านบน)', desc: 'กำหนด IP/Subnet/Gateway ให้ PC-C ผ่านหน้าต่างตั้งค่า' },
  },

  // ── เฟส 2: ตั้งค่า BGP บน R1 (AS100) — R1 ทำก่อน จึงยังไม่มี Neighbor Established (ต้องตั้งทั้ง 2 ฝั่งก่อนถึงจะขึ้น) ──
  {
    id: 10,
    router: 'R1',
    name: 'R1 — เปิดใช้งาน BGP (AS100) ผูก Neighbor กับ R2',
    short: 'BGP setup',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# router bgp 100', desc: 'เข้าสู่โหมดตั้งค่า BGP ด้วย AS Number ของตัวเอง (100)' },
    hints: [
      { cmd: 'R1(config)# router bgp 100', desc: 'เข้าสู่โหมดตั้งค่า BGP — 100 คือ AS Number ของ R1 เอง' },
      { cmd: 'R1(config-router)# neighbor 172.30.2.2 remote-as 200', desc: 'ผูก Neighbor กับ R2 (IP 172.30.2.2) — remote-as ต้องเป็นเลข AS ของ "ฝั่งตรงข้าม" (200) ไม่ใช่ของตัวเอง' },
      { cmd: 'R1(config-router)# network 172.30.1.0 mask 255.255.255.0', desc: 'ประกาศ network LAN ของตัวเองเข้า BGP — ต้องระบุ mask แบบเต็ม (255.255.255.0) ไม่ใช่ wildcard แบบ OSPF/EIGRP' },
    ],
    answer: 'router bgp 100\nneighbor 172.30.2.2 remote-as 200\nnetwork 172.30.1.0 mask 255.255.255.0',
    commands: [
      { mode: 'config', pat: routerBgpPat('100'), next: 'config-router', pr: 'R1(config-router)#', adv: false, msg: '' },
      { mode: 'config-router', pat: neighborRemoteAsPat('172.30.2.2', '200'), next: 'config-router', pr: 'R1(config-router)#', adv: false, msg: '' },
      {
        mode: 'config-router',
        pat: networkMaskPat('172.30.1.0', '255.255.255.0'),
        next: 'config',
        pr: 'R1(config)#',
        adv: true,
        msg: '✓ เปิด BGP (AS100) บน R1 แล้วครับ — ผูก Neighbor กับ R2 และประกาศ network LAN ของตัวเอง',
      },
    ],
  },
  {
    id: 11,
    router: 'R1',
    name: 'R1 — ตรวจสอบด้วย show ip bgp summary (Checkpoint)',
    short: 'show bgp summary',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# do show ip bgp summary', desc: 'ตรวจสอบสถานะ Neighbor — R2 ยังไม่ได้ตั้งค่าฝั่งของตัวเอง เลยเห็น State เป็น Active (พยายามเชื่อมต่อ TCP อยู่ ยังไม่ Established)' },
    answer: 'do show ip bgp summary',
    commands: [
      {
        mode: 'config',
        pat: SHOW_BGP_SUMMARY_PAT,
        next: 'config',
        pr: 'R1(config)#',
        adv: true,
        msg: 'BGP router identifier 172.30.2.1, local AS number 100\nNeighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n172.30.2.2      4   200       0       0        1    0    0 never    Active\n\n✗ Neighbor 172.30.2.2 ยังเป็น Active (ไม่ใช่ Established) เพราะ R2 ยังไม่ได้ตั้งค่า neighbor กลับมาหา R1 — BGP ต้องตั้งค่า "ทั้งสองฝั่ง" ให้ตรงกันก่อนถึงจะเชื่อมกันติด ต่างจาก OSPF/EIGRP ที่ multicast hello ประกาศตัวเองอัตโนมัติ — บันทึกความคืบหน้าไว้แล้ว',
      },
    ],
  },
  {
    id: 12,
    router: 'R1',
    name: 'R1 — end & write memory',
    short: 'save R1',
    mode: 'config',
    prompt: 'R1(config)#',
    cmdHint: { cmd: 'R1(config)# end  →  write memory', desc: 'บันทึก config R1' },
    hints: [
      { cmd: 'R1(config)# end', desc: 'ออกจาก config mode (end หรือ exit ก็ได้)' },
      { cmd: 'R1# write memory', desc: 'บันทึก config R1 ที่ตั้งค่าไว้ให้ถาวร' },
    ],
    answer: 'end\nwrite memory',
    commands: [
      { mode: 'config', pat: END_OR_EXIT_PAT, next: 'exec-priv', pr: 'R1#', adv: false, msg: 'R1#' },
      { mode: 'exec-priv', pat: writeMemPat(), next: 'exec-priv', pr: 'R1#', adv: true, msg: 'Building configuration...\n[OK]\n✓ R1 config บันทึกแล้วครับ — สลับไปทำ R3 ต่อครับ' },
    ],
  },

  // ── เฟส 2 (ต่อ): ตั้งค่า BGP บน R3 (AS300) — R3 ทำก่อน จึงยังไม่มี Neighbor Established เช่นกัน ──
  {
    id: 13,
    router: 'R3',
    name: 'R3 — เปิดใช้งาน BGP (AS300) ผูก Neighbor กับ R2',
    short: 'BGP setup',
    mode: 'config',
    prompt: 'R3(config)#',
    cmdHint: { cmd: 'R3(config)# router bgp 300', desc: 'เข้าสู่โหมดตั้งค่า BGP ด้วย AS Number ของตัวเอง (300)' },
    hints: [
      { cmd: 'R3(config)# router bgp 300', desc: 'เข้าสู่โหมดตั้งค่า BGP — 300 คือ AS Number ของ R3 เอง' },
      { cmd: 'R3(config-router)# neighbor 172.30.2.5 remote-as 200', desc: 'ผูก Neighbor กับ R2 (IP 172.30.2.5) — remote-as คือเลข AS ของฝั่งตรงข้าม (200)' },
      { cmd: 'R3(config-router)# network 172.30.3.0 mask 255.255.255.0', desc: 'ประกาศ network LAN ของตัวเองเข้า BGP ด้วย mask แบบเต็ม' },
    ],
    answer: 'router bgp 300\nneighbor 172.30.2.5 remote-as 200\nnetwork 172.30.3.0 mask 255.255.255.0',
    commands: [
      { mode: 'config', pat: routerBgpPat('300'), next: 'config-router', pr: 'R3(config-router)#', adv: false, msg: '' },
      { mode: 'config-router', pat: neighborRemoteAsPat('172.30.2.5', '200'), next: 'config-router', pr: 'R3(config-router)#', adv: false, msg: '' },
      {
        mode: 'config-router',
        pat: networkMaskPat('172.30.3.0', '255.255.255.0'),
        next: 'config',
        pr: 'R3(config)#',
        adv: true,
        msg: '✓ เปิด BGP (AS300) บน R3 แล้วครับ — ผูก Neighbor กับ R2 และประกาศ network LAN ของตัวเอง',
      },
    ],
  },
  {
    id: 14,
    router: 'R3',
    name: 'R3 — ตรวจสอบด้วย show ip bgp summary (Checkpoint)',
    short: 'show bgp summary',
    mode: 'config',
    prompt: 'R3(config)#',
    cmdHint: { cmd: 'R3(config)# do show ip bgp summary', desc: 'ตรวจสอบสถานะ Neighbor — R2 ยังไม่ได้ตั้งค่าฝั่งของตัวเอง เลยเห็น State เป็น Active เช่นเดียวกับที่ R1 เจอ' },
    answer: 'do show ip bgp summary',
    commands: [
      {
        mode: 'config',
        pat: SHOW_BGP_SUMMARY_PAT,
        next: 'config',
        pr: 'R3(config)#',
        adv: true,
        msg: 'BGP router identifier 172.30.3.1, local AS number 300\nNeighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n172.30.2.5      4   200       0       0        1    0    0 never    Active\n\n✗ Neighbor 172.30.2.5 ยังเป็น Active เหมือนกัน เพราะ R2 ยังไม่ได้ตั้งค่ากลับมาหา R3 — บันทึกความคืบหน้าไว้แล้ว',
      },
    ],
  },
  {
    id: 15,
    router: 'R3',
    name: 'R3 — end & write memory',
    short: 'save R3',
    mode: 'config',
    prompt: 'R3(config)#',
    cmdHint: { cmd: 'R3(config)# end  →  write memory', desc: 'บันทึก config R3 ที่ตั้งค่าไว้ให้ถาวร' },
    hints: [
      { cmd: 'R3(config)# end', desc: 'ออกจาก config mode (end หรือ exit ก็ได้)' },
      { cmd: 'R3# write memory', desc: 'บันทึก config R3 ที่ตั้งค่าไว้ให้ถาวร' },
    ],
    answer: 'end\nwrite memory',
    commands: [
      { mode: 'config', pat: END_OR_EXIT_PAT, next: 'exec-priv', pr: 'R3#', adv: false, msg: 'R3#' },
      { mode: 'exec-priv', pat: writeMemPat(), next: 'exec-priv', pr: 'R3#', adv: true, msg: 'Building configuration...\n[OK]\n✓ R3 config บันทึกแล้วครับ — สลับไปทำ R2 ต่อครับ' },
    ],
  },

  // ── เฟส 3: R2 (AS200) ผูก Neighbor ทั้ง 2 ฝั่ง — พอตั้งเสร็จ Session จะ Established ทันทีทั้งคู่ เพราะ R1/R3 ตั้งไว้ก่อนแล้ว ──
  {
    id: 16,
    router: 'R2',
    name: 'R2 — เปิดใช้งาน BGP (AS200) ผูก Neighbor ทั้ง R1 และ R3',
    short: 'BGP setup',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# router bgp 200', desc: 'เข้าสู่โหมดตั้งค่า BGP ด้วย AS Number ของตัวเอง (200) — R2 ไม่มี LAN ของตัวเองจึงไม่ต้องมีคำสั่ง network' },
    hints: [
      { cmd: 'R2(config)# router bgp 200', desc: 'เข้าสู่โหมดตั้งค่า BGP — 200 คือ AS Number ของ R2 เอง' },
      { cmd: 'R2(config-router)# neighbor 172.30.2.1 remote-as 100', desc: 'ผูก Neighbor กับ R1 (IP 172.30.2.1, remote-as 100)' },
      { cmd: 'R2(config-router)# neighbor 172.30.2.6 remote-as 300', desc: 'ผูก Neighbor กับ R3 (IP 172.30.2.6, remote-as 300) — R2 ทำหน้าที่ Transit AS ส่งต่อเส้นทางระหว่าง AS100 กับ AS300' },
    ],
    answer: 'router bgp 200\nneighbor 172.30.2.1 remote-as 100\nneighbor 172.30.2.6 remote-as 300',
    commands: [
      { mode: 'config', pat: routerBgpPat('200'), next: 'config-router', pr: 'R2(config-router)#', adv: false, msg: '' },
      { mode: 'config-router', pat: neighborRemoteAsPat('172.30.2.1', '100'), next: 'config-router', pr: 'R2(config-router)#', adv: false, msg: '' },
      {
        mode: 'config-router',
        pat: neighborRemoteAsPat('172.30.2.6', '300'),
        next: 'config',
        pr: 'R2(config)#',
        adv: true,
        msg: '✓ เปิด BGP (AS200) บน R2 แล้วครับ — ผูก Neighbor ครบทั้ง R1 และ R3',
      },
    ],
  },
  {
    id: 17,
    router: 'R2',
    name: 'R2 — ตรวจสอบ Neighbor ด้วย show ip bgp summary (Checkpoint)',
    short: 'show bgp summary',
    mode: 'config',
    prompt: 'R2(config)#',
    cmdHint: { cmd: 'R2(config)# do show ip bgp summary', desc: 'ตรวจสอบว่า Session BGP ทั้ง 2 เส้น Established แล้วหรือยัง — R1/R3 ตั้งค่าไว้ก่อนแล้ว จึงควรขึ้นทันทีทั้งคู่' },
    answer: 'do show ip bgp summary',
    commands: [
      {
        mode: 'config',
        pat: SHOW_BGP_SUMMARY_PAT,
        next: 'config',
        pr: 'R2(config)#',
        adv: true,
        msg: 'BGP router identifier 172.30.2.2, local AS number 200\nNeighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n172.30.2.1      4   100       6       7        3    0    0 00:00:14        1\n172.30.2.6      4   300       6       7        3    0    0 00:00:09        1\n\n✓ ทั้ง 2 Neighbor Established แล้วครับ (PfxRcd=1 แปลว่าได้รับ 1 prefix จากแต่ละฝั่ง) — บันทึกความคืบหน้าไว้แล้ว',
      },
    ],
  },
  {
    id: 18,
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
      { mode: 'exec-priv', pat: writeMemPat(), next: 'exec-priv', pr: 'R2#', adv: true, msg: 'Building configuration...\n[OK]\n✓ R2 config บันทึกแล้วครับ — สลับไปทำ R1 ต่อเพื่อตรวจผลลัพธ์ครับ' },
    ],
  },

  // ── เฟส 4: กลับไปตรวจสอบที่ R1 — Session ควรขึ้น Established แล้ว และเห็น Route ของ AS300 ผ่าน BGP ──
  {
    id: 19,
    router: 'R1',
    name: 'R1 — ตรวจสอบอีกครั้งด้วย show ip bgp summary (Checkpoint)',
    short: 'show bgp summary',
    mode: 'exec-priv',
    prompt: 'R1#',
    cmdHint: { cmd: 'R1# show ip bgp summary', desc: 'เช็คอีกครั้ง — คราวนี้ควร Established แล้ว เพราะ R2 ตั้งค่ากลับมาหา R1 เรียบร้อยแล้ว' },
    answer: 'show ip bgp summary',
    commands: [
      {
        mode: 'exec-priv',
        pat: SHOW_BGP_SUMMARY_NO_DO_PAT,
        next: 'exec-priv',
        pr: 'R1#',
        adv: true,
        msg: 'BGP router identifier 172.30.2.1, local AS number 100\nNeighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n172.30.2.2      4   200       8       9        4    0    0 00:00:16        1\n\n✓ Neighbor 172.30.2.2 Established แล้วครับ! (PfxRcd=1 คือ network 172.30.3.0/24 ของ AS300 ที่ R2 ส่งต่อมาให้)',
      },
    ],
  },
  {
    id: 20,
    router: 'R1',
    name: 'R1 — ตรวจสอบ Routing Table (show ip route)',
    short: 'show route',
    mode: 'exec-priv',
    prompt: 'R1#',
    cmdHint: { cmd: 'R1# show ip route', desc: 'ดู network ที่ R1 เรียนรู้มาจาก BGP ข้าม AS โดยอัตโนมัติ — สังเกตรหัส B (BGP) และ Administrative Distance ของ eBGP (20)' },
    answer: 'show ip route',
    commands: [
      {
        mode: 'exec-priv',
        pat: SHOW_IP_ROUTE_PAT,
        next: 'exec-priv',
        pr: 'R1#',
        adv: true,
        msg: 'Codes: L - local, C - connected, B - BGP\n\nC    172.30.1.0/24 is directly connected, GigabitEthernet0/0\nC    172.30.2.0/30 is directly connected, GigabitEthernet0/1\nB    172.30.3.0/24 [20/0] via 172.30.2.2, 00:00:20\n\n✓ เห็น network 172.30.3.0/24 (ของ PC-C ใน AS300) เป็น B (BGP) แล้วครับ — Administrative Distance 20 คือค่ามาตรฐานของ eBGP (น้อยกว่า OSPF/EIGRP/RIP ทุกตัว จึงถูกเลือกก่อนเสมอถ้ามีหลาย Protocol แข่งกัน)',
      },
    ],
  },
  {
    id: 24,
    router: 'PC-A',
    type: 'pcping',
    name: 'PC-A — ทดสอบ ping ไปยัง PC-C ผ่าน Command Prompt',
    short: 'ping PC-C (PC)',
    mode: 'pcping',
    prompt: '(คลิก PC-A)',
    target: { ip: '172.30.3.10', label: 'PC-C' },
    cmdHint: {
      cmd: '(คลิกที่ไอคอน PC-A บนแผนภาพด้านบน แล้วพิมพ์ ping 172.30.3.10 ในหน้า Command Prompt)',
      desc: 'ทดสอบว่า PC-A คุยกับ PC-C ได้จริงจากมุมมองผู้ใช้งานทั่วไป (ไม่ผ่าน Router) — ยืนยันว่า BGP พาข้าม 3 Autonomous System ไปถึงปลายทางได้จริง',
    },
  },
];

export const PRETEST: PretestQuestion[] = [
  {
    id: 'q1',
    type: 'mcq',
    q: 'BGP (Border Gateway Protocol) จัดอยู่ในประเภทใด และใช้งานหลักที่ไหน?',
    opts: [
      'Distance Vector เหมือน RIP ใช้ภายในองค์กรเดียว',
      'Link-State เหมือน OSPF ใช้ภายในองค์กรเดียว',
      'Path Vector — เป็น EGP (Exterior Gateway Protocol) ใช้แลกเปลี่ยนเส้นทาง "ระหว่าง" Autonomous System',
      'Advanced Distance Vector เหมือน EIGRP ใช้ภายในองค์กรเดียว',
    ],
    ans: 2,
    exp: 'BGP เป็น Path Vector Protocol และเป็น EGP (Exterior Gateway Protocol) ตัวเดียวที่ใช้กันแพร่หลาย — ต่างจาก RIP/OSPF/EIGRP ที่เป็น IGP (Interior Gateway Protocol) ใช้หาเส้นทาง "เร็วที่สุด" ภายในองค์กรเดียวกัน BGP เน้นแลกเปลี่ยนเส้นทางระหว่างคนละ Autonomous System (คนละองค์กร/ISP) โดยใช้ AS-PATH เป็นหลักในการตัดสินใจและป้องกัน Routing Loop',
  },
  {
    id: 'q2',
    type: 'mcq',
    q: 'ในคำสั่ง neighbor 172.30.2.2 remote-as 200 (ตั้งบน R1 ซึ่งอยู่ AS100) เลข 200 หมายถึงอะไร?',
    opts: ['AS Number ของ R1 เอง', 'AS Number ของ Router เพื่อนบ้าน (R2) ที่กำลังจะผูก Neighbor ด้วย', 'หมายเลข Process ID ของ BGP', 'หมายเลข Port ที่ใช้เชื่อมต่อ'],
    ans: 1,
    exp: 'remote-as ในคำสั่ง neighbor ต้องระบุ AS Number ของ "ฝั่งตรงข้าม" เสมอ ไม่ใช่ของตัวเอง — นี่คือจุดที่มือใหม่สับสนบ่อยที่สุด เพราะ AS ของตัวเองถูกประกาศไปแล้วตอนพิมพ์ router bgp [asn] ก่อนหน้านี้ ถ้าใส่ remote-as ผิดเป็นเลข AS ของตัวเอง Session จะไม่มีทาง Established (มองว่าเป็น iBGP ผิดประเภท)',
  },
  {
    id: 'q3',
    type: 'mcq',
    q: 'ทำไมหลังจากตั้งค่า BGP บน R1 เพียงฝั่งเดียว (ยังไม่ได้ตั้งที่ R2) คำสั่ง show ip bgp summary จึงเห็น Neighbor อยู่ในสถานะ Active แทนที่จะไม่เห็นอะไรเลยเหมือน OSPF/EIGRP?',
    opts: [
      'เพราะ BGP มี Bug ทำงานผิดปกติ',
      'เพราะ BGP ใช้ TCP (Unicast) เชื่อมต่อโดยตรงตาม IP ที่ระบุ จึงพยายามเชื่อมต่อซ้ำๆ (state Active) แม้อีกฝั่งยังไม่ตอบ ต่างจาก OSPF/EIGRP ที่ใช้ Multicast Hello ซึ่งจะไม่ปรากฏอะไรเลยถ้าไม่มีใครตอบ',
      'เพราะลืมพิมพ์ no shutdown',
      'เพราะ AS Number ไม่ตรงกัน',
    ],
    ans: 1,
    exp: 'BGP สร้าง Session ผ่าน TCP Port 179 แบบ Unicast ตรงไปยัง IP ที่ระบุใน neighbor command เสมอ ไม่ว่าอีกฝั่งจะตอบหรือไม่ — Router จึงพยายามเชื่อมต่อซ้ำเรื่อยๆ (แสดงเป็น State "Active") จนกว่าอีกฝั่งจะตั้งค่า neighbor กลับมาหาตัวเองด้วย Session ถึงจะเปลี่ยนเป็น "Established" — นี่คือความแตกต่างสำคัญจาก IGP ที่ discover เพื่อนบ้านอัตโนมัติผ่าน Multicast',
  },
  {
    id: 'q4',
    type: 'mcq',
    q: 'network 172.30.1.0 mask 255.255.255.0 ในคำสั่ง BGP ต่างจาก network ของ OSPF/EIGRP (ที่ใช้ wildcard mask) อย่างไร?',
    opts: [
      'เหมือนกันทุกประการ ใช้แทนกันได้',
      'BGP ต้องระบุ mask แบบเต็ม (ไม่ใช่ wildcard) และ network/mask นั้นต้อง "มีอยู่จริง" ในตาราง Routing Table อยู่แล้ว (เช่นจาก interface ที่ configured) ก่อน BGP จะยอมประกาศ ไม่ได้ discover จาก interface โดยอัตโนมัติ',
      'BGP ไม่มีคำสั่ง network เลย ต้องใช้ redistribute เท่านั้น',
      'BGP ใช้ wildcard mask เหมือนกันแต่กลับด้าน',
    ],
    ans: 1,
    exp: 'คำสั่ง network ของ BGP เป็นเพียงการ "บอกให้ BGP หยิบ Route นี้จาก Routing Table มาประกาศ" เท่านั้น (ไม่ใช่การเปิดใช้งาน Interface เหมือน IGP) — mask ต้องพิมพ์แบบเต็ม (Subnet Mask ปกติ ไม่ใช่ wildcard) และที่สำคัญคือ network/mask นั้นต้องตรงกับ Route ที่มีอยู่แล้วในตาราง Routing Table (มักมาจาก Connected Interface) เป๊ะๆ ไม่งั้น BGP จะไม่ประกาศ network นั้นออกไปเลย',
  },
  {
    id: 'q5',
    type: 'dragdrop',
    q: 'จับคู่คำสั่งกับหน้าที่ของมัน',
    pairs: [
      { left: 'router bgp 100', right: 'เข้าสู่โหมดตั้งค่า BGP พร้อมประกาศ AS Number ของตัวเอง (100)' },
      { left: 'neighbor 172.30.2.2 remote-as 200', right: 'ผูก Neighbor ตาม IP พร้อมระบุ AS Number ของฝั่งตรงข้าม (ต้องตั้งทั้ง 2 ฝั่งให้ตรงกัน Session ถึงจะ Established)' },
      { left: 'network 172.30.1.0 mask 255.255.255.0', right: 'ประกาศ Route ที่มีอยู่แล้วใน Routing Table เข้า BGP ด้วย Subnet Mask แบบเต็ม' },
      { left: 'show ip bgp summary', right: 'ตรวจสอบสถานะ Neighbor (Active/Established) และจำนวน Prefix ที่ได้รับจากแต่ละ AS' },
    ],
  },
];

export const INTRO_LINES = [
  { text: '# Ch.11 BGP — NETLab', cls: 't-info' },
  { text: '# อ้างอิง: Cisco Networking Academy W11', cls: 't-hint' },
  { text: '# Topology: PC-A—R1(AS100)—R2(AS200)—R3(AS300)—PC-C (ทุกลิงก์เป็น eBGP)', cls: 't-dim' },
  { text: '# R1: g0/0=172.30.1.1/24  g0/1=172.30.2.1/30', cls: 't-dim' },
  { text: '# R2: g0/0=172.30.2.2/30  g0/1=172.30.2.5/30', cls: 't-dim' },
  { text: '# R3: g0/0=172.30.2.6/30  g0/1=172.30.3.1/24', cls: 't-dim' },
  { text: '# BGP ต้องตั้งค่า neighbor ให้ตรงกันทั้ง 2 ฝั่งเสมอ Session ถึงจะ Established', cls: 't-dim' },
  { text: '' },
  { text: '# เริ่มที่ R1 — พิมพ์: enable', cls: 't-hint' },
];

export const WELCOME_MSG =
  'สวัสดีครับ! Ch.11 BGP\n\nTopology: PC-A—R1(AS100)—R2(AS200)—R3(AS300)—PC-C โดยทุก Router อยู่คนละ Autonomous System — ทุกลิงก์จึงเป็น eBGP\nขั้นตอนแรก: ตั้งชื่อ hostname และ IP ให้ครบทุกอุปกรณ์ก่อน (รวม PC-A, PC-C ด้วย) แล้วเปิด BGP ทีละ Router — สังเกตว่าตอนตั้งฝั่งแรกฝั่งเดียว Neighbor จะค้างที่ State "Active" เพราะ BGP ต้องตั้งค่าให้ตรงกันทั้ง 2 ฝั่งก่อนถึงจะ Established ต่างจาก OSPF/EIGRP ที่ผ่านมา รวม 26 steps\n\nทำ Pre-test ก่อนหรือข้ามไป Lab เลยก็ได้ครับ';

export const COMPLETE_CHAT_SUMMARY =
  'ยินดีด้วยครับ! Lab Ch.11 เสร็จสมบูรณ์!\n\nสรุป:\n• R1(AS100)—R2(AS200)—R3(AS300) ผูก eBGP ครบทั้ง 2 เส้น ด้วย router bgp/neighbor remote-as/network mask\n• ตอนตั้งค่าฝั่งเดียว Neighbor ค้างที่ State Active — ต้องตั้งทั้ง 2 ฝั่งให้ตรงกัน Session ถึง Established\n• R1 เรียนรู้ network 172.30.3.0/24 ของ AS300 เป็น B (BGP) ผ่าน R2 ด้วย Administrative Distance 20\n• ping PC-A→PC-C สำเร็จ ข้ามทั้ง 3 Autonomous System ด้วย BGP ที่ตั้งค่าไว้ทั้งหมด';
