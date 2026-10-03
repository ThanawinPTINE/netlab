import { useEffect, useState } from 'react';
import { getHealth } from '../../lib/api';

/** Polls /health every 30s (same cadence as the vanilla labs' checkHealth()). */
export function useAiHealth() {
  const [aiOnline, setAiOnline] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('กำลังเชื่อมต่อ...');
  const [modelTag, setModelTag] = useState('Gemini 2.5 Flash');

  useEffect(() => {
    let cancelled = false;
    async function checkHealth() {
      try {
        const controller = new AbortController();
        const t = window.setTimeout(() => controller.abort(), 5000);
        const d = await getHealth(controller.signal);
        window.clearTimeout(t);
        if (cancelled) return;
        if (!d.model_ready) throw new Error('not ready');
        setAiOnline(true);
        setAiStatusText('AI พร้อม');
        const m = d.model || d.models?.default || '';
        if (m) setModelTag(m.split('/').pop() || '');
      } catch {
        if (!cancelled) {
          setAiOnline(false);
          setAiStatusText('AI ออฟไลน์');
        }
      }
    }
    checkHealth();
    const id = window.setInterval(checkHealth, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { aiOnline, aiStatusText, modelTag };
}
