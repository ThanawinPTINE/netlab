import ConfigLab from '../../components/configlab/ConfigLab';
import { COMPLETE_CHAT_SUMMARY, INTRO_LINES, LINKS, NODES, NODE_IP_LABELS, PRETEST, STEPS, WELCOME_MSG } from './lab5Data';

export default function Lab5() {
  return (
    <ConfigLab
      labId={5}
      labNumberBadge="Lab 5"
      breadcrumbChapter="Static & Default Routing"
      docTitle="Ch.5 Static & Default Routing — NETLab"
      pretestTitle="Pre-test — Ch.5 Static & Default Routing"
      topologyViewBox="0 0 920 230"
      nodes={NODES}
      links={LINKS}
      steps={STEPS}
      pretest={PRETEST}
      nodeIpLabels={NODE_IP_LABELS}
      initialPrompt="R1>"
      completeTitle="Lab Ch.5 สำเร็จ!"
      completeSubLines={['config Static Route และ Default Route ครบทั้ง R1, R2, R3', 'PC-A สามารถ ping PC-C ผ่าน 3 Router ได้แล้วครับ']}
      completeChatSummary={COMPLETE_CHAT_SUMMARY}
      nextLabHref="/labnetwork1/lab06-rip-v1/lab6.html"
      welcomeMsg={WELCOME_MSG}
      introLines={INTRO_LINES}
      systemSubject="Ch.5 Static & Default Routing"
      systemRef="Cisco NetAcad W5_1"
    />
  );
}
