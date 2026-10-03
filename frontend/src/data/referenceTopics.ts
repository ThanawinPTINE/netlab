/* NETLab Home page — Quick Reference content, ported verbatim from index.html's
   <div class="ref-panel"> blocks. Kept as raw HTML strings (rendered via
   dangerouslySetInnerHTML) rather than retyped as JSX, because this is dense
   factual Cisco networking content (AD values, timers, port numbers) where a
   transcription slip would be a real factual error, not just a style nit. */

export interface RefTopic {
  id: string;
  tabLabel: string;
  title: string;
  group: string;
  /** Inner HTML for the body column (topic-list / topic-cmds / prose) — exact
   * copy of the old .ref-panel-body's first child's innerHTML. */
  bodyHtml: string;
  visual?: { src: string; alt: string };
  docLinkLabel: string;
}

export const REF_GROUPS = [
  'Quick Reference',
  'Static Routing Fundamentals',
  'Addressing & Subnetting',
  'Dynamic Routing Protocols',
  'Other Services',
] as const;

export const REF_TOPICS: RefTopic[] = [
  {
    id: 'cmd',
    tabLabel: 'คำสั่งที่ต้องเจอบ่อยในการทำ Lab',
    title: 'คำสั่งที่ต้องเจอบ่อยในการทำ Lab',
    group: 'Quick Reference',
    bodyHtml: `
      <div class="cmd-row"><code>enable</code><span>เข้าสู่ Privileged EXEC mode</span></div>
      <div class="cmd-row"><code>configure terminal</code><span>เข้าสู่ Global Configuration mode</span></div>
      <div class="cmd-row"><code>interface g0/0</code><span>เข้าตั้งค่า Interface ที่ระบุ</span></div>
      <div class="cmd-row"><code>ip address [ip] [mask]</code><span>กำหนด IP Address ให้ Interface</span></div>
      <div class="cmd-row"><code>no shutdown</code><span>เปิดใช้งาน Interface (ค่าเริ่มต้นถูกปิดไว้)</span></div>
      <div class="cmd-row"><code>ip route ...</code><span>ตั้งค่า Static หรือ Default Route</span></div>
      <div class="cmd-row"><code>end</code><span>ออกจาก Configuration mode กลับสู่ Privileged EXEC</span></div>
      <div class="cmd-row"><code>write memory</code><span>บันทึก config ลง NVRAM ให้ถาวร (หรือ <code>wr</code>)</span></div>
      <div class="cmd-row"><code>show ip route</code><span>ดู Routing Table ปัจจุบันของ Router</span></div>
      <div class="cmd-row"><code>show ip interface brief</code><span>ดูสถานะ/IP ของทุก Interface แบบย่อ</span></div>
      <div class="cmd-row"><code>ping [ip]</code><span>ทดสอบว่าเชื่อมต่อถึงปลายทางได้หรือไม่</span></div>
      <div class="cmd-row"><code>traceroute [ip]</code><span>ดูเส้นทางที่ packet เดินทางผ่านแต่ละ Router</span></div>
    `,
    visual: { src: '/assets/topic-images/lab-common-commands.png', alt: 'คำสั่งที่ต้องเจอบ่อยในการทำ Lab' },
    docLinkLabel: 'เอกสารฉบับเต็ม — คำสั่ง Cisco IOS ที่ใช้บ่อย',
  },
  {
    id: 'abbr',
    tabLabel: 'การพิมพ์คำสั่งแบบย่อ (Command Abbreviation)',
    title: 'การพิมพ์คำสั่งแบบย่อ (Command Abbreviation)',
    group: 'Quick Reference',
    bodyHtml: `
<p>Cisco IOS ยอมให้พิมพ์คำสั่งแบบย่อได้ โดยไม่ต้องพิมพ์เต็มทุกตัวอักษร หลักการมีข้อเดียวคือ <b>พิมพ์ให้ยาวพอที่จะไม่กำกวมกับคำสั่งอื่นในโหมดเดียวกัน</b> ถ้าตัวอักษรที่พิมพ์ชี้ไปที่คำสั่งได้เพียงคำสั่งเดียว IOS จะเข้าใจทันที</p>
<p>ยกตัวอย่างในโหมด Interface Configuration คำสั่งที่ขึ้นต้นด้วยตัว <code>s</code> มีหลายคำ เช่น <code>shutdown</code>, <code>speed</code>, <code>standby</code> การพิมพ์แค่ <code>s</code> จึงยังไม่รู้ว่าหมายถึงคำไหน แต่พอเติมเป็น <code>sh</code> ก็เหลือคำเดียวคือ <code>shutdown</code> ดังนั้น <code>no sh</code> จึงใช้งานได้จริง และเป็นรูปที่ช่างเครือข่ายพิมพ์กันเป็นปกติ</p>
<p>ข้อสำคัญคือ <b>ความกำกวมขึ้นกับโหมดที่อยู่ตอนนั้น</b> คำย่อเดียวกันอาจใช้ได้ในโหมดหนึ่งแต่กำกวมในอีกโหมดหนึ่ง เพราะแต่ละโหมดมีชุดคำสั่งไม่เหมือนกัน</p>
<div class="ref-table-wrap"><table class="ref-table"><caption>คำสั่งที่ใช้บ่อยใน Lab 4-11 กับรูปย่อที่สั้นที่สุดที่ระบบรับ</caption><thead><tr><th>คำสั่งเต็ม</th><th>ย่อสั้นสุด</th><th>ตัวอย่างที่ใช้ได้</th><th>ทำไมสั้นกว่านี้ไม่ได้</th></tr></thead><tbody>
<tr><td><code>enable</code></td><td><code>en</code></td><td><code>en</code></td><td><code>e</code> ชนกับ <code>exit</code></td></tr>
<tr><td><code>configure terminal</code></td><td><code>conf t</code></td><td><code>conf t</code> / <code>config t</code></td><td><code>con</code> ชนกับ <code>connect</code></td></tr>
<tr><td><code>interface g0/0</code></td><td><code>in g0/0</code></td><td><code>int g0/0</code> / <code>inter gig0/0</code></td><td>ใน Global config ไม่มีคำสั่งอื่นขึ้นต้นด้วย <code>in</code></td></tr>
<tr><td><code>ip address</code></td><td><code>ip ad</code></td><td><code>ip ad 10.0.0.1 255.255.255.0</code></td><td><code>a</code> ชนกับ <code>access-group</code></td></tr>
<tr><td><code>no shutdown</code></td><td><code>no sh</code></td><td><code>no sh</code> / <code>no shut</code></td><td><code>s</code> ชนกับ <code>speed</code>, <code>standby</code></td></tr>
<tr><td><code>hostname</code></td><td><code>ho</code></td><td><code>ho R1</code></td><td><code>h</code> ชนกับคำสั่งอื่นในโหมดเดียวกัน</td></tr>
<tr><td><code>network</code></td><td><code>net</code></td><td><code>net 10.0.0.0 0.0.0.3 ar 0</code></td><td><code>ne</code> ชนกับ <code>neighbor</code></td></tr>
<tr><td><code>neighbor</code></td><td><code>nei</code></td><td><code>nei 10.0.0.2 remote-as 200</code></td><td><code>ne</code> ชนกับ <code>network</code></td></tr>
<tr><td><code>redistribute</code></td><td><code>red</code></td><td><code>red ospf 2 sub</code></td><td><code>re</code> ยังกำกวมในโหมด router</td></tr>
<tr><td><code>no auto-summary</code></td><td><code>no au</code></td><td><code>no au</code></td><td><code>a</code> ชนกับคำสั่งอื่น</td></tr>
<tr><td><code>traceroute</code></td><td><code>tr</code></td><td><code>tr 192.168.3.10</code></td><td><code>t</code> ชนกับ <code>telnet</code>, <code>terminal</code></td></tr>
<tr><td><code>show running-config</code></td><td><code>sh run</code></td><td><code>sh run</code></td><td><code>s</code> และ <code>ru</code> ยังกำกวม</td></tr>
<tr><td><code>write memory</code></td><td><code>wr</code></td><td><code>wr</code> / <code>wr m</code></td><td><code>wr</code> เป็นรูปย่อที่ IOS รับได้ทั้งคำสั่ง</td></tr>
<tr><td><code>username</code></td><td><code>us</code></td><td><code>us admin secret 1234</code></td><td><code>u</code> ยังกำกวม</td></tr>
<tr><td><code>transport input ssh</code></td><td><code>tr i ssh</code></td><td><code>tr i ssh</code></td><td>ในโหมด line ไม่มีคำสั่งอื่นขึ้นต้นด้วย <code>tr</code></td></tr>
<tr><td><code>exit</code></td><td><code>ex</code></td><td><code>ex</code></td><td><code>e</code> ชนกับ <code>enable</code>, <code>end</code></td></tr>
</tbody></table></div>
<p style="margin-top:var(--space-5)">เมื่อพิมพ์ย่อสั้นเกินไปจนกำกวม IOS จะไม่เดาให้ แต่จะตอบกลับว่า:</p>
<div class="ios-reply">R1(config)# ip ro 10.0.0.0 255.255.255.0 192.168.1.2
% Ambiguous command:  "ip ro"</div>
<p>ส่วนถ้าพิมพ์คำสั่งถูกแต่ใส่ค่าไม่ครบ จะได้คำตอบคนละแบบ ซึ่งบอกว่าคำสั่งถูกแล้วแต่ยังขาดข้อมูล:</p>
<div class="ios-reply">R1(config)# ip route 10.0.0.0
% Incomplete command.</div>
<p>การแยกสองข้อความนี้ให้ออกช่วยแก้ปัญหาได้เร็วขึ้นมาก — <b>Ambiguous</b> แปลว่าต้องพิมพ์ให้ยาวขึ้น ส่วน <b>Incomplete</b> แปลว่าต้องใส่ค่าต่อท้ายให้ครบ</p>
<div class="ref-table-wrap"><table class="ref-table"><caption>คำที่ดูเหมือนย่อได้ แต่ย่อแล้วกำกวม — ต้องพิมพ์ยาวกว่าที่คิด</caption><thead><tr><th>ตั้งใจจะพิมพ์</th><th>ย่อแบบที่มักพลาด</th><th>ปัญหา</th><th>ต้องพิมพ์อย่างน้อย</th></tr></thead><tbody>
<tr><td><code>ip route</code></td><td><code class="rt-no">ip ro</code></td><td>ชนกับ <code>ip routing</code> ซึ่งเป็นคนละคำสั่ง</td><td><code class="rt-ok">ip route</code> (เต็มคำ)</td></tr>
<tr><td><code>router ospf 1</code></td><td><code class="rt-no">rout ospf 1</code></td><td>ชนกับ <code>route</code> และ <code>routing</code></td><td><code class="rt-ok">router ospf 1</code> (เต็มคำ)</td></tr>
<tr><td><code>ip domain-name</code></td><td><code class="rt-no">ip domain</code></td><td>ชนกับ <code>ip domain-lookup</code> และ <code>ip domain-list</code></td><td><code class="rt-ok">ip domain-n</code></td></tr>
</tbody></table></div>
<p style="margin-top:var(--space-5)">เครื่องมือช่วยอีกสองอย่างที่ควรใช้ควบคู่กันคือ</p>
<ul><li><b>ปุ่ม Tab</b> — พิมพ์บางส่วนแล้วกด Tab IOS จะเติมคำที่เหลือให้อัตโนมัติถ้าไม่กำกวม เช่นพิมพ์ <code>conf</code> แล้วกด Tab จะได้ <code>configure</code> ทันที วิธีนี้ช่วยให้พิมพ์เร็วโดยไม่ต้องเสี่ยงสะกดผิด</li>
<li><b>เครื่องหมาย ?</b> — พิมพ์ <code>?</code> เพื่อดูว่าตำแหน่งนั้นใส่อะไรได้บ้าง หรือพิมพ์ติดกับตัวอักษร เช่น <code>sh?</code> เพื่อดูเฉพาะคำสั่งที่ขึ้นต้นด้วย sh ในโหมดปัจจุบัน</li></ul>
<p>ในเทอร์มินัลจำลองของ Lab 4-11 รองรับการพิมพ์ย่อตามกฎเดียวกันนี้ และรองรับปุ่ม Tab ด้วย จึงฝึกพิมพ์แบบย่อได้เหมือนอุปกรณ์จริงตั้งแต่ใน Lab</p>
    `,
    docLinkLabel: 'เอกสารฉบับเต็ม — การพิมพ์คำสั่งแบบย่อ',
  },
  {
    id: 'static',
    tabLabel: 'Static Route คืออะไร',
    title: 'Static Route คืออะไร',
    group: 'Static Routing Fundamentals',
    bodyHtml: `<ul class="topic-list">
      <li>คำสั่งที่ผู้ดูแลระบบ<b>กำหนดเส้นทางเอง</b>ให้ Router รู้จักวิธีไปยัง network ปลายทาง ตรงข้ามกับ Dynamic Routing ที่ Router เรียนรู้เส้นทางอัตโนมัติผ่าน Protocol (RIP, OSPF, EIGRP) — เหมาะกับเครือข่ายขนาดเล็กหรือเส้นทางที่ไม่ซับซ้อน เพราะ config ง่าย ไม่กิน CPU/Bandwidth</li>
      <li>รูปแบบคำสั่งพื้นฐาน: <code>ip route [destination-network] [subnet-mask] [next-hop-ip]</code></li>
      <li>มี <b>Administrative Distance (AD) = 1</b> โดยดีฟอลต์ — น่าเชื่อถือรองจาก Directly Connected (AD=0) เท่านั้น ทำให้ Router เลือกใช้ static route ก่อน Dynamic Routing Protocol ทุกตัวเสมอถ้ามีปลายทางเดียวกัน</li>
      <li><b>ข้อเสียหลัก</b>: ไม่ปรับตัวอัตโนมัติเมื่อ topology เปลี่ยน (เช่นลิงก์ขาด) ผู้ดูแลระบบต้องเข้ามาแก้ config เองทุกครั้ง ต่างจาก Dynamic Routing ที่คำนวณเส้นทางใหม่ให้เอง</li>
      <li><b>Default Route</b> (<code>ip route 0.0.0.0 0.0.0.0 [next-hop]</code>) คือ static route แบบพิเศษที่ใช้ดักจับ traffic ทุกปลายทางที่ไม่มีอยู่ใน routing table — มักใช้ที่ Router ขอบเครือข่ายออกสู่ Internet</li>
      <li><b>Floating Static Route</b> — ตั้ง AD ให้สูงกว่าเส้นทางหลัก (ต่อท้ายคำสั่งด้วยเลข AD) เพื่อใช้เป็นเส้นทางสำรองที่จะทำงานเฉพาะตอนเส้นทางหลักล่มเท่านั้น</li>
      <li>คำสั่ง <code>show ip route static</code> ใช้ดูเฉพาะเส้นทางที่เป็น Static Route ในตาราง Routing Table แยกจากเส้นทางที่มาจาก Dynamic Routing Protocol</li>
      <li>Static Route ที่ระบุ Next-hop IP เรียกว่า <b>Recursive Static Route</b> เพราะ Router ต้องเปิด routing table ซ้ำอีกครั้งเพื่อหา Interface ที่จะออกจริง ต่างจากแบบระบุ Exit Interface ที่ไม่ต้องเปิดซ้ำ</li>
      <li>เปรียบเทียบ Administrative Distance ที่ Router ใช้เลือกเส้นทาง: Directly Connected = 0, Static = 1, EIGRP = 90, OSPF = 110, RIP = 120 — ยิ่งค่าน้อยยิ่งน่าเชื่อถือกว่า</li>
    </ul>`,
    visual: { src: '/assets/topic-images/static-route-overview.png', alt: 'แผนภาพ Static Route' },
    docLinkLabel: 'เอกสารฉบับเต็ม — Static Routing',
  },
  {
    id: 'components',
    tabLabel: 'ส่วนประกอบของคำสั่ง ip route',
    title: 'ส่วนประกอบของคำสั่ง ip route',
    group: 'Static Routing Fundamentals',
    bodyHtml: `<ul class="topic-list">
      <li><b>Destination Network</b> — เครือข่ายปลายทางที่ต้องการให้ Router รู้จัก เช่น <code>192.168.3.0</code></li>
      <li><b>Subnet Mask</b> — กำหนดขอบเขตของเครือข่ายปลายทางนั้น เช่น <code>255.255.255.0</code></li>
      <li><b>Next-hop IP หรือ Exit Interface</b> — บอก Router ว่าให้ส่ง packet ออกไปทางไหนเพื่อไปถึงปลายทาง</li>
      <li><b>Administrative Distance (ไม่บังคับ)</b> — ใส่ตัวเลขต่อท้ายคำสั่งเพื่อกำหนดความน่าเชื่อถือของเส้นทางนี้เอง เช่น <code>ip route 192.168.3.0 255.255.255.0 10.0.0.2 120</code> ใช้ทำ Floating Static Route</li>
      <li>ตัวอย่างคำสั่งเต็ม: <code>ip route 192.168.3.0 255.255.255.0 10.0.0.2</code> หมายถึง "ให้ไปที่เครือข่าย 192.168.3.0/24 โดยส่งผ่าน Router ที่ IP 10.0.0.2"</li>
      <li>เลือกใช้ <b>Exit Interface</b> แทน Next-hop IP ได้เฉพาะลิงก์แบบ Point-to-Point เท่านั้น (เช่น Serial link) เพราะมี Router ปลายทางเดียวให้ส่งออกได้อยู่แล้ว ถ้าเป็น Ethernet/Multi-access ควรระบุ Next-hop IP เสมอ ไม่งั้นอาจเกิดปัญหา ARP ไม่สมบูรณ์</li>
      <li>คำสั่งเต็มยังรองรับ keyword <code>permanent</code> ต่อท้าย เพื่อให้เส้นทางไม่ถูกลบออกจาก routing table แม้ Interface ที่ใช้จะ down ไปชั่วคราว</li>
      <li>ถ้าลืมใส่ Subnet Mask หรือใส่ผิดรูปแบบ คำสั่งจะ error ทันทีเพราะ IOS ตรวจสอบไวยากรณ์นี้อย่างเข้มงวด ต่างจาก Next-hop ที่ผิดแล้วยังรันคำสั่งผ่านได้</li>
      <li>ลบ Static Route ที่ตั้งไว้ด้วยการพิมพ์คำสั่งเดิมซ้ำแต่เติม <code>no</code> นำหน้า เช่น <code>no ip route 192.168.3.0 255.255.255.0 10.0.0.2</code></li>
    </ul>`,
    visual: { src: '/assets/topic-images/ip-route-command-components.png', alt: 'ส่วนประกอบของคำสั่ง ip route' },
    docLinkLabel: 'เอกสารฉบับเต็ม — ส่วนประกอบของ Route',
  },
  {
    id: 'nexthop',
    tabLabel: 'Next-Hop IP Address คืออะไร',
    title: 'Next-Hop IP Address คืออะไร',
    group: 'Static Routing Fundamentals',
    bodyHtml: `<ul class="topic-list">
      <li>คือ IP Address ของ Router <b>ตัวถัดไป</b> ที่จะรับ packet เพื่อส่งต่อไปยังปลายทางสุดท้าย</li>
      <li>ต้องเป็น IP ที่ Router ปัจจุบัน "มองเห็น" ได้โดยตรง คืออยู่ใน Subnet เดียวกันกับ Interface ที่เชื่อมต่อถึงกัน (เช่นลิงก์ WAN ระหว่าง 2 Router)</li>
      <li>ถ้าใส่ Next-hop ผิด (ไม่ได้อยู่ใน subnet เดียวกัน) คำสั่งจะไม่ error ทันทีแต่เส้นทางจะใช้งานไม่ได้จริง</li>
      <li>เมื่อ Router ได้รับ packet จะทำ <b>Recursive Lookup</b> — ค้นหาใน routing table ซ้ำไปเรื่อยๆ จนกว่าจะเจอ Interface จริงที่จะส่ง packet ออก</li>
      <li>ถ้า Next-hop ที่ตั้งไว้ไม่มีเส้นทางไปถึงเลย Recursive Lookup จะหาไม่เจอ ทำให้เกิด Routing Loop หรือ Route ใช้งานไม่ได้ในทางปฏิบัติ</li>
      <li>ตัวอย่าง: ลิงก์ WAN ระหว่าง R1 (10.0.0.1/30) กับ R2 (10.0.0.2/30) — ที่ R1 ต้องตั้ง Next-hop เป็น <code>10.0.0.2</code> เพราะเป็น IP ของ Interface อีกฝั่งที่อยู่ใน subnet /30 เดียวกัน</li>
      <li>ตรวจสอบ Next-hop ที่ตั้งไว้แล้วด้วยคำสั่ง <code>show ip route</code> — ถ้าเส้นทางไม่ขึ้นในตารางแสดงว่า Next-hop ยังใช้งานไม่ได้จริง</li>
      <li>บนลิงก์แบบ Point-to-Point (เช่น Serial) สามารถใช้ <b>Exit Interface</b> แทน Next-hop IP ได้เลย เพราะมีปลายทางเดียวให้ส่งออก ไม่ต้องระบุ IP ปลายทางก็หาเจอ</li>
      <li>ในเครือข่ายจริง Next-hop ที่ตั้งผิด subnet เป็นสาเหตุการตั้งค่า Static Route ผิดพลาดที่พบบ่อยที่สุด ควรตรวจสอบด้วย <code>show ip interface brief</code> ก่อนตั้งค่าเสมอ</li>
    </ul>`,
    visual: { src: '/assets/topic-images/next-hop-ip-address.png', alt: 'Next-Hop IP Address' },
    docLinkLabel: 'เอกสารฉบับเต็ม — Next-Hop',
  },
  {
    id: 'iosmodes',
    tabLabel: 'โหมดการทำงานบน Cisco IOS',
    title: 'โหมดการทำงานบน Cisco IOS',
    group: 'Static Routing Fundamentals',
    bodyHtml: `<ul class="topic-list">
      <li><code>Router&gt;</code> <b>User EXEC</b> — โหมดแรกที่เข้ามา ดูข้อมูลพื้นฐานได้ แก้ config ไม่ได้</li>
      <li><code>Router#</code> <b>Privileged EXEC</b> — เข้าด้วยคำสั่ง <code>enable</code> ใช้คำสั่งขั้นสูงและดู config เต็มได้</li>
      <li><code>Router(config)#</code> <b>Global Configuration</b> — เข้าด้วย <code>configure terminal</code> ตั้งค่า Router ทั้งเครื่อง</li>
      <li><code>Router(config-if)#</code> <b>Interface Configuration</b> — ตั้งค่าเฉพาะ Interface ที่เลือก เช่น IP Address</li>
      <li>ใช้ <code>exit</code> เพื่อ<b>ถอยกลับทีละ 1 ระดับ</b> (เช่นจาก Interface Config กลับไป Global Config) ส่วน <code>end</code> หรือ <code>Ctrl+Z</code> จะ<b>กระโดดกลับ</b> ไปที่ Privileged EXEC ทันทีไม่ว่าจะอยู่ระดับไหน</li>
      <li><code>Rommon&gt;</code> <b>ROM Monitor Mode</b> — โหมดฉุกเฉินระดับต่ำสุด เข้าถึงได้ตอน Router หา IOS image ไม่เจอหรือกด Break ระหว่าง boot ใช้กู้คืนระบบ/reset password (ใช้คำสั่ง <code>?</code> ดูรายการคำสั่งที่ใช้ได้ในโหมดปัจจุบัน และ <code>Tab</code> เติมคำสั่งอัตโนมัติได้ทุกโหมด)</li>
      <li>คำสั่ง <code>show running-config</code> ใช้ดู config ปัจจุบันที่ใช้งานอยู่ใน RAM ส่วน <code>show startup-config</code> ใช้ดู config ที่จะโหลดตอนเปิดเครื่องใหม่ (เก็บใน NVRAM)</li>
      <li>โหมด <b>Setup Mode</b> จะเข้ามาอัตโนมัติเมื่อ Router ไม่มี startup-config เลย เป็นตัวช่วยถาม-ตอบตั้งค่าพื้นฐานทีละขั้นตอน</li>
      <li>คำสั่ง <code>Ctrl+Shift+6</code> ใช้หยุดการทำงานของคำสั่งที่กำลังรันอยู่ (เช่น ping ที่ค้าง) โดยไม่ต้องออกจากโหมดปัจจุบัน</li>
    </ul>`,
    visual: { src: '/assets/topic-images/cisco-ios-modes.png', alt: 'โหมดการทำงานบน Cisco IOS' },
    docLinkLabel: 'เอกสารฉบับเต็ม — โหมดการทำงาน Cisco IOS',
  },
  {
    id: 'ipsubnet',
    tabLabel: 'IP Address และ Subnet พื้นฐาน',
    title: 'IP Address และ Subnet พื้นฐาน',
    group: 'Addressing & Subnetting',
    bodyHtml: `<ul class="topic-list">
      <li>IPv4 มีทั้งหมด 32 bit แบ่งเป็นส่วน <b>Network</b> และส่วน <b>Host</b></li>
      <li>Subnet Mask เป็นตัวกำหนดว่า bit ไหนเป็น Network ส่วนไหนเป็น Host เช่น <code>/24</code> (255.255.255.0) มี Host ใช้ได้ 254 เครื่อง</li>
      <li><code>/30</code> (255.255.255.252) นิยมใช้กับลิงก์ WAN แบบ Point-to-Point ระหว่าง Router 2 ตัว เพราะมี Host address ใช้งานได้พอดี 2 ตัว ไม่เปลืองพื้นที่ IP</li>
      <li><b>Private IP Ranges</b> (ใช้ในเครือข่ายภายใน ไม่ routing บน Internet จริง): <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code></li>
      <li><b>Classful เดิม</b>: Class A (1-126, /8), Class B (128-191, /16), Class C (192-223, /24) — ปัจจุบันแทบไม่ใช้แบ่งตาม Class แล้ว เปลี่ยนมาใช้ CIDR แทน</li>
      <li><b>Network Address</b> (host bits เป็น 0 ทั้งหมด) และ <b>Broadcast Address</b> (host bits เป็น 1 ทั้งหมด) ของแต่ละ subnet ใช้เป็น Host IP จริงไม่ได้ ต้องหักออกจากจำนวน Host ที่ใช้งานได้เสมอ</li>
      <li>Subnet Mask ต้องเป็นบิต 1 ต่อเนื่องกันจากซ้ายเสมอ (เช่น <code>11111111.11111111.11111111.00000000</code>) จะสลับ 0 แทรกกลาง 1 ไม่ได้</li>
      <li>Loopback Address <code>127.0.0.0/8</code> สงวนไว้ทดสอบเครื่องตัวเอง (เช่น <code>127.0.0.1</code>) ไม่ใช้งานจริงบนเครือข่าย</li>
      <li>APIPA <code>169.254.0.0/16</code> คือ IP ที่เครื่องตั้งให้ตัวเองอัตโนมัติเมื่อหา DHCP Server ไม่เจอ บ่งบอกปัญหาการเชื่อมต่อ DHCP</li>
    </ul>`,
    visual: { src: '/assets/topic-images/ip-address-subnet-basics.png', alt: 'IP Address และ Subnet พื้นฐาน' },
    docLinkLabel: 'เอกสารฉบับเต็ม — IP Address & Subnetting',
  },
  {
    id: 'vlsm',
    tabLabel: 'VLSM (Variable Length Subnet Mask)',
    title: 'VLSM (Variable Length Subnet Mask)',
    group: 'Addressing & Subnetting',
    bodyHtml: `<ul class="topic-list">
      <li>แบ่ง subnet จาก network เดียวกันให้มี<b>ขนาดไม่เท่ากัน</b> ตามจำนวน Host จริงที่แต่ละวงต้องใช้ ไม่เปลือง IP เหมือนแบ่งขนาดเท่ากันทุกวง (FLSM)</li>
      <li>ตัวอย่าง: แบ่ง <code>/24</code> วงใหญ่ ออกเป็น <code>/26</code>, <code>/28</code>, <code>/30</code> ตามขนาดของแต่ละ LAN/WAN link</li>
      <li>ต้องคำนวณ Network Address, Broadcast Address และช่วง Usable Host ให้ถูกต้องในแต่ละ subnet ที่แบ่งย่อยออกมา</li>
      <li><b>ขั้นตอนคำนวณ (1-2)</b>: เรียงลำดับความต้องการ Host จากมากไปน้อย แล้วหาขนาด subnet ที่เล็กที่สุดที่รองรับ Host ได้พอในแต่ละวง</li>
      <li><b>ขั้นตอนคำนวณ (3)</b>: จัดสรร block ให้ไม่ทับซ้อนกัน โดยเริ่มจาก block ใหญ่สุดก่อนเสมอ เพื่อไม่ให้ IP วงเล็กไปแทรกกลางวงใหญ่</li>
      <li>ตัวอย่าง: จาก <code>192.168.1.0/24</code> ถ้า LAN A ต้องการ 100 Host จะได้ <code>/25</code> (ใช้ได้ 126 Host), LAN B ต้องการ 50 Host จะได้ <code>/26</code> (62 Host), ลิงก์ WAN ต้องการแค่ 2 Host จะได้ <code>/30</code> (2 Host)</li>
      <li>VLSM ช่วยแก้ปัญหา IP ขาดแคลนได้ดีกว่า FLSM (แบ่งขนาดเท่ากันทุกวง) เพราะจัดสรรตามความต้องการจริงของแต่ละ LAN/WAN</li>
      <li>ข้อควรระวัง: ต้องจัดสรร block ขนาดใหญ่ก่อนเสมอ ถ้าจัดสรร block เล็กก่อนอาจทำให้ไม่มีพื้นที่ต่อเนื่องพอสำหรับ block ใหญ่ที่เหลือ</li>
      <li>ในการสอบเชิงปฏิบัติ ควรร่างตาราง Subnet ที่ต้องใช้ทั้งหมดก่อนเริ่ม config จริงบน Router เพื่อลดข้อผิดพลาดจากการคำนวณสด</li>
    </ul>`,
    visual: { src: '/assets/topic-images/vlsm-variable-length-subnet-mask.png', alt: 'VLSM' },
    docLinkLabel: 'เอกสารฉบับเต็ม — VLSM',
  },
  {
    id: 'cidr',
    tabLabel: 'CIDR (Classless Inter-Domain Routing)',
    title: 'CIDR (Classless Inter-Domain Routing)',
    group: 'Addressing & Subnetting',
    bodyHtml: `<ul class="topic-list">
      <li>วิธีเขียน Subnet Mask แบบย่อด้วย Prefix Length เช่น <code>/24</code> แทน <code>255.255.255.0</code></li>
      <li>ช่วยลดขนาด Routing Table ด้วยการรวมหลาย Network เข้าด้วยกันเป็นเส้นทางเดียว (Route Summarization)</li>
      <li>เป็นมาตรฐานที่ใช้แทนระบบ Classful Addressing (Class A/B/C) แบบเดิมที่แบ่ง subnet ตายตัวไม่ยืดหยุ่น</li>
      <li>ตัวอย่าง Prefix ที่พบบ่อย (วงใหญ่): <code>/24</code> = 254 Host, <code>/25</code> = 126 Host, <code>/26</code> = 62 Host</li>
      <li>ตัวอย่าง Prefix ที่พบบ่อย (วงเล็ก): <code>/27</code> = 30 Host, <code>/28</code> = 14 Host, <code>/29</code> = 6 Host, <code>/30</code> = 2 Host</li>
      <li><b>Supernetting</b> — ตรงข้ามกับ Subnetting คือการรวมหลาย network เล็กๆ ที่ติดกันให้เป็น block ใหญ่ block เดียว ช่วยลดจำนวนแถวใน Routing Table ของ Router ต้นทาง</li>
      <li><b>Wildcard Mask</b> (ใช้กับ OSPF/ACL) คือค่าผกผันของ Subnet Mask เช่น <code>/24</code> มี Subnet Mask <code>255.255.255.0</code> แต่ Wildcard Mask คือ <code>0.0.0.255</code></li>
      <li>Route Summarization ด้วย CIDR ช่วยลดภาระ CPU และ Memory ของ Router เพราะไม่ต้องเก็บทุก subnet ย่อยแยกกันในตาราง</li>
      <li>เงื่อนไขสำคัญของการทำ Supernetting คือ network ที่จะรวมกันต้องเป็นบล็อกที่ติดกันและมีขนาดเท่ากัน (power of 2) เท่านั้น</li>
    </ul>`,
    visual: { src: '/assets/topic-images/cidr-classless-inter-domain-routing.png', alt: 'CIDR' },
    docLinkLabel: 'เอกสารฉบับเต็ม — CIDR',
  },
  {
    id: 'rip',
    tabLabel: 'RIP (Routing Information Protocol)',
    title: 'RIP (Routing Information Protocol)',
    group: 'Dynamic Routing Protocols',
    bodyHtml: `<ul class="topic-list">
      <li>Dynamic Routing Protocol แบบ <b>Distance Vector</b> ใช้ Hop Count เป็นตัวชี้วัดเส้นทางที่ดีที่สุด (ไปได้สูงสุด 15 hop)</li>
      <li><b>RIPv1</b> เป็น Classful ไม่ส่ง Subnet Mask ไปด้วย ส่วน <b>RIPv2</b> เป็น Classless ส่ง Subnet Mask ไปด้วย รองรับ VLSM</li>
      <li>ส่งตารางเส้นทางทั้งหมดไปให้ Router ข้างเคียงทุก 30 วินาที (Periodic Update) ทำให้ Convergence ช้ากว่า Protocol อื่น</li>
      <li><b>Timer สำคัญ</b>: Update Timer 30s (ส่งตารางเป็นระยะ), Invalid Timer 180s (ถ้าไม่ได้ update เส้นทางนั้นถือว่าใช้ไม่ได้), Holddown Timer 180s (กันไม่ให้เส้นทางที่เพิ่งล่มกลับมาเร็วเกินไปจนเกิด Loop), Flush Timer 240s (ลบเส้นทางออกจากตารางถาวร)</li>
      <li>คำสั่งตั้งค่าเบื้องต้น: <code>router rip</code> เข้าสู่โหมดตั้งค่า RIP แล้วตามด้วย <code>network [network-address]</code> เพื่อประกาศ interface ที่ต้องการให้ RIP ทำงาน</li>
      <li>มีปัญหา <b>Routing Loop</b> ได้ง่ายเพราะอาศัย Hop Count ล้วนๆ — ป้องกันด้วยเทคนิคเช่น Split Horizon และ Route Poisoning</li>
      <li>คำสั่ง <code>show ip protocols</code> ใช้ตรวจสอบว่า RIP กำลังทำงานอยู่จริง พร้อม Timer และ Network ที่ประกาศไว้</li>
      <li>RIPv2 รองรับ <b>Authentication</b> ป้องกัน Router ปลอมส่ง update เข้ามาแทรกในเครือข่าย ต่างจาก RIPv1 ที่ไม่มีระบบนี้</li>
      <li>เมื่อ Router เรียนรู้เส้นทางเดียวกันจากหลายเพื่อนบ้านด้วย Hop Count เท่ากัน RIP จะทำ <b>Load Balancing</b> แบบ Equal-Cost อัตโนมัติสูงสุด 4 เส้นทาง (ค่าเริ่มต้น)</li>
    </ul>`,
    visual: { src: '/assets/topic-images/rip-routing-information-protocol.png', alt: 'RIP' },
    docLinkLabel: 'เอกสารฉบับเต็ม — RIP',
  },
  {
    id: 'ospf',
    tabLabel: 'OSPF (Open Shortest Path First)',
    title: 'OSPF (Open Shortest Path First)',
    group: 'Dynamic Routing Protocols',
    bodyHtml: `<ul class="topic-list">
      <li>Dynamic Routing Protocol แบบ <b>Link-State</b> คำนวณเส้นทางที่ดีที่สุดด้วยค่า Cost (อิงจาก Bandwidth) ผ่านอัลกอริทึม Dijkstra (SPF)</li>
      <li>แบ่งเครือข่ายออกเป็น <b>Area</b> เพื่อลดภาระการคำนวณเส้นทางและช่วยให้ขยายเครือข่ายขนาดใหญ่ได้ดี</li>
      <li>เป็น Open Standard ใช้ได้กับอุปกรณ์หลายยี่ห้อ ไม่ผูกติดกับ Cisco เท่านั้นเหมือน EIGRP</li>
      <li>ก่อนแลกเปลี่ยนเส้นทางกันได้ Router ต้องผ่านสถานะ <b>Neighbor States</b> ตามลำดับ: Down → Init → 2-Way → ExStart → Exchange → Loading → <b>Full</b> (พร้อมใช้งานสมบูรณ์)</li>
      <li>บนเครือข่ายแบบ Multi-access (เช่น Ethernet) จะเลือก <b>DR (Designated Router)</b> และ <b>BDR (Backup DR)</b> เพื่อลดจำนวนการแลกเปลี่ยนข้อมูลระหว่าง Router ทุกตัว ไม่ต้องคุยกันแบบ full-mesh</li>
      <li>คำสั่งตั้งค่าเบื้องต้น: <code>router ospf [process-id]</code> ตามด้วย <code>network [address] [wildcard-mask] area [area-id]</code></li>
      <li>คำสั่ง <code>show ip ospf neighbor</code> ใช้ตรวจสอบสถานะความสัมพันธ์กับ Router ข้างเคียง ต้องเป็น Full หรือ 2-Way (บน Multi-access ที่ไม่ใช่ DR/BDR) จึงจะแลกเปลี่ยนเส้นทางสมบูรณ์</li>
      <li>OSPF ใช้ <b>Router ID</b> (เลข 32 บิตรูปแบบเดียวกับ IP) เป็นตัวระบุตัวตน Router แต่ละเครื่องในกระบวนการเลือก DR/BDR และคำนวณเส้นทาง</li>
      <li><b>Cost</b> คำนวณจากสูตร Reference Bandwidth หารด้วย Bandwidth ของ Interface นั้น — ยิ่ง Bandwidth สูง Cost ยิ่งต่ำ ทำให้ถูกเลือกเป็นเส้นทางหลัก</li>
    </ul>`,
    visual: { src: '/assets/topic-images/ospf-open-shortest-path-first.png', alt: 'OSPF' },
    docLinkLabel: 'เอกสารฉบับเต็ม — OSPF',
  },
  {
    id: 'eigrp',
    tabLabel: 'EIGRP',
    title: 'EIGRP (Enhanced Interior Gateway Routing Protocol)',
    group: 'Dynamic Routing Protocols',
    bodyHtml: `<ul class="topic-list">
      <li>พัฒนาโดย Cisco เป็น Advanced Distance Vector (บางตำราเรียก Hybrid) ใช้ <b>DUAL Algorithm</b> หาเส้นทางสำรองเตรียมไว้ล่วงหน้า</li>
      <li>คำนวณ Metric จากหลายปัจจัยร่วมกัน (Bandwidth, Delay, Reliability, Load) ไม่ใช่แค่ Hop Count เหมือน RIP</li>
      <li>Convergence เร็วกว่า RIP มาก เพราะมีเส้นทางสำรอง (Feasible Successor) พร้อมสลับใช้งานได้ทันทีที่เส้นทางหลักล่ม</li>
      <li>Router ที่จะเป็นเพื่อนบ้านกันได้ต้องอยู่ <b>Autonomous System (AS) number เดียวกัน</b> — ตั้งค่าตอนเริ่มคำสั่งด้วย <code>router eigrp [as-number]</code></li>
      <li>เดิม Cisco เป็นเจ้าของเทคโนโลยีนี้แต่เดียว (Proprietary) ภายหลังเปิดบางส่วนเป็น Open Standard ผ่าน RFC 7868 แล้ว แต่ในทางปฏิบัติยังพบใช้งานเฉพาะอุปกรณ์ Cisco เป็นหลัก</li>
      <li>คำสั่งตั้งค่าเบื้องต้น: <code>router eigrp [as-number]</code> ตามด้วย <code>network [network-address]</code></li>
      <li>คำสั่ง <code>show ip eigrp neighbors</code> ใช้ดูรายชื่อ Router เพื่อนบ้านที่จับคู่ AS number กันสำเร็จแล้ว</li>
      <li><b>Feasible Successor</b> คือเส้นทางสำรองที่ EIGRP เตรียมไว้ล่วงหน้าโดยไม่ต้องคำนวณใหม่ตอนเส้นทางหลักล่ม ทำให้ Convergence เร็วกว่า Distance Vector ทั่วไปมาก</li>
      <li>EIGRP รองรับทั้ง IPv4 และ IPv6 ในตัวเดียวกัน (ผ่าน Address-family configuration) ต่างจาก RIP ที่ต้องแยกเวอร์ชันชัดเจน</li>
    </ul>`,
    visual: { src: '/assets/topic-images/eigrp-routing-protocol.png', alt: 'EIGRP' },
    docLinkLabel: 'เอกสารฉบับเต็ม — EIGRP',
  },
  {
    id: 'bgp',
    tabLabel: 'BGP (Border Gateway Protocol)',
    title: 'BGP (Border Gateway Protocol)',
    group: 'Dynamic Routing Protocols',
    bodyHtml: `<ul class="topic-list">
      <li>Path-Vector Protocol ใช้เชื่อมต่อระหว่าง <b>Autonomous System (AS)</b> เช่น ระหว่าง ISP กับองค์กร หรือ ISP กับ ISP</li>
      <li>เป็นโปรโตคอลหลักที่ขับเคลื่อน Internet ทั้งโลก ให้แต่ละ AS แลกเปลี่ยนเส้นทางกันได้</li>
      <li>เลือกเส้นทางจาก Attribute หลายตัว (เช่น AS-Path, Local Preference) ไม่ได้เลือกแค่เส้นทางที่สั้นที่สุดเหมือน IGP ทั่วไป</li>
      <li>แบ่งเป็น <b>eBGP</b> (External — เชื่อมระหว่างคนละ AS เช่น องค์กรกับ ISP) และ <b>iBGP</b> (Internal — เชื่อม Router ภายใน AS เดียวกัน)</li>
      <li>คำสั่งตั้งค่าเบื้องต้น: <code>router bgp [as-number]</code> ตามด้วย <code>neighbor [neighbor-ip] remote-as [as-number]</code> เพื่อระบุ Router เพื่อนบ้านที่จะแลกเปลี่ยนเส้นทางด้วย</li>
      <li>ต่างจาก IGP (RIP/OSPF/EIGRP) ที่เน้นหาเส้นทาง "เร็วที่สุด" ภายในองค์กรเดียว BGP เน้นความสัมพันธ์เชิงนโยบาย (Policy-based Routing) ระหว่างองค์กรมากกว่าความเร็วอย่างเดียว</li>
      <li>คำสั่ง <code>show ip bgp summary</code> ใช้ตรวจสอบสถานะ Neighbor และจำนวนเส้นทางที่ได้รับจากแต่ละ AS</li>
      <li>BGP ใช้ TCP Port 179 ในการสร้างการเชื่อมต่อกับ Neighbor ต่างจาก IGP ทั่วไปที่ส่งข้อมูลผ่าน Multicast/Broadcast โดยตรง</li>
      <li>เนื่องจากตาราง BGP บน Internet มีขนาดใหญ่มาก (หลายแสนเส้นทาง) การตั้งค่า Route Filtering และ Route-map จึงสำคัญมากในการควบคุมนโยบายที่แลกเปลี่ยนกัน</li>
    </ul>`,
    visual: { src: '/assets/topic-images/bgp-border-gateway-protocol.png', alt: 'BGP' },
    docLinkLabel: 'เอกสารฉบับเต็ม — BGP',
  },
  {
    id: 'dhcp',
    tabLabel: 'DHCP',
    title: 'DHCP (Dynamic Host Configuration Protocol)',
    group: 'Other Services',
    bodyHtml: `<ul class="topic-list">
      <li>แจก IP Address ให้อุปกรณ์ในเครือข่ายโดยอัตโนมัติ ไม่ต้องตั้งค่า IP แบบ Static เองทีละเครื่อง</li>
      <li>ทำงานผ่านกระบวนการ <b>DORA</b>: Discover → Offer → Request → Acknowledge</li>
      <li>นอกจาก IP Address แล้วยังแจก Subnet Mask, Default Gateway และ DNS Server ให้พร้อมกันได้ในครั้งเดียว</li>
      <li>IP ที่แจกไปมี <b>Lease Time</b> กำหนดระยะเวลาการเช่าใช้ เมื่อหมดอายุอุปกรณ์ต้องขอต่ออายุ (Renew) หรือขอ IP ใหม่</li>
      <li>ถ้า DHCP Server อยู่คนละ Subnet กับเครื่องลูกข่าย ต้องตั้ง <b>DHCP Relay</b> ด้วยคำสั่ง <code>ip helper-address [dhcp-server-ip]</code> ที่ Interface ฝั่งเครื่องลูกข่าย เพื่อส่งต่อ request ข้าม subnet ไปหา Server</li>
      <li>คำสั่งตั้งค่า Router เป็น DHCP Server เบื้องต้น: <code>ip dhcp pool [ชื่อ]</code> ตามด้วย <code>network [address] [mask]</code> และ <code>default-router [gateway-ip]</code></li>
      <li>คำสั่ง <code>show ip dhcp binding</code> ใช้ดูรายการ IP ที่แจกไปแล้วพร้อม MAC Address ของเครื่องที่ได้รับ</li>
      <li>กำหนด <code>ip dhcp excluded-address</code> เพื่อกันไม่ให้ DHCP Pool แจก IP บางช่วงที่ถูกใช้แบบ Static ไปแล้ว (เช่น IP ของ Server, Gateway)</li>
      <li>ถ้าไม่ได้รับ IP จากกระบวนการ DORA ภายในเวลาที่กำหนด เครื่องลูกข่ายจะ fallback ไปใช้ APIPA (<code>169.254.x.x</code>) แทนโดยอัตโนมัติ</li>
    </ul>`,
    visual: { src: '/assets/topic-images/dhcp-service.png', alt: 'DHCP' },
    docLinkLabel: 'เอกสารฉบับเต็ม — DHCP',
  },
];
