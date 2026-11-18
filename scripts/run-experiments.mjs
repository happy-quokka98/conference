import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { initSimulation, stepSimulation, runBatchExperiment } from '../src/simulation/nasch.js';

const outDir = path.resolve('scripts/output');
fs.mkdirSync(outDir, { recursive: true });

function saveSvgAsPng(svgString, filename, width = 1200) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, pngBuffer);
  return outPath;
}

console.log('Running Batumi Experiment 1: Tamar Mepe Ave (L=600, 4.5 km, vMax=4) Fundamental Diagram...');
const densities = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 0.60, 0.70];
const avRates = [0.0, 0.10, 0.20, 0.50];

const fundamentalData = {};
for (const av of avRates) {
  const key = `${Math.round(av * 100)}%`;
  fundamentalData[key] = densities.map((d) =>
    runBatchExperiment({
      roadLength: 600,
      density: d,
      vMax: 4,
      avShare: av,
      pHuman: 0.30,
      pAv: 0.02,
      avCooperative: true,
      warmupSteps: 400,
      measureSteps: 700,
      seeds: 10,
    })
  );
}

console.log('Running Batumi Experiment 2: AV Share sweep on Tamar Mepe Ave (rho = 0.28)...');
const avSweepValues = [0.0, 0.05, 0.10, 0.15, 0.20, 0.30, 0.50, 1.0];
const avSweepData = avSweepValues.map((av) =>
  runBatchExperiment({
    roadLength: 600,
    density: 0.28,
    vMax: 4,
    avShare: av,
    pHuman: 0.30,
    pAv: 0.02,
    avCooperative: true,
    warmupSteps: 400,
    measureSteps: 800,
    seeds: 12,
  })
);

console.log('Running Batumi Experiment 3: Chavchavadze-Bagrationi Summer Tourist Peak (L=400, 3.0 km, vMax=3, rho=0.32)...');
const innerCityData = [0.0, 0.10, 0.20, 0.50].map((av) =>
  runBatchExperiment({
    roadLength: 400,
    density: 0.32,
    vMax: 3,
    avShare: av,
    pHuman: 0.32,
    pAv: 0.02,
    avCooperative: true,
    warmupSteps: 400,
    measureSteps: 800,
    seeds: 12,
  })
);

const results = {
  generatedAt: new Date().toISOString(),
  params: {
    corridor1: 'თამარ მეფის გამზირი (L=600, 4.5 კმ, vMax=4)',
    corridor2: 'ჭავჭავაძე-ბაგრატიონი (L=400, 3.0 კმ, vMax=3)',
    pHuman: 0.30,
    pAv: 0.02,
  },
  fundamentalData,
  avSweepData,
  innerCityData,
};

fs.writeFileSync(path.join(outDir, 'experiment-results.json'), JSON.stringify(results, null, 2));
console.log('Saved Batumi experiment-results.json');

// Chart 1: Batumi Fundamental Diagram
{
  const W = 860, H = 460;
  const padL = 78, padR = 30, padT = 50, padB = 68;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxFlow = 2600;
  const toX = (r) => padL + (r / 0.75) * plotW;
  const toY = (q) => padT + plotH - (Math.min(q, maxFlow) / maxFlow) * plotH;

  const palette = {
    '0%': { color: '#dc2626', label: '0% AV (100% ადამიანი)' },
    '10%': { color: '#d97706', label: '10% AV' },
    '20%': { color: '#0284c7', label: '20% AV' },
    '50%': { color: '#059669', label: '50% AV' },
  };

  let gridSvg = '';
  for (const q of [0, 500, 1000, 1500, 2000, 2500]) {
    const y = toY(q);
    gridSvg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    gridSvg += `<text x="${padL - 10}" y="${y + 4}" font-size="13" fill="#475569" text-anchor="end">${q}</text>`;
  }
  for (const r of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
    const x = toX(r);
    gridSvg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="#e2e8f0" stroke-width="1"/>`;
    gridSvg += `<text x="${x}" y="${H - padB + 20}" font-size="13" fill="#475569" text-anchor="middle">${(r * 100).toFixed(0)}%</text>`;
  }

  let pathsSvg = '';
  let legendSvg = '';
  let idx = 0;
  for (const [k, pts] of Object.entries(fundamentalData)) {
    const { color, label } = palette[k];
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.density).toFixed(1)} ${toY(p.flowPerHour).toFixed(1)}`).join(' ');
    pathsSvg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="3"/>`;
    for (const p of pts) {
      pathsSvg += `<circle cx="${toX(p.density).toFixed(1)}" cy="${toY(p.flowPerHour).toFixed(1)}" r="4" fill="${color}"/>`;
    }
    const lx = padL + 20 + idx * 195;
    legendSvg += `<circle cx="${lx}" cy="${H - 18}" r="5" fill="${color}"/><text x="${lx + 10}" y="${H - 13}" font-size="13" fill="#1e293b">${label}</text>`;
    idx++;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#ffffff;font-family:Arial,Sylfaen,sans-serif">
    <text x="${W / 2}" y="28" font-size="16" font-weight="bold" fill="#0f172a" text-anchor="middle">ბათუმი (თამარ მეფის გამზირი, 4.5 კმ): ფუნდამენტური დიაგრამა</text>
    ${gridSvg}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#334155" stroke-width="2"/>
    <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#334155" stroke-width="2"/>
    <text x="${W / 2}" y="${H - 36}" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="middle">გზის სიმკვრივე ρ (%)</text>
    <text x="20" y="${H / 2}" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="middle" transform="rotate(-90 20 ${H / 2})">ნაკადი q (მანქ/სთ)</text>
    ${pathsSvg}
    ${legendSvg}
  </svg>`;

  saveSvgAsPng(svg, 'chart_fundamental.png', 1200);
}

