import TheoryLab from '../../components/theorylab/TheoryLab';
import { STEPS } from './lab3Steps';

export default function Lab3() {
  return (
    <TheoryLab
      labId={3}
      labNumberBadge="Lab 3"
      breadcrumbChapter="IP Address and Subnetting"
      docTitle="Ch.3 IP Address and Subnetting — NETLab"
      steps={STEPS}
      welcomeMsg={
        'สวัสดีครับ! Ch.3 IP Address and Subnetting\n\nLab นี้จะพาคำนวณ Subnet Mask, Network Address, Broadcast Address และ Host Range จริง — อ่านเนื้อหาแต่ละหัวข้อ กด "ถัดไป" เพื่อไปต่อ ตอบคำถาม Checkpoint และทำแบบฝึกหัดคำนวณให้ถูกก่อนถึงจะไปหัวข้อถัดไปได้ครับ รวม {steps} steps (มีคำถามทบทวนรวมท้ายบทอีก {review} ข้อ)'
      }
      completeTitle="Lab Ch.3 สำเร็จ!"
      completeSub="คำนวณ Network Address, Broadcast Address, Host Range และ VLSM ครบทุกแบบฝึกหัด — พร้อมนำไปใช้คำนวณ IP จริงเวลาตั้งค่า Router ใน Lab ถัดไปแล้วครับ"
      completeChatSummary={
        'ยินดีด้วยครับ! Lab Ch.3 เสร็จสมบูรณ์!\n\nสรุป:\n• Classful Addressing (Class A/B/C) และ CIDR Notation\n• Subnet Mask, Block Size และสูตร 2ⁿ / 2ⁿ-2\n• คำนวณ Network Address, Broadcast Address และ Host Range จริงทั้ง /24, /26, /28, /30\n• VLSM เบื้องต้น — เลือกขนาด Subnet ให้พอดีกับจำนวน Host ที่ต้องการ\n\nพร้อมนำความรู้นี้ไปใช้ตั้งค่า IP จริงบน Router ใน Lab 4 เป็นต้นไปแล้วครับ'
      }
      nextLabHref="/labnetwork1/lab04-basic-configuration/lab4.html"
      systemPromptPrefix={
        'Role: Networking Fundamentals Tutor (Subnetting)\nLanguage: Thai, ใช้ครับ\nSubject: Ch.3 IP Address and Subnetting — Classful Addressing, CIDR, Subnet Mask, Block Size, คำนวณ Network/Broadcast/Host Range, VLSM\nRules: ตอบสั้นไม่เกิน 4 ประโยค เข้าใจง่าย ถ้าเป็นแบบฝึกหัดคำนวณห้ามบอกคำตอบเป๊ะๆ ให้อธิบายวิธีคิดแทน\nUI ที่ผู้เรียนเห็นบนหน้าจอ (อ้างอิงได้เฉพาะสิ่งเหล่านี้เท่านั้น): เนื้อหาบทเรียนพร้อมภาพประกอบและตารางในหน้าปัจจุบัน | รายการหัวข้อด้านซ้าย. Lab นี้เป็นเนื้อหาทฤษฎี ไม่มีเทอร์มินัล Cisco ไม่มีแผนภาพ Topology และไม่มีตาราง IP. ห้ามอ้างถึงเอกสาร ใบงาน ไฟล์ PDF หรือหน้าจออื่นที่ไม่มีอยู่จริง'
      }
    />
  );
}
