import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, CONFIG_ROUTER_WORDS, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab8Data';

export default function Lab8() {
  return (
    <ConfigLab
      labId={8}
      labNumberBadge="Lab 8"
      breadcrumbChapter="EIGRP"
      docTitle="Ch.8 EIGRP — NETLab"
      pretestTitle="Pre-test — Ch.8 EIGRP"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      completeTitle="Lab Ch.8 สำเร็จ!"
      completeSubLines={['ตั้งค่า EIGRP (AS 100 + no auto-summary) ครบทั้ง R1, R2, R3', 'PC-A สามารถ ping PC-C ผ่าน route ที่เรียนรู้แบบ dynamic ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/labnetwork1/lab09-ospf/lab9.html"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.8 EIGRP (Advanced Distance Vector, AS 100, wildcard mask, no auto-summary)"
      systemRef="Cisco NetAcad W8"
      configRouterWords={CONFIG_ROUTER_WORDS}
    />
  );
}
