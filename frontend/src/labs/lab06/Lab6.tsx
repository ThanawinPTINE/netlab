import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, CONFIG_ROUTER_WORDS, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab6Data';

export default function Lab6() {
  return (
    <ConfigLab
      labId={6}
      labNumberBadge="Lab 6"
      breadcrumbChapter="RIP v1"
      docTitle="Ch.6 RIP v1 — NETLab"
      pretestTitle="Pre-test — Ch.6 RIP v1"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      completeTitle="Lab Ch.6 สำเร็จ!"
      completeSubLines={['ตั้งค่า RIPv1 ครบทั้ง R1, R2, R3', 'PC-A สามารถ ping PC-C ผ่าน route ที่เรียนรู้แบบ dynamic ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/labnetwork1/lab07-rip-v2/lab7.html"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.6 RIP v1 (Distance Vector Dynamic Routing)"
      systemRef="Cisco NetAcad W6"
      configRouterWords={CONFIG_ROUTER_WORDS}
    />
  );
}