// Chart 2: AV Share Impact on Batumi Tamar Mepe Ave
{
  const W = 860, H = 430;
  const padL = 72, padR = 72, padT = 50, padB = 64;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const toX = (av) => padL + av * plotW;
  const toYSpeed = (v) => padT + plotH - (v / 110) * plotH;
  const toYJam = (j) => padT + plotH - (j / 75) * plotH;

  let gridSvg = '';
  for (const v of [0, 25, 50, 75, 100]) {
    const y = toYSpeed(v);
    gridSvg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    gridSvg += `<text x="${padL - 10}" y="${y + 4}" font-size="13" fill="#0284c7" text-anchor="end">${v}</text>`;
  }
  for (const j of [0, 25, 50, 75]) {
    const y = toYJam(j);
    gridSvg += `<text x="${W - padR + 10}" y="${y + 4}" font-size="13" fill="#dc2626" text-anchor="start">${j}%</text>`;
  }
  for (const av of [0, 0.1, 0.2, 0.3, 0.5, 1.0]) {
    const x = toX(av);
    gridSvg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="#f1f5f9" stroke-width="1"/>`;
    gridSvg += `<text x="${x}" y="${H - padB + 20}" font-size="13" fill="#475569" text-anchor="middle">${(av * 100).toFixed(0)}%</text>`;
  }

  const speedPath = avSweepData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.avShare).toFixed(1)} ${toYSpeed(p.avgSpeedKmh).toFixed(1)}`).join(' ');
  const jamPath = avSweepData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.avShare).toFixed(1)} ${toYJam(p.jamPercent).toFixed(1)}`).join(' ');

  let ptsSvg = '';
  for (const p of avSweepData) {
    ptsSvg += `<circle cx="${toX(p.avShare).toFixed(1)}" cy="${toYSpeed(p.avgSpeedKmh).toFixed(1)}" r="4.5" fill="#0284c7"/>`;
    ptsSvg += `<circle cx="${toX(p.avShare).toFixed(1)}" cy="${toYJam(p.jamPercent).toFixed(1)}" r="4.5" fill="#dc2626"/>`;
  }

  const x10 = toX(0.10), x20 = toX(0.20);
  const zoneSvg = `<rect x="${x10}" y="${padT}" width="${x20 - x10}" height="${plotH}" fill="rgba(14,165,233,0.12)" stroke="#0ea5e9" stroke-dasharray="4,4"/>
    <text x="${(x10 + x20) / 2}" y="${padT + 18}" font-size="12" font-weight="bold" fill="#0369a1" text-anchor="middle">10-20% AV</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#ffffff;font-family:Arial,Sylfaen,sans-serif">
    <text x="${W / 2}" y="28" font-size="16" font-weight="bold" fill="#0f172a" text-anchor="middle">ბათუმი (ρ = 28%): AV წილის გავლენა სიჩქარესა და საცობის დონეზე</text>
    ${zoneSvg}
    ${gridSvg}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#334155" stroke-width="2"/>
    <line x1="${W - padR}" y1="${padT}" x2="${W - padR}" y2="${H - padB}" stroke="#334155" stroke-width="2"/>
    <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#334155" stroke-width="2"/>
    <text x="${W / 2}" y="${H - 30}" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="middle">ავტონომიური მანქანების წილი (AV %)</text>
    <text x="18" y="${H / 2}" font-size="13" font-weight="bold" fill="#0284c7" text-anchor="middle" transform="rotate(-90 18 ${H / 2})">საშუალო სიჩქარე (კმ/სთ)</text>
    <text x="${W - 16}" y="${H / 2}" font-size="13" font-weight="bold" fill="#dc2626" text-anchor="middle" transform="rotate(90 ${W - 16} ${H / 2})">საცობში მყოფი მანქანები (%)</text>
    <path d="${speedPath}" fill="none" stroke="#0284c7" stroke-width="3"/>
    <path d="${jamPath}" fill="none" stroke="#dc2626" stroke-width="3"/>
    ${ptsSvg}
    <circle cx="${padL + 160}" cy="${H - 12}" r="5" fill="#0284c7"/><text x="${padL + 170}" y="${H - 8}" font-size="13" fill="#1e293b">საშუალო სიჩქარე (კმ/სთ)</text>
    <circle cx="${padL + 410}" cy="${H - 12}" r="5" fill="#dc2626"/><text x="${padL + 420}" y="${H - 8}" font-size="13" fill="#1e293b">საცობის წილი (%)</text>
  </svg>`;

  saveSvgAsPng(svg, 'chart_av_impact.png', 1200);
}

// Chart 3: Space-Time Comparison on Batumi Tamar Mepe Ave (L=600, vMax=4, rho=0.28)
{
  function captureSpaceTime(avShare) {
    const sim = initSimulation({
      roadLength: 300,
      density: 0.28,
      vMax: 4,
      avShare,
      pHuman: 0.30,
      pAv: 0.02,
      avCooperative: true,
      seed: 4242,
    });
    for (let t = 0; t < 200; t++) stepSimulation(sim);
    const rows = [];
    for (let t = 0; t < 160; t++) {
      stepSimulation(sim);
      rows.push(sim.vehicles.map((v) => ({ pos: v.pos, vel: v.vel, isAV: v.isAV })));
    }
    return rows;
  }

  const rows0 = captureSpaceTime(0.0);
  const rows20 = captureSpaceTime(0.2);

  const W = 880, H = 370;
  const panelW = 390, panelH = 260;
  const cellW = panelW / 300;
  const rowH = panelH / 160;

  function renderPanel(rows, offsetX, offsetY, title) {
    let rects = `<rect x="${offsetX}" y="${offsetY}" width="${panelW}" height="${panelH}" fill="#0f172a"/>`;
    for (let r = 0; r < rows.length; r++) {
      const y = offsetY + r * rowH;
      for (const v of rows[r]) {
        let color = '#10b981';
        if (v.isAV) color = '#38bdf8';
        else if (v.vel === 0) color = '#ef4444';
        else if (v.vel === 1) color = '#f97316';
        else if (v.vel <= 2) color = '#eab308';
        rects += `<rect x="${(offsetX + v.pos * cellW).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1.5, cellW).toFixed(1)}" height="${rowH.toFixed(1)}" fill="${color}"/>`;
      }
    }
    return `<text x="${offsetX + panelW / 2}" y="${offsetY - 10}" font-size="14" font-weight="bold" fill="#0f172a" text-anchor="middle">${title}</text>${rects}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#ffffff;font-family:Arial,Sylfaen,sans-serif">
    <text x="${W / 2}" y="24" font-size="16" font-weight="bold" fill="#0f172a" text-anchor="middle">ბათუმის მაგისტრალი (ρ = 28%): სივრცე-დროის დიაგრამის შედარება</text>
    ${renderPanel(rows0, 35, 62, '0% AV — მოჩვენებითი საცობის ტალღები')}
    ${renderPanel(rows20, 455, 62, '20% AV — სტაბილიზებული ნაკადი')}
    <text x="${W / 2}" y="${H - 18}" font-size="12.5" fill="#334155" text-anchor="middle">წითელი = გაჩერებული (v=0) | ნარინჯისფერი = ნელი (v=1) | მწვანე = სწრაფი | ცისფერი = AV</text>
  </svg>`;

  saveSvgAsPng(svg, 'chart_spacetime_compare.png', 1200);
}
console.log('All Batumi charts generated.');
