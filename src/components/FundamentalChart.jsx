import React, { useMemo } from 'react';
import { runBatchExperiment } from '../simulation/nasch';

export default function FundamentalChart({ pHuman, pAv, vMax, avCooperative, currentDensity, currentFlowPerHour }) {
  const curves = useMemo(() => {
    const densities = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.45, 0.55, 0.65, 0.75];
    const shares = [
      { key: '0%', avShare: 0.0, color: '#ef4444', label: '0% AV (მხოლოდ ადამიანები)' },
      { key: '10%', avShare: 0.1, color: '#f59e0b', label: '10% AV (შერეული ნაკადი)' },
      { key: '20%', avShare: 0.2, color: '#38bdf8', label: '20% AV (სტაბილიზებული)' },
    ];

    return shares.map((s) => ({
      ...s,
      points: densities.map((d) =>
        runBatchExperiment({
          roadLength: 180,
          density: d,
          vMax,
          avShare: s.avShare,
          pHuman,
          pAv,
          avCooperative,
          warmupSteps: 120,
          measureSteps: 220,
          seeds: 3,
        })
      ),
    }));
  }, [pHuman, pAv, vMax, avCooperative]);

  const W = 680;
  const H = 250;
  const padL = 54;
  const padR = 20;
  const padT = 18;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxFlow = 2800;
  const toX = (rho) => padL + (rho / 0.8) * plotW;
  const toY = (flow) => padT + plotH - (Math.min(flow, maxFlow) / maxFlow) * plotH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Grid */}
        {[0, 700, 1400, 2100, 2800].map((val) => {
          const y = toY(val);
          return (
            <g key={val}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1e293b" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} fill="#94a3b8" fontSize="11" textAnchor="end">
                {val}
              </text>
            </g>
          );
        })}
        {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((rho) => {
          const x = toX(rho);
          return (
            <g key={rho}>
              <line x1={x} y1={padT} x2={x} y2={H - padB} stroke="#1e293b" strokeWidth="1" />
              <text x={x} y={H - padB + 16} fill="#94a3b8" fontSize="11" textAnchor="middle">
                {(rho * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#475569" strokeWidth="1.5" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#475569" strokeWidth="1.5" />

        <text x={W / 2} y={H - 4} fill="#cbd5e1" fontSize="11.5" textAnchor="middle">
          გზის სიმკვრივე ρ (დაკავებული უჯრების წილი)
        </text>
        <text
          x={14}
          y={H / 2}
          fill="#cbd5e1"
          fontSize="11.5"
          textAnchor="middle"
          transform={`rotate(-90 14 ${H / 2})`}
        >
          ნაკადი q (მანქ/სთ)
        </text>

        {/* Curves */}
        {curves.map((curve) => {
          const dAttr = curve.points
            .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(pt.density).toFixed(1)} ${toY(pt.flowPerHour).toFixed(1)}`)
            .join(' ');
          return (
            <g key={curve.key}>
              <path d={dAttr} fill="none" stroke={curve.color} strokeWidth="2.5" />
              {curve.points.map((pt, idx) => (
                <circle key={idx} cx={toX(pt.density)} cy={toY(pt.flowPerHour)} r="3" fill={curve.color} />
              ))}
            </g>
          );
        })}

        {/* Live operating point */}
        <circle
          cx={toX(currentDensity)}
          cy={toY(currentFlowPerHour)}
          r="6"
          fill="#ffffff"
          stroke="#22d3ee"
          strokeWidth="2.5"
        />
      </svg>

      <div className="legend">
        {curves.map((c) => (
          <span key={c.key} className="legend-item">
            <span className="dot" style={{ background: c.color }} /> {c.label}
          </span>
        ))}
        <span className="legend-item">
          <span className="dot" style={{ background: '#fff', border: '2px solid #22d3ee' }} /> მიმდინარე წერტილი
        </span>
      </div>
    </div>
  );
}
