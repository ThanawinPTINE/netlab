import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab4Data';

export default function Lab4() {
  return (
    <ConfigLab
      labId={4}
      labNumberBadge="Lab 4"
      breadcrumbChapter="Basic Configuration"
      docTitle="Ch.4 Basic Configuration — NETLab"
      pretestTitle="Pre-test — Ch.4 Basic Configuration"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      completeTitle="Lab Ch.4 สำเร็จ!"
      completeSubLines={['ตั้งค่าพื้นฐานครบทั้ง R1, R2 — Hostname, Domain, Password, SSH, Interface', 'PC-A สามารถ ping และ traceroute ไปหา PC-B ผ่าน R1, R2 ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/labnetwork1/lab05-static-route/lab5.html"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.4 Basic Configuration (Hostname, Password, Interface, SSH)"
      systemRef="Cisco NetAcad W4"
    />
  );
}
