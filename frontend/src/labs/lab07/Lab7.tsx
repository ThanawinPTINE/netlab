import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, CONFIG_ROUTER_WORDS, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab7Data';

export default function Lab7() {
  return (
    <ConfigLab
      labId={7}
      labNumberBadge="Lab 7"
      breadcrumbChapter="RIP v2"
      docTitle="Ch.7 RIP v2 — NETLab"
      pretestTitle="Pre-test — Ch.7 RIP v2"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      completeTitle="Lab Ch.7 สำเร็จ!"
      completeSubLines={['ตั้งค่า RIPv2 (VLSM + no auto-summary) ครบทั้ง R1, R2, R3', 'PC-A สามารถ ping PC-C ผ่าน route ที่เรียนรู้แบบ dynamic ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/labnetwork1/lab08-eigrp/lab8.html"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.7 RIP v2 (Classless Distance Vector, VLSM, no auto-summary)"
      systemRef="Cisco NetAcad W7"
      configRouterWords={CONFIG_ROUTER_WORDS}
    />
  );
}
