import React, { useEffect, useRef } from 'react';

function speedColor(vel, vMax, isAV) {
  if (isAV) {
    return '#38bdf8';
  }
  const ratio = vel / Math.max(1, vMax);
  if (vel === 0) return '#ef4444';
  if (ratio < 0.45) return '#f97316';
  if (ratio < 0.8) return '#facc15';
  return '#10b981';
}

export default function RingRoadCanvas({ simState, metrics }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simState) return;
    const ctx = canvas.getContext('2d');
    const size = 340;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const radius = 128;

    // Outer & inner road track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 22;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    const { vehicles, roadLength, vMax } = simState;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const angle = (v.pos / roadLength) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (v.isAV) {
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, v.isAV ? 4.8 : 4.0, 0, Math.PI * 2);
      ctx.fillStyle = speedColor(v.vel, vMax, v.isAV);
      ctx.fill();

      if (v.isAV) {
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }

    // Center telemetry
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = '700 22px "Noto Sans Georgian", sans-serif';
    ctx.fillText(`${metrics.avgSpeedKmh.toFixed(1)} კმ/სთ`, cx, cy - 6);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px "Noto Sans Georgian", sans-serif';
    ctx.fillText(`საცობში: ${(metrics.jamRatio * 100).toFixed(1)}%`, cx, cy + 16);
    ctx.fillText(`ბიჯი t = ${metrics.step} წმ`, cx, cy + 34);
  }, [simState, metrics]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{ width: 340, height: 340, maxWidth: '100%' }}
      />
      <div className="legend">
        <span className="legend-item">
          <span className="dot" style={{ background: '#10b981' }} /> თავისუფალი
        </span>
        <span className="legend-item">
          <span className="dot" style={{ background: '#facc15' }} /> საშუალო
        </span>
        <span className="legend-item">
          <span className="dot" style={{ background: '#ef4444' }} /> გაჩერებული (v=0)
        </span>
        <span className="legend-item">
          <span className="dot" style={{ background: '#38bdf8', border: '1.5px solid #fff' }} /> AV (ავტონომიური)
        </span>
      </div>
    </div>
  );
}
