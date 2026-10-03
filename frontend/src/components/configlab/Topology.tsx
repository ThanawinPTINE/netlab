import type { PcConfigStep, PcPingStep, Step, TopoLink, TopoNode } from '../../types/configLab';

export interface TopologyProps {
  viewBox: string;
  nodes: TopoNode[];
  links: TopoLink[];
  steps: Step[];
  stepsDone: number[];
  currentStep: number;
  nodeIpLabels: Record<string, string>;
  onNodeClick: (nodeId: string) => void;
}

const NY = 115;
const ROUTER_R = 36;
const HOST_R = 21;

export function findPcStep(steps: Step[], pcId: string): PcConfigStep | null {
  return (steps.find((s): s is PcConfigStep => s.type === 'pcconfig' && s.router === pcId)) ?? null;
}
export function findPcPingStep(steps: Step[], pcId: string): PcPingStep | null {
  return (steps.find((s): s is PcPingStep => s.type === 'pcping' && s.router === pcId)) ?? null;
}

/** Pure SVG render of the lab's topology diagram. Colors come entirely from CSS
 * classes bound to var(--*) tokens (see configlab.css), so a theme toggle just
 * repaints — no getComputedStyle()-and-rebuild-the-string step like the vanilla
 * version needed. */
export default function Topology({ viewBox, nodes, links, steps, stepsDone, currentStep, nodeIpLabels, onNodeClick }: TopologyProps) {
  const curRouter = steps[currentStep - 1]?.router ?? '';
  const allDone = stepsDone.length >= steps.length;

  return (
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path className="topo-arrow-default" d="M2 1L8 5L2 9" fill="none" strokeWidth="1.5" />
        </marker>
        <marker id="mg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path className="topo-arrow-green" d="M2 1L8 5L2 9" fill="none" strokeWidth="1.5" />
        </marker>
      </defs>

      {links.map((lk, i) => {
        const fn = nodes.find((n) => n.id === lk.from)!;
        const tn = nodes.find((n) => n.id === lk.to)!;
        const active = lk.activateOnSteps.every((id) => stepsDone.indexOf(id) >= 0);
        const x1 = fn.x + (fn.role === 'router' ? ROUTER_R : HOST_R) + 2;
        const x2 = tn.x - (tn.role === 'router' ? ROUTER_R : HOST_R) - 2;
        const mid = (x1 + x2) / 2;
        const dur = (0.9 + i * 0.2).toFixed(1);
        return (
          <g key={lk.from + '-' + lk.to}>
            <line
              x1={x1}
              y1={NY}
              x2={x2}
              y2={NY}
              className={'topo-link' + (active ? ' active' : '')}
              strokeWidth={active ? 2 : 1.5}
              markerEnd={active ? 'url(#mg)' : 'url(#ma)'}
            />
            <text x={mid} y={NY - 20} fontSize="13.5" textAnchor="middle" fontFamily="Cascadia Code,monospace" className={'topo-subnet-label' + (active ? ' active' : '')}>
              {lk.subnet}
            </text>
            {lk.if1 && (
              <text x={x1 + 4} y={NY + 25} fontSize="13.5" textAnchor="start" fontFamily="Cascadia Code,monospace" className="topo-if-label">
                {lk.if1}
              </text>
            )}
            {lk.if2 && (
              <text x={x2 - 4} y={NY + 25} fontSize="13.5" textAnchor="end" fontFamily="Cascadia Code,monospace" className="topo-if-label">
                {lk.if2}
              </text>
            )}
            {active && allDone && (
              <circle r="5.5" className="topo-dot" opacity=".85">
                <animateMotion dur={dur + 's'} repeatCount="indefinite" path={`M${x1},${NY} L${x2},${NY}`} />
              </circle>
            )}
          </g>
        );
      })}

      {nodes.map((n) => {
        const isR = n.role === 'router';
        const r = isR ? ROUTER_R : HOST_R;
        const isAct = n.id === curRouter;
        const pcCfgStep = !isR ? findPcStep(steps, n.id) : null;
        const pcPingStep = !isR ? findPcPingStep(steps, n.id) : null;
        const isConfigured = (pcCfgStep != null && stepsDone.indexOf(pcCfgStep.id) >= 0) || (pcPingStep != null && stepsDone.indexOf(pcPingStep.id) >= 0);
        const shapeClass = 'topo-shape' + (isAct ? ' active' : isConfigured ? ' configured' : isR ? '' : ' host');
        const labelClass = 'topo-node-label' + (isR ? ' router' : isConfigured ? ' configured' : '');
        const clickable = pcCfgStep || pcPingStep;
        const handleClick = clickable ? () => onNodeClick(n.id) : undefined;
        return (
          <g key={n.id}>
            {isR ? (
              <circle cx={n.x} cy={NY} r={r} strokeWidth="1.5" className={shapeClass} />
            ) : (
              <rect
                x={n.x - r}
                y={NY - r}
                width={r * 2}
                height={r * 2}
                rx="4"
                strokeWidth="1.5"
                className={shapeClass}
                style={clickable ? { cursor: 'pointer' } : undefined}
                onClick={handleClick}
              />
            )}
            <text
              x={n.x}
              y={NY - r - 9}
              fontSize="15.5"
              fontWeight="700"
              textAnchor="middle"
              fontFamily="Segoe UI,sans-serif"
              className={labelClass}
              style={clickable ? { cursor: 'pointer' } : undefined}
              onClick={handleClick}
            >
              {n.id}
              {isConfigured ? ' ✓' : ''}
            </text>
            <text x={n.x} y={NY + r + 19} fontSize="13.5" textAnchor="middle" fontFamily="Cascadia Code,monospace" className="topo-ip-label">
              {nodeIpLabels[n.id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
