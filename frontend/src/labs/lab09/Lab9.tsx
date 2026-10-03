import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, CONFIG_ROUTER_WORDS, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab9Data';

export default function Lab9() {
  return (
    <ConfigLab
      labId={9}
      labNumberBadge="Lab 9"
      breadcrumbChapter="OSPF"
      docTitle="Ch.9 OSPF — NETLab"
      pretestTitle="Pre-test — Ch.9 OSPF"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      completeTitle="Lab Ch.9 สำเร็จ!"
      completeSubLines={['ตั้งค่า OSPF (Single-Area, Area 0) ครบทั้ง R1, R2, R3', 'PC-A สามารถ ping PC-C ผ่าน route ที่เรียนรู้แบบ dynamic ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/labnetwork1/lab10-redistribution/lab10.html"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.9 OSPF (Link-State, Single-Area, Process ID Locally Significant, wildcard mask + area)"
      systemRef="Cisco NetAcad W9"
      configRouterWords={CONFIG_ROUTER_WORDS}
    />
  );
}
