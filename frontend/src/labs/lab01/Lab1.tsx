import TheoryLab from '../../components/theorylab/TheoryLab';
import { STEPS } from './lab1Steps';

export default function Lab1() {
  return (
    <TheoryLab
      labId={1}
      labNumberBadge="Lab 1"
      breadcrumbChapter="Course Introduction"
      docTitle="Ch.1 Course Introduction — NETLab"
      steps={STEPS}
      welcomeMsg={
        'สวัสดีครับ! Ch.1 Course Introduction\n\nLab นี้จะพาทบทวนพื้นฐานเครือข่ายทั้งหมดก่อนเริ่มลงมือปฏิบัติจริงใน Lab ถัดไป — อ่านเนื้อหาแต่ละหัวข้อ กด "ถัดไป" เพื่อไปต่อ และตอบคำถาม Checkpoint ให้ถูกก่อนถึงจะไปหัวข้อถัดไปได้ครับ รวม {steps} steps (มีคำถามทบทวนรวมท้ายบทอีก {review} ข้อ)'
      }
      completeTitle="Lab Ch.1 สำเร็จ!"
      completeSub="ทบทวนพื้นฐานเครือข่ายครบทุกหัวข้อ — ประเภทเครือข่าย, Topology, อุปกรณ์, สื่อกลาง, OSI/TCP-IP Model และ IP Address เบื้องต้น พร้อมสำหรับ Lab ถัดไปแล้วครับ"
      completeChatSummary={
        'ยินดีด้วยครับ! Lab Ch.1 เสร็จสมบูรณ์!\n\nสรุป:\n• เครือข่ายและประเภทตามขนาด (PAN/LAN/MAN/WAN)\n• Topology และอุปกรณ์เครือข่ายพื้นฐาน (Hub/Switch/Router/AP)\n• สื่อกลาง, Bandwidth/Throughput/Latency\n• OSI Model 7 ชั้น และ TCP/IP Model 4 ชั้น พร้อม Encapsulation\n• IP Address, Public/Private IP, MAC Address เบื้องต้น\n\nพร้อมไปเรียนรู้การเข้าหัวสาย UTP ใน Lab 2 ต่อได้เลยครับ'
      }
      nextLabHref="/labnetwork1/lab02-cable-termination/lab2.html"
      systemPromptPrefix={
        'Role: Networking Fundamentals Tutor\nLanguage: Thai, ใช้ครับ\nSubject: Ch.1 Course Introduction — เครือข่ายเบื้องต้น, ประเภทเครือข่าย, Topology, อุปกรณ์เครือข่าย, สื่อกลาง, OSI/TCP-IP Model, IP Address เบื้องต้น\nRules: ตอบสั้นไม่เกิน 4 ประโยค เข้าใจง่าย\nUI ที่ผู้เรียนเห็นบนหน้าจอ (อ้างอิงได้เฉพาะสิ่งเหล่านี้เท่านั้น): เนื้อหาบทเรียนพร้อมภาพประกอบและตารางในหน้าปัจจุบัน | รายการหัวข้อด้านซ้าย. Lab นี้เป็นเนื้อหาทฤษฎี ไม่มีเทอร์มินัล Cisco ไม่มีแผนภาพ Topology และไม่มีตาราง IP. ห้ามอ้างถึงเอกสาร ใบงาน ไฟล์ PDF หรือหน้าจออื่นที่ไม่มีอยู่จริง'
      }
    />
  );
}
