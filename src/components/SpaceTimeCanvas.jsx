import React, { useEffect, useRef } from 'react';

export default function SpaceTimeCanvas({ history, roadLength, vMax }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 680;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#090f1d';
    ctx.fillRect(0, 0, width, height);

    if (!history || history.length === 0) return;

    const maxRows = history.length;
    const cellW = width / roadLength;
    const rowH = Math.max(1.5, height / 180);

    for (let r = 0; r < maxRows; r++) {
      const row = history[r];
      const y = r * rowH;
      if (y > height) break;

      for (let i = 0; i < row.length; i++) {
        const { pos, vel, isAV } = row[i];
        if (isAV) {
          ctx.fillStyle = '#38bdf8';
        } else if (vel === 0) {
          ctx.fillStyle = '#ef4444';
        } else if (vel === 1) {
          ctx.fillStyle = '#f97316';
        } else if (vel <= Math.floor(vMax * 0.6)) {
          ctx.fillStyle = '#eab308';
        } else {
          ctx.fillStyle = '#10b981';
        }
        ctx.fillRect(pos * cellW, y, Math.max(1.8, cellW), rowH);
      }
    }
  }, [history, roadLength, vMax]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 280,
          borderRadius: 8,
          border: '1px solid #263248',
          display: 'block',
        }}
      />
      <div className="legend">
        <span>ჰორიზონტალური ღერძი: გზის უჯრა x ∈ [0, {roadLength}] →</span>
        <span>ვერტიკალური ღერძი: დრო t (ქვევით) ↓</span>
        <span style={{ color: '#f87171' }}>
          წითელი დიაგონალური ზოლები = უკუსვლითი „მოჩვენებითი საცობის“ ტალღა
        </span>
      </div>
    </div>
  );
}
