import TheoryLab from '../../components/theorylab/TheoryLab';
import { STEPS } from './lab2Steps';

export default function Lab2() {
  return (
    <TheoryLab
      labId={2}
      labNumberBadge="Lab 2"
      breadcrumbChapter="Cable Termination"
      docTitle="Ch.2 Cable Termination — NETLab"
      steps={STEPS}
      welcomeMsg={
        'สวัสดีครับ! Ch.2 Cable Termination\n\nLab นี้จะพาเรียนรู้เครื่องมือเข้าสาย UTP และฝึกเรียงลำดับสีสายตามมาตรฐาน T568A/T568B จริงด้วยแบบฝึกหัดคลิกเรียงสี — อ่านเนื้อหาแต่ละหัวข้อ กด "ถัดไป" เพื่อไปต่อ ตอบคำถาม Checkpoint และเรียงสายให้ถูกก่อนถึงจะไปหัวข้อถัดไปได้ครับ รวม {steps} steps (มีคำถามทบทวนรวมท้ายบทอีก {review} ข้อ)'
      }
      completeTitle="Lab Ch.2 สำเร็จ!"
      completeSub="ฝึกเรียงสาย T568A และ T568B ครบ พร้อมเข้าใจหน้าที่ของ Crimper, Punch-down Tool, Keystone Jack และ Patch Panel — พร้อมสำหรับการคำนวณ IP Address ใน Lab ถัดไปแล้วครับ"
      completeChatSummary={
        'ยินดีด้วยครับ! Lab Ch.2 เสร็จสมบูรณ์!\n\nสรุป:\n• เครื่องมือเข้าสาย UTP (Crimper, Punch-down Tool, Cable Tester)\n• มาตรฐาน T568A และ T568B พร้อมฝึกเรียงลำดับสีจริงทั้งสองแบบ\n• Straight-through Cable vs Crossover Cable และเมื่อไหร่ต้องใช้แบบไหน\n• Keystone Jack และ Patch Panel ในงานติดตั้งจริง\n\nพร้อมไปคำนวณ IP Address และ Subnet ใน Lab 3 ต่อได้เลยครับ'
      }
      nextLabHref="/labnetwork1/lab03-ip-subnetting/lab3.html"
      systemPromptPrefix={
        'Role: Networking Fundamentals Tutor (Cable Termination)\nLanguage: Thai, ใช้ครับ\nSubject: Ch.2 Cable Termination — เครื่องมือเข้าสาย UTP, มาตรฐาน T568A/T568B, Straight-through vs Crossover, Keystone Jack, Patch Panel\nRules: ตอบสั้นไม่เกิน 4 ประโยค เข้าใจง่าย ถ้าเป็นแบบฝึกหัดเรียงสายห้ามบอกลำดับสีทั้งหมดตรงๆ ให้ใบ้หลักการแทน\nUI ที่ผู้เรียนเห็นบนหน้าจอ (อ้างอิงได้เฉพาะสิ่งเหล่านี้เท่านั้น): เนื้อหาบทเรียนพร้อมภาพประกอบและตารางในหน้าปัจจุบัน | รายการหัวข้อด้านซ้าย. Lab นี้เป็นเนื้อหาทฤษฎี ไม่มีเทอร์มินัล Cisco ไม่มีแผนภาพ Topology และไม่มีตาราง IP. ห้ามอ้างถึงเอกสาร ใบงาน ไฟล์ PDF หรือหน้าจออื่นที่ไม่มีอยู่จริง'
      }
    />
  );
}
