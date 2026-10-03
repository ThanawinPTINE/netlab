import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, CONFIG_ROUTER_WORDS, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab10Data';

export default function Lab10() {
  return (
    <ConfigLab
      labId={10}
      labNumberBadge="Lab 10"
      breadcrumbChapter="Redistribution"
      docTitle="Ch.10 Redistribution — NETLab"
      pretestTitle="Pre-test — Ch.10 Redistribution"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      completeTitle="Lab Ch.10 สำเร็จ!"
      completeSubLines={['ตั้งค่า OSPF (R1-R2) และ EIGRP (R2-R3) แยกกัน แล้ว Redistribute ทั้งสองทางบน R2', 'PC-A สามารถ ping PC-C ผ่าน route ที่ redistribute ข้าม Protocol ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/labnetwork1/lab11-bgp/lab11.html"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.10 Redistribution (ASBR, redistribute ospf/eigrp, OSPF ต้องมี subnets, EIGRP ต้องมี Seed Metric)"
      systemRef="Cisco NetAcad W10"
      configRouterWords={CONFIG_ROUTER_WORDS}
    />
  );
}
