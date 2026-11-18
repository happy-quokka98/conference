import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, StepForward, Sparkles, ShieldCheck, Activity, MapPin } from 'lucide-react';
import { initSimulation, stepSimulation, computeMetrics } from './simulation/nasch';
import { BATUMI_CORRIDORS } from './simulation/batumiCorridors';
import RingRoadCanvas from './components/RingRoadCanvas';
import SpaceTimeCanvas from './components/SpaceTimeCanvas';
import FundamentalChart from './components/FundamentalChart';

const PRESETS = [
  { id: 'phantom-0', label: '0% AV — მოჩვენებითი საცობი', avShare: 0.0, densityOverride: null },
  { id: 'mixed-10', label: '10% AV — შერეული ნაკადი', avShare: 0.10, densityOverride: null },
  { id: 'stable-20', label: '20% AV — სტაბილიზაცია', avShare: 0.20, densityOverride: null },
  { id: 'summer-peak', label: 'ზაფხულის ტურისტული პიკი (34%)', avShare: 0.0, densityOverride: 0.34 },
];

export default function App() {
  const [corridorId, setCorridorId] = useState(BATUMI_CORRIDORS[0].id);
  const [roadLength, setRoadLength] = useState(BATUMI_CORRIDORS[0].roadLength);
  const [density, setDensity] = useState(BATUMI_CORRIDORS[0].defaultDensity);
  const [avShare, setAvShare] = useState(0.0);
  const [pHuman, setPHuman] = useState(BATUMI_CORRIDORS[0].pHuman);
  const [pAv, setPAv] = useState(BATUMI_CORRIDORS[0].pAv);
  const [vMax, setVMax] = useState(BATUMI_CORRIDORS[0].vMax);
  const [avCooperative, setAvCooperative] = useState(true);
  const [fps, setFps] = useState(14);
  const [running, setRunning] = useState(true);
  const [activePreset, setActivePreset] = useState('phantom-0');

  const simRef = useRef(null);
  const [metrics, setMetrics] = useState({
    step: 0,
    avgSpeed: 0,
    avgSpeedKmh: 0,
    density: 0.28,
    flow: 0,
    flowPerHour: 0,
    stoppedRatio: 0,
    jamRatio: 0,
    speedStd: 0,
    travelTime5kmMin: 0,
  });
  const [history, setHistory] = useState([]);
  const [, setTick] = useState(0);

  const resetSim = useCallback(
    (overrides = {}) => {
      const cfg = {
        roadLength: overrides.roadLength ?? roadLength,
        density: overrides.density ?? density,
        avShare: overrides.avShare ?? avShare,
        pHuman: overrides.pHuman ?? pHuman,
        pAv: overrides.pAv ?? pAv,
        vMax: overrides.vMax ?? vMax,
        avCooperative: overrides.avCooperative ?? avCooperative,
        seed: 4242,
      };
      const sim = initSimulation(cfg);
      simRef.current = sim;
      const m = computeMetrics(sim);
      setMetrics(m);
      setHistory([sim.vehicles.map((v) => ({ pos: v.pos, vel: v.vel, isAV: v.isAV }))]);
      setTick((t) => t + 1);
    },
    [roadLength, density, avShare, pHuman, pAv, vMax, avCooperative]
  );

  useEffect(() => {
    resetSim();
  }, [resetSim]);

  const doStep = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    const m = stepSimulation(sim);
    setMetrics(m);
    const snapshot = sim.vehicles.map((v) => ({ pos: v.pos, vel: v.vel, isAV: v.isAV }));
    setHistory((prev) => {
      const next = [...prev, snapshot];
      return next.length > 180 ? next.slice(next.length - 180) : next;
    });
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(doStep, Math.max(20, Math.round(1000 / fps)));
    return () => clearInterval(timer);
  }, [running, fps, doStep]);

  const selectCorridor = (c) => {
    setCorridorId(c.id);
    setRoadLength(c.roadLength);
    setVMax(c.vMax);
    setDensity(c.defaultDensity);
    setPHuman(c.pHuman);
    setPAv(c.pAv);
  };

  const applyPreset = (p) => {
    setActivePreset(p.id);
    setAvShare(p.avShare);
    if (p.densityOverride !== null) {
      setDensity(p.densityOverride);
    } else {
      const currentCorridor = BATUMI_CORRIDORS.find((c) => c.id === corridorId);
      if (currentCorridor) setDensity(currentCorridor.defaultDensity);
    }
  };

  const activeCorridor = BATUMI_CORRIDORS.find((c) => c.id === corridorId) ?? BATUMI_CORRIDORS[0];

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>ბათუმის სატრანსპორტო ნაკადის სიმულატორი (Nagel-Schreckenberg)</h1>
          <p>
            „მოჩვენებითი საცობები“ ავარიის გარეშე და ავტონომიური მანქანების (10–20%) გავლენა ბათუმის მაგისტრალებზე
          </p>
        </div>

        <div className="presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`btn ${activePreset === p.id ? 'btn-active' : ''}`}
              onClick={() => applyPreset(p)}
            >
              <Sparkles size={14} />
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* Batumi Corridor Selector */}
      <section className="card" style={{ marginBottom: 18, padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.92rem' }}>
            <MapPin size={17} color="#38bdf8" />
            <span>ბათუმის კვლევითი კორიდორი:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BATUMI_CORRIDORS.map((c) => (
              <button
                key={c.id}
                className={`btn ${corridorId === c.id ? 'btn-active' : ''}`}
                onClick={() => selectCorridor(c)}
                title={c.description}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 6 }}>
          აქტიური მონაკვეთი: <strong style={{ color: '#e2e8f0' }}>{activeCorridor.name}</strong> — {activeCorridor.description}
        </div>
      </section>

      {/* KPI Cards */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">საშუალო სიჩქარე</div>
          <div
            className="kpi-value"
            style={{ color: metrics.avgSpeedKmh > 55 ? '#10b981' : metrics.avgSpeedKmh > 35 ? '#f59e0b' : '#ef4444' }}
          >
            {metrics.avgSpeedKmh.toFixed(1)} კმ/სთ
          </div>
          <div className="kpi-sub">
            {metrics.avgSpeed.toFixed(2)} უჯრა/წმ (მაქს: {vMax * 27} კმ/სთ)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">გამტარუნარიანობა (ნაკადი q)</div>
          <div className="kpi-value" style={{ color: '#38bdf8' }}>
            {Math.round(metrics.flowPerHour)} მანქ/სთ
          </div>
          <div className="kpi-sub">1 ზოლის საათობრივი გამტარობა ბათუმში</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">5 კმ მგზავრობის დრო</div>
          <div className="kpi-value" style={{ color: '#a78bfa' }}>
            {metrics.travelTime5kmMin.toFixed(1)} წთ
          </div>
          <div className="kpi-sub">საცობში (v ≤ 1): {(metrics.jamRatio * 100).toFixed(1)}%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">ნაკადის სტაბილურობა</div>
          <div className="kpi-value">{metrics.speedStd.toFixed(2)}</div>
          <div className="kpi-sub">
            მანქანები: {simRef.current?.numVehicles ?? 0} (AV: {simRef.current?.numAv ?? 0}) • სიგრძე:{' '}
            {((roadLength * 7.5) / 1000).toFixed(1)} კმ
          </div>
        </div>
      </section>

      <div className="main-grid">
        {/* Left Controls */}
        <aside className="card">
          <h2 className="card-title">
            <span>მოდელის პარამეტრები</span>
            <Activity size={17} color="#38bdf8" />
          </h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setRunning((r) => !r)}
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? 'პაუზა' : 'გაშვება'}
            </button>
            <button className="btn" onClick={doStep} disabled={running} title="1 ბიჯი წინ">
              <StepForward size={15} />
            </button>
            <button className="btn" onClick={() => resetSim()} title="თავიდან დაწყება">
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="control-group">
            <div className="control-header">
              <span>ავტონომიური მანქანების წილი (AV %)</span>
              <span className="control-val">{Math.round(avShare * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={avShare}
              onChange={(e) => {
                setActivePreset('custom');
                setAvShare(parseFloat(e.target.value));
              }}
            />
          </div>

          <div className="control-group">
            <div className="control-header">
              <span>გზის სიმკვრივე (ρ)</span>
              <span className="control-val">{Math.round(density * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.75"
              step="0.01"
              value={density}
              onChange={(e) => {
                setActivePreset('custom');
                setDensity(parseFloat(e.target.value));
              }}
            />
          </div>

          <div className="control-group">
            <div className="control-header">
              <span>ადამიანის დაყოვნების ალბათობა (p_human)</span>
              <span className="control-val">{pHuman.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.6"
              step="0.02"
              value={pHuman}
              onChange={(e) => setPHuman(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-group">
            <div className="control-header">
              <span>AV დაყოვნების ალბათობა (p_AV)</span>
              <span className="control-val">{pAv.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={pAv}
              onChange={(e) => setPAv(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-group">
            <div className="control-header">
              <span>მაქსიმალური სიჩქარე (v_max)</span>
              <span className="control-val">
                {vMax} ({vMax * 27} კმ/სთ)
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="6"
              step="1"
              value={vMax}
              onChange={(e) => setVMax(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="control-group">
            <div className="control-header">
              <span>კორიდორის სიგრძე (L უჯრა)</span>
              <span className="control-val">
                {roadLength} ({((roadLength * 7.5) / 1000).toFixed(2)} კმ)
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="1000"
              step="50"
              value={roadLength}
              onChange={(e) => setRoadLength(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="control-group">
            <div className="control-header">
              <span>ანიმაციის სიჩქარე</span>
              <span className="control-val">{fps} ბიჯი/წმ</span>
            </div>
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value, 10))}
            />
          </div>

          <label className="toggle-row" style={{ cursor: 'pointer' }}>
            <span>კოოპერატიული AV (ტალღის შთანთქმა)</span>
            <input
              type="checkbox"
              checked={avCooperative}
              onChange={(e) => setAvCooperative(e.target.checked)}
            />
          </label>
        </aside>

        {/* Right Visualizations */}
        <main className="viz-stack">
          <div className="viz-row">
            <div className="card">
              <h2 className="card-title">ბათუმის კორიდორის სიმულაცია</h2>
              <RingRoadCanvas simState={simRef.current} metrics={metrics} />
            </div>

            <div className="card">
              <h2 className="card-title">სივრცე-დროის დიაგრამა (Space-Time Plot)</h2>
              <SpaceTimeCanvas history={history} roadLength={roadLength} vMax={vMax} />
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">ფუნდამენტური დიაგრამა: ნაკადი (q) სიმკვრივის (ρ) მიხედვით</h2>
            <FundamentalChart
              pHuman={pHuman}
              pAv={pAv}
              vMax={vMax}
              avCooperative={avCooperative}
              currentDensity={metrics.density}
              currentFlowPerHour={metrics.flowPerHour}
            />
          </div>

          <div className="card">
            <h2 className="card-title">
              <span>ბათუმის საცობების აღმოფხვრის ძირითადი წესები</span>
              <ShieldCheck size={18} color="#10b981" />
            </h2>
            <div className="rules-grid">
              <div className="rule-box">
                <h4>წესი 1: მახინჯაური–ბათუმის Ramp Metering</h4>
                <p>
                  თამარ მეფის გამზირზე შემოსასვლელი ნაკადის დოზირება იცავს კორიდორს კრიტიკულ ზღვარზე (ρ_c ≈ 25%) გადატვირთვისგან.
                </p>
              </div>
              <div className="rule-box">
                <h4>წესი 2: 10–20% CACC ავტობუსებსა და ტაქსებში</h4>
                <p>
                  ბათუმის მუნიციპალური ტრანსპორტისა და ფლოტის 10–20%-ის აღჭურვა დაბალი დაყოვნების ACC/AV სისტემით ანეიტრალებს ტალღებს.
                </p>
              </div>
              <div className="rule-box">
                <h4>წესი 3: სანაპირო მაგისტრალის VSL ჰარმონიზაცია</h4>
                <p>
                  ხიმშიაშვილი–რუსთაველის ღერძზე დინამიკური სიჩქარის შეზღუდვა ტურისტულ პიკში ამცირებს მკვეთრ დამუხრუჭებას.
                </p>
              </div>
              <div className="rule-box">
                <h4>წესი 4: ზოლის დისციპლინა და „მწვანე ტალღა“</h4>
                <p>
                  ჭავჭავაძე–ბაგრატიონის კორიდორზე შუქნიშნების სინქრონიზაცია და ზოლის უმიზეზო ცვლის აკრძალვა ამცირებს p-ს ეფექტს.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
