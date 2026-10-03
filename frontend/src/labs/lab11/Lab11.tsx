import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, CONFIG_ROUTER_WORDS, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab11Data';

export default function Lab11() {
  return (
    <ConfigLab
      labId={11}
      labNumberBadge="Lab 11"
      breadcrumbChapter="BGP"
      docTitle="Ch.11 BGP — NETLab"
      pretestTitle="Pre-test — Ch.11 BGP"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      completeTitle="Lab Ch.11 สำเร็จ!"
      completeSubLines={['ตั้งค่า eBGP ระหว่าง R1 (AS100) ↔ R2 (AS200) ↔ R3 (AS300) ครบทั้ง 2 เส้น', 'PC-A สามารถ ping PC-C ผ่าน route ที่เรียนรู้ข้าม Autonomous System ด้วย BGP ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/course.html"
      nextLabLabel="กลับไปหน้า Course →"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.11 BGP (Path Vector, eBGP, router bgp/neighbor remote-as/network mask, AS Number, show ip bgp summary)"
      systemRef="Cisco NetAcad W11"
      configRouterWords={CONFIG_ROUTER_WORDS}
    />
  );
}
