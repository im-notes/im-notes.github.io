const WINDOW_MS = 500;
const VAR_WINDOW = 6;
const PRE_STAGE_COUNTDOWN = 10;
const EMAIL_TO = 'w.liu@neura.edu.au';

const STAGES = [
  {
    id: 'left-hand',
    title: 'Stage 1 — Left hand alternating',
    description: 'Use your left hand only. Alternate A and Z as quickly and accurately as possible.',
    keys: ['a', 'z'],
    hands: { left: ['a', 'z'], right: [] },
  },
  {
    id: 'right-hand',
    title: 'Stage 2 — Right hand alternating',
    description: "Use your right hand only. Alternate ' and / as quickly and accurately as possible.",
    keys: ["'", '/'],
    hands: { left: [], right: ["'", '/'] },
  },
  {
    id: 'bimanual',
    title: 'Stage 3 — Left/right alternating',
    description: 'Alternate Z with your left hand and / with your right hand as quickly and accurately as possible.',
    keys: ['z', '/'],
    hands: { left: ['z'], right: ['/'] },
  }
];

const els = {
  heroCard: document.getElementById('heroCard'),
  participantForm: document.getElementById('participantForm'),
  beginSetupBtn: document.getElementById('beginSetupBtn'),
  firstName: document.getElementById('firstName'),
  lastName: document.getElementById('lastName'),
  dob: document.getElementById('dob'),
  stageDuration: document.getElementById('stageDuration'),
  resetBtn: document.getElementById('resetBtn'),
  copyResultsBtn: document.getElementById('copyResultsBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  emailResultsBtn: document.getElementById('emailResultsBtn'),
  preStageCard: document.getElementById('preStageCard'),
  preStageTitle: document.getElementById('preStageTitle'),
  preStageDescription: document.getElementById('preStageDescription'),
  countdownValue: document.getElementById('countdownValue'),
  leftHandKeys: document.getElementById('leftHandKeys'),
  rightHandKeys: document.getElementById('rightHandKeys'),
  leftHandLabel: document.getElementById('leftHandLabel'),
  rightHandLabel: document.getElementById('rightHandLabel'),
  testCard: document.getElementById('testCard'),
  liveCard: document.getElementById('liveCard'),
  resultsCard: document.getElementById('resultsCard'),
  stageTitle: document.getElementById('stageTitle'),
  stageDescription: document.getElementById('stageDescription'),
  timer: document.getElementById('timer'),
  phaseMessage: document.getElementById('phaseMessage'),
  expectedKey: document.getElementById('expectedKey'),
  lastKey: document.getElementById('lastKey'),
  tapCount: document.getElementById('tapCount'),
  errorCount: document.getElementById('errorCount'),
  progressBar: document.getElementById('progressBar'),
  interpretationPanel: document.getElementById('interpretationPanel'),
  resultsSummary: document.getElementById('resultsSummary'),
  resultsExport: document.getElementById('resultsExport'),
  stageResults: document.getElementById('stageResults'),
  liveSpeedChart: document.getElementById('liveSpeedChart'),
  liveVariabilityChart: document.getElementById('liveVariabilityChart'),
  liveErrorChart: document.getElementById('liveErrorChart'),
};

let appState;
let animationFrame = null;
let countdownTimer = null;
let animationTimer = null;

function createInitialState() {
  return {
    running: false,
    completed: false,
    stageIndex: -1,
    stageStart: 0,
    expectedIndex: 0,
    stageData: null,
    results: [],
    participant: null,
    stageDurationMs: 10000,
    completedAt: null,
  };
}

function resetState() {
  appState = createInitialState();
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (countdownTimer) clearInterval(countdownTimer);
  if (animationTimer) clearInterval(animationTimer);
  animationFrame = null;
  countdownTimer = null;
  animationTimer = null;
  els.heroCard.classList.remove('hidden');
  document.querySelector('.shell')?.classList.remove('testing-mode');
  els.preStageCard.classList.add('hidden');
  els.testCard.classList.add('hidden');
  els.liveCard.classList.add('hidden');
  els.resultsCard.classList.add('hidden');
  els.stageResults.innerHTML = '';
  els.interpretationPanel.className = 'interpretation-panel empty';
  els.interpretationPanel.textContent = 'Interpretation summary will appear here after the test.';
  els.resultsSummary.textContent = 'Run the test to populate results.';
  els.resultsSummary.className = 'results-summary empty';
  els.resultsExport.value = '';
  els.emailResultsBtn.href = '#';
  updateStaticUI();
  clearLiveCharts();
}

function prepareForRun() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (countdownTimer) clearInterval(countdownTimer);
  if (animationTimer) clearInterval(animationTimer);
  animationFrame = null;
  countdownTimer = null;
  animationTimer = null;
  appState.running = false;
  appState.completed = false;
  appState.stageIndex = -1;
  appState.stageStart = 0;
  appState.expectedIndex = 0;
  appState.stageData = null;
  appState.results = [];
  appState.completedAt = null;
  els.preStageCard.classList.add('hidden');
  els.testCard.classList.add('hidden');
  els.liveCard.classList.add('hidden');
  els.resultsCard.classList.add('hidden');
  els.stageResults.innerHTML = '';
  els.interpretationPanel.className = 'interpretation-panel empty';
  els.interpretationPanel.textContent = 'Interpretation summary will appear here after the test.';
  els.resultsSummary.textContent = 'Run the test to populate results.';
  els.resultsSummary.className = 'results-summary empty';
  els.resultsExport.value = '';
  els.emailResultsBtn.href = '#';
  clearLiveCharts();
}

function handleSetupSubmit(event) {
  const firstName = els.firstName.value.trim();
  const lastName = els.lastName.value.trim();
  const dob = els.dob.value;
  const durationSec = Number(els.stageDuration.value);
  if (!firstName || !lastName || !dob || !durationSec) {
    els.participantForm.reportValidity();
    return;
  }

  prepareForRun();
  appState.participant = { firstName, lastName, dob };
  appState.stageDurationMs = durationSec * 1000;
  els.heroCard.classList.add('hidden');
  document.querySelector('.shell')?.classList.add('testing-mode');
  beginPreStage(0);
}

function beginPreStage(index) {
  if (index >= STAGES.length) {
    finishTest();
    return;
  }
  const stage = STAGES[index];
  appState.stageIndex = index;
  els.preStageCard.classList.remove('hidden');
  els.testCard.classList.add('hidden');
  els.liveCard.classList.add('hidden');
  els.resultsCard.classList.add('hidden');
  els.preStageTitle.textContent = stage.title;
  els.preStageDescription.textContent = `${stage.description} Stage length: ${appState.stageDurationMs / 1000} seconds.`;
  renderHandAnimation(stage);
  startKeyAnimation(stage);

  let remaining = PRE_STAGE_COUNTDOWN;
  els.countdownValue.textContent = String(remaining);
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    remaining -= 1;
    els.countdownValue.textContent = String(Math.max(remaining, 0));
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      if (animationTimer) clearInterval(animationTimer);
      animationTimer = null;
      startStage(index);
    }
  }, 1000);
}

function renderHandAnimation(stage) {
  const renderKeys = (container, keys) => {
    container.innerHTML = `<div class="anim-row">${keys.map(key => `<span class="anim-key" data-key="${escapeHtml(key)}">${displayKey(key)}</span>`).join('')}</div>`;
  };
  renderKeys(els.leftHandKeys, stage.hands.left.length ? stage.hands.left : ['—']);
  renderKeys(els.rightHandKeys, stage.hands.right.length ? stage.hands.right : ['—']);
}

function startKeyAnimation(stage) {
  if (animationTimer) clearInterval(animationTimer);
  const activeKeys = [...stage.hands.left, ...stage.hands.right];
  if (!activeKeys.length) return;
  let idx = 0;
  animationTimer = setInterval(() => {
    document.querySelectorAll('.anim-key').forEach(el => {
      el.classList.toggle('active', el.dataset.key === activeKeys[idx % activeKeys.length]);
    });
    idx += 1;
  }, 350);
}

function startStage(index) {
  if (index >= STAGES.length) return finishTest();
  const stage = STAGES[index];
  appState.running = true;
  appState.completed = false;
  appState.stageIndex = index;
  appState.stageStart = performance.now();
  appState.expectedIndex = 0;
  appState.stageData = {
    stageId: stage.id,
    title: stage.title,
    description: stage.description,
    keys: [...stage.keys],
    taps: [],
    intervals: [],
    errors: 0,
    currentErrorCount: 0,
    totalTaps: 0,
    series: [],
    handStats: {
      left: { taps: [], intervals: [], lastTapAt: null },
      right: { taps: [], intervals: [], lastTapAt: null },
    },
    lastAcceptedTapAt: null,
    lastKey: null,
  };
  els.preStageCard.classList.add('hidden');
  els.testCard.classList.remove('hidden');
  els.liveCard.classList.remove('hidden');
  updateStaticUI();
  renderLiveCharts([], [], []);
  tick();
}

function tick() {
  if (!appState.running || appState.stageIndex < 0) return;
  const now = performance.now();
  const elapsed = now - appState.stageStart;
  const remaining = Math.max(0, appState.stageDurationMs - elapsed);
  const progress = Math.min(1, elapsed / appState.stageDurationMs);
  els.timer.textContent = (remaining / 1000).toFixed(1);
  els.progressBar.style.width = `${progress * 100}%`;
  sampleSeries(now);
  if (elapsed >= appState.stageDurationMs) {
    completeStage();
    return;
  }
  animationFrame = requestAnimationFrame(tick);
}

function sampleSeries(now) {
  const stageData = appState.stageData;
  if (!stageData) return;
  const elapsedSec = (now - appState.stageStart) / 1000;
  const windowStart = now - WINDOW_MS;
  const recentTaps = stageData.taps.filter(t => t.ts >= windowStart);
  const speed = recentTaps.length / (WINDOW_MS / 1000);
  const recentIntervals = stageData.intervals.slice(-VAR_WINDOW);
  const variability = recentIntervals.length >= 2 ? stdDev(recentIntervals) : 0;

  const leftRecentTaps = stageData.handStats.left.taps.filter(t => t.ts >= windowStart);
  const rightRecentTaps = stageData.handStats.right.taps.filter(t => t.ts >= windowStart);
  const leftSpeed = leftRecentTaps.length / (WINDOW_MS / 1000);
  const rightSpeed = rightRecentTaps.length / (WINDOW_MS / 1000);
  const leftVarWindow = stageData.handStats.left.intervals.slice(-VAR_WINDOW);
  const rightVarWindow = stageData.handStats.right.intervals.slice(-VAR_WINDOW);
  const leftVariability = leftVarWindow.length >= 2 ? stdDev(leftVarWindow) : 0;
  const rightVariability = rightVarWindow.length >= 2 ? stdDev(rightVarWindow) : 0;

  const previous = stageData.series[stageData.series.length - 1];
  if (!previous || elapsedSec - previous.t >= 0.1) {
    stageData.series.push({
      t: Number(elapsedSec.toFixed(2)),
      speed: Number(speed.toFixed(3)),
      variability: Number(variability.toFixed(3)),
      errors: stageData.currentErrorCount,
      leftSpeed: Number(leftSpeed.toFixed(3)),
      rightSpeed: Number(rightSpeed.toFixed(3)),
      leftVariability: Number(leftVariability.toFixed(3)),
      rightVariability: Number(rightVariability.toFixed(3)),
    });
    renderLiveCharts(stageData.series.map(p => ({ x: p.t, y: p.speed })), stageData.series.map(p => ({ x: p.t, y: p.variability })), stageData.series.map(p => ({ x: p.t, y: p.errors })));
  }
}

function handleKeydown(event) {
  if (!appState?.running || appState.stageIndex < 0) return;
  const stage = STAGES[appState.stageIndex];
  const key = normaliseKey(event.key);
  if (!stage.keys.includes(key)) return;
  event.preventDefault();
  const now = performance.now();
  const stageData = appState.stageData;
  els.lastKey.textContent = displayKey(key);

  // Allow either valid key to start the alternating sequence.
  if (stageData.totalTaps === 0) {
    appState.expectedIndex = stage.keys.indexOf(key);
  }

  const expectedKey = stage.keys[appState.expectedIndex];
  if (key !== expectedKey) {
    stageData.errors += 1;
    stageData.currentErrorCount += 1;
    els.errorCount.textContent = String(stageData.currentErrorCount);
    return;
  }

  if (stageData.lastAcceptedTapAt != null) stageData.intervals.push(now - stageData.lastAcceptedTapAt);
  stageData.lastAcceptedTapAt = now;
  stageData.lastKey = key;
  stageData.totalTaps += 1;
  stageData.taps.push({ ts: now, key });

  const hand = stage.hands.left.includes(key) ? 'left' : stage.hands.right.includes(key) ? 'right' : null;
  if (hand) {
    const handStats = stageData.handStats[hand];
    if (handStats.lastTapAt != null) handStats.intervals.push(now - handStats.lastTapAt);
    handStats.lastTapAt = now;
    handStats.taps.push({ ts: now, key });
  }

  appState.expectedIndex = appState.expectedIndex === 0 ? 1 : 0;
  updateStaticUI();
}

function completeStage() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  const stage = STAGES[appState.stageIndex];
  const stageData = appState.stageData;
  const durationSec = appState.stageDurationMs / 1000;
  const totalTaps = stageData.totalTaps;
  const meanInterval = stageData.intervals.length ? average(stageData.intervals) : 0;
  const overallSpeed = totalTaps / durationSec;
  const variability = stageData.intervals.length >= 2 ? stdDev(stageData.intervals) : 0;
  const errorRate = stageData.errors / durationSec;
  const leftMeanInterval = stageData.handStats.left.intervals.length ? average(stageData.handStats.left.intervals) : 0;
  const rightMeanInterval = stageData.handStats.right.intervals.length ? average(stageData.handStats.right.intervals) : 0;
  const leftVariability = stageData.handStats.left.intervals.length >= 2 ? stdDev(stageData.handStats.left.intervals) : 0;
  const rightVariability = stageData.handStats.right.intervals.length >= 2 ? stdDev(stageData.handStats.right.intervals) : 0;
  const leftSpeed = stageData.handStats.left.taps.length / durationSec;
  const rightSpeed = stageData.handStats.right.taps.length / durationSec;
  appState.results.push({
    id: stage.id,
    title: stage.title,
    description: stage.description,
    keys: stage.keys,
    durationSec,
    totalTaps,
    totalErrors: stageData.errors,
    overallSpeed,
    meanInterval,
    variability,
    errorRate,
    leftMeanInterval,
    rightMeanInterval,
    leftVariability,
    rightVariability,
    leftSpeed,
    rightSpeed,
    series: stageData.series
  });
  appState.stageData = null;
  appState.running = false;
  els.phaseMessage.textContent = `${stage.title} complete.`;
  setTimeout(() => beginPreStage(appState.stageIndex + 1), 800);
}

function finishTest() {
  appState.running = false;
  appState.completed = true;
  appState.stageIndex = -1;
  appState.completedAt = new Date();
  els.preStageCard.classList.add('hidden');
  els.testCard.classList.add('hidden');
  els.liveCard.classList.add('hidden');
  els.resultsCard.classList.remove('hidden');
  buildResultsUI();
}

function buildResultsUI() {
  if (!appState.results.length) return;
  try {
    const person = appState.participant || { firstName: '', lastName: '', dob: '' };
    const completedAt = appState.completedAt?.toLocaleString() || '';
    els.resultsSummary.className = 'results-summary';
    els.interpretationPanel.className = 'interpretation-panel';
    els.interpretationPanel.innerHTML = buildInterpretationPanel();
    els.resultsSummary.innerHTML = `
      <div class="metric" style="margin-bottom:12px;">
        <div class="metric-label">Participant</div>
        <div><strong>${escapeHtml(person.firstName)} ${escapeHtml(person.lastName)}</strong> · DOB ${escapeHtml(person.dob)} · Completed ${escapeHtml(completedAt)}</div>
      </div>
    ` + appState.results.map(result => `
      <div class="metric" style="margin-bottom:12px;">
        <div class="metric-label">${result.title}</div>
        <div><strong>${safeNum(result.totalTaps)}</strong> correct taps · <strong>${safeNum(result.totalErrors)}</strong> errors · <strong>${safeNum(result.overallSpeed).toFixed(2)}</strong> taps/s</div>
      </div>
    `).join('');
    els.resultsExport.value = buildExportText(appState.results);
    configureEmailDraft();
    els.stageResults.innerHTML = '';

    for (const result of appState.results) {
      const section = document.createElement('section');
      section.className = 'card stage-result-card';
      section.innerHTML = `
        <div class="section-head"><div><p class="eyebrow">Stage report</p><h2>${result.title}</h2><p class="muted">${result.description}</p></div></div>
        <div class="metrics-grid">
          <div class="metric"><span class="metric-label">Correct taps</span><div class="metric-value">${safeNum(result.totalTaps)}</div></div>
          <div class="metric"><span class="metric-label">Mean speed</span><div class="metric-value">${safeNum(result.overallSpeed).toFixed(2)} /s</div></div>
          <div class="metric"><span class="metric-label">Variability</span><div class="metric-value">${safeNum(result.variability).toFixed(1)} ms</div></div>
          <div class="metric"><span class="metric-label">Alternation errors</span><div class="metric-value">${safeNum(result.totalErrors)}</div></div>
        </div>
        <div class="chart-grid chart-grid-three">
          <div class="chart-card"><h3>Speed over stage</h3><canvas width="700" height="250" data-chart="speed"></canvas></div>
          <div class="chart-card"><h3>Variability over stage</h3><canvas width="700" height="250" data-chart="variability"></canvas></div>
          <div class="chart-card"><h3>Cumulative errors over stage</h3><canvas width="700" height="250" data-chart="errors"></canvas></div>
          ${result.id === 'bimanual' ? `
          <div class="chart-card"><h3>Left-hand speed over stage</h3><canvas width="700" height="250" data-chart="left-speed"></canvas></div>
          <div class="chart-card"><h3>Right-hand speed over stage</h3><canvas width="700" height="250" data-chart="right-speed"></canvas></div>
          <div class="chart-card"><h3>Left-hand variability over stage</h3><canvas width="700" height="250" data-chart="left-var"></canvas></div>
          <div class="chart-card"><h3>Right-hand variability over stage</h3><canvas width="700" height="250" data-chart="right-var"></canvas></div>
          ` : ''}
        </div>`;
      els.stageResults.appendChild(section);

      drawLineChart(section.querySelector('[data-chart="speed"]'), (result.series || []).map(p => ({ x: safeNum(p.t), y: safeNum(p.speed) })), { color: '#0b6f75', yMin: 0, maxX: safeNum(result.durationSec, 10) });
      drawLineChart(section.querySelector('[data-chart="variability"]'), (result.series || []).map(p => ({ x: safeNum(p.t), y: safeNum(p.variability) })), { color: '#7d5bd1', yMin: 0, maxX: safeNum(result.durationSec, 10) });
      drawLineChart(section.querySelector('[data-chart="errors"]'), (result.series || []).map(p => ({ x: safeNum(p.t), y: safeNum(p.errors) })), { color: '#c43f3f', yMin: 0, maxX: safeNum(result.durationSec, 10), stepLine: true });

      if (result.id === 'bimanual') {
        section.querySelector('.metrics-grid').insertAdjacentHTML('beforeend', `
          <div class="metric"><span class="metric-label">Left-hand speed</span><div class="metric-value">${safeNum(result.leftSpeed).toFixed(2)} /s</div></div>
          <div class="metric"><span class="metric-label">Right-hand speed</span><div class="metric-value">${safeNum(result.rightSpeed).toFixed(2)} /s</div></div>
          <div class="metric"><span class="metric-label">Left-hand variability</span><div class="metric-value">${safeNum(result.leftVariability).toFixed(1)} ms</div></div>
          <div class="metric"><span class="metric-label">Right-hand variability</span><div class="metric-value">${safeNum(result.rightVariability).toFixed(1)} ms</div></div>
        `);
        drawLineChart(section.querySelector('[data-chart="left-speed"]'), (result.series || []).map(p => ({ x: safeNum(p.t), y: safeNum(p.leftSpeed) })), { color: '#1d8f6a', yMin: 0, maxX: safeNum(result.durationSec, 10) });
        drawLineChart(section.querySelector('[data-chart="right-speed"]'), (result.series || []).map(p => ({ x: p.t, y: safeNum(p.rightSpeed) })), { color: '#d17b21', yMin: 0, maxX: safeNum(result.durationSec, 10) });
        drawLineChart(section.querySelector('[data-chart="left-var"]'), (result.series || []).map(p => ({ x: safeNum(p.t), y: safeNum(p.leftVariability) })), { color: '#2f7fd3', yMin: 0, maxX: safeNum(result.durationSec, 10) });
        drawLineChart(section.querySelector('[data-chart="right-var"]'), (result.series || []).map(p => ({ x: safeNum(p.t), y: safeNum(p.rightVariability) })), { color: '#a54fd1', yMin: 0, maxX: safeNum(result.durationSec, 10) });
      }
    }
  } catch (error) {
    console.error('buildResultsUI failed', error);
    els.interpretationPanel.className = 'interpretation-panel';
    els.interpretationPanel.innerHTML = '<h2>Summary interpretation</h2><p class="error-text">There was a rendering problem, but the raw results were still generated below.</p>';
    els.resultsSummary.className = 'results-summary';
    els.resultsSummary.innerHTML = '<div class="metric"><div class="metric-label">Results</div><div>Raw results export is available below.</div></div>';
    try { els.resultsExport.value = buildExportText(appState.results); } catch {}
  }
}

function configureEmailDraft() {
  const subject = `PD-FTT results - ${appState.participant.firstName} ${appState.participant.lastName}`;
  const body = els.resultsExport.value + '\n\nNote: Graph images are displayed in the app but are not automatically attached from a browser-only static site.';
  els.emailResultsBtn.href = `mailto:${encodeURIComponent(EMAIL_TO)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function exportResultsPdf() {
  if (!appState?.results?.length) return;
  const title = `PD-FTT Results - ${appState.participant.firstName} ${appState.participant.lastName}`;
  const win = window.open('', '_blank');
  if (!win) return;
  const charts = [...document.querySelectorAll('#stageResults canvas')].map((canvas, idx) => {
    try {
      return `<div style="margin: 18px 0;"><img alt="Chart ${idx + 1}" style="max-width:100%; border:1px solid #ddd; border-radius:10px;" src="${canvas.toDataURL('image/png')}" /></div>`;
    } catch {
      return '';
    }
  }).join('');
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Inter,Arial,sans-serif;padding:32px;color:#17303a;line-height:1.5}
    h1,h2{color:#0e7c82} pre{white-space:pre-wrap;background:#f8fbfd;border:1px solid #dbe8ed;padding:16px;border-radius:12px}
  </style></head><body>
    <h1>${title}</h1>
    <p><strong>Participant:</strong> ${escapeHtml(appState.participant.firstName)} ${escapeHtml(appState.participant.lastName)}<br>
    <strong>Date of birth:</strong> ${escapeHtml(appState.participant.dob)}<br>
    <strong>Completed:</strong> ${escapeHtml(appState.completedAt?.toLocaleString() || '')}</p>
    <pre>${escapeHtml(els.resultsExport.value)}</pre>
    <h2>Graphs</h2>
    ${charts}
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function exportDataCsv() {
  if (!appState?.results?.length) return;
  const rows = [['participant_first_name','participant_last_name','dob','completed_at','stage_id','stage_title','time_s','speed_taps_per_s','variability_ms','cumulative_errors','left_speed_taps_per_s','right_speed_taps_per_s','left_variability_ms','right_variability_ms']];
  for (const result of appState.results) {
    for (const point of result.series) {
      rows.push([
        appState.participant.firstName,
        appState.participant.lastName,
        appState.participant.dob,
        appState.completedAt?.toISOString?.() || '',
        result.id,
        result.title,
        point.t,
        point.speed,
        point.variability,
        point.errors,
        point.leftSpeed ?? '',
        point.rightSpeed ?? '',
        point.leftVariability ?? '',
        point.rightVariability ?? '',
      ]);
    }
  }
  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n');
  downloadFile(csv, `pd-ftt-data-${slugify(appState.participant.firstName + '-' + appState.participant.lastName)}.csv`, 'text/csv;charset=utf-8');
}

function buildInterpretationPanel() {
  const leftStage = appState.results.find(r => r.id === 'left-hand');
  const rightStage = appState.results.find(r => r.id === 'right-hand');
  const bimanualStage = appState.results.find(r => r.id === 'bimanual');

  const speedAsymmetry = leftStage && rightStage
    ? percentDifference(leftStage.overallSpeed, rightStage.overallSpeed)
    : null;
  const variabilityAsymmetry = leftStage && rightStage
    ? percentDifference(leftStage.variability, rightStage.variability)
    : null;
  const slowerHand = leftStage && rightStage
    ? (leftStage.overallSpeed < rightStage.overallSpeed ? 'Left hand' : rightStage.overallSpeed < leftStage.overallSpeed ? 'Right hand' : 'Neither hand')
    : '—';
  const moreVariableHand = leftStage && rightStage
    ? (leftStage.variability > rightStage.variability ? 'Left hand' : rightStage.variability > leftStage.variability ? 'Right hand' : 'Neither hand')
    : '—';
  const fastestStage = [...appState.results].sort((a, b) => b.overallSpeed - a.overallSpeed)[0];
  const mostErrorsStage = [...appState.results].sort((a, b) => b.totalErrors - a.totalErrors)[0];
  const bimanualChange = bimanualStage && leftStage && rightStage
    ? ((bimanualStage.overallSpeed / ((leftStage.overallSpeed + rightStage.overallSpeed) / 2)) - 1) * 100
    : null;

  const bullets = [];
  if (leftStage && rightStage) {
    bullets.push(`${slowerHand} showed the lower unilateral tapping speed.`);
    bullets.push(`${moreVariableHand} showed the greater unilateral inter-tap variability.`);
  }
  if (bimanualChange != null) {
    bullets.push(`Bimanual performance was ${Math.abs(bimanualChange).toFixed(1)}% ${bimanualChange < 0 ? 'slower' : 'faster'} than the average unilateral speed.`);
  }
  if (mostErrorsStage) bullets.push(`Most alternation errors occurred during ${mostErrorsStage.title.toLowerCase()}.`);

  return `
    <div class="section-head">
      <div>
        <h2>Summary interpretation</h2>
        <p class="muted">Descriptive summary only — not a diagnosis.</p>
      </div>
    </div>
    <div class="interpretation-grid">
      <div class="metric"><span class="metric-label">Speed asymmetry (L vs R)</span><div class="metric-value">${speedAsymmetry == null ? '—' : speedAsymmetry.toFixed(1) + '%'}</div></div>
      <div class="metric"><span class="metric-label">Variability asymmetry (L vs R)</span><div class="metric-value">${variabilityAsymmetry == null ? '—' : variabilityAsymmetry.toFixed(1) + '%'}</div></div>
      <div class="metric"><span class="metric-label">Fastest stage</span><div class="metric-value">${fastestStage ? fastestStage.title.replace('Stage ', '').replace('— ', ' ') : '—'}</div></div>
      <div class="metric"><span class="metric-label">Highest error stage</span><div class="metric-value">${mostErrorsStage ? mostErrorsStage.title.replace('Stage ', '').replace('— ', ' ') : '—'}</div></div>
    </div>
    <ul class="interpretation-list">
      ${bullets.map(item => `<li>${item}</li>`).join('')}
    </ul>
  `;
}

function buildExportText(results) {
  const p = appState.participant;
  const completed = appState.completedAt?.toLocaleString() || '';
  const lines = [
    'PARKINSON\'S DISEASE - FINGER TAPPING TEST RESULTS',
    `Participant: ${p.firstName} ${p.lastName}`,
    `Date of birth: ${p.dob}`,
    `Completed: ${completed}`,
    `Stage duration (seconds): ${appState.stageDurationMs / 1000}`,
    '',
  ];
  const leftStage = results.find(r => r.id === 'left-hand');
  const rightStage = results.find(r => r.id === 'right-hand');
  if (leftStage && rightStage) {
    lines.push(`Left vs right speed asymmetry (%): ${percentDifference(leftStage.overallSpeed, rightStage.overallSpeed).toFixed(3)}`);
    lines.push(`Left vs right variability asymmetry (%): ${percentDifference(leftStage.variability, rightStage.variability).toFixed(3)}`);
    lines.push('');
  }
  for (const result of results) {
    lines.push(result.title);
    lines.push(`Keys: ${result.keys.map(displayKey).join(' ↔ ')}`);
    lines.push(`Correct taps: ${result.totalTaps}`);
    lines.push(`Mean speed (taps/s): ${result.overallSpeed.toFixed(3)}`);
    lines.push(`Mean inter-tap interval (ms): ${result.meanInterval.toFixed(1)}`);
    lines.push(`Variability (std dev ms): ${result.variability.toFixed(1)}`);
    lines.push(`Alternation errors: ${result.totalErrors}`);
    lines.push(`Error rate (per second): ${result.errorRate.toFixed(3)}`);
    if (result.id === 'bimanual') {
      lines.push(`Left-hand speed (taps/s): ${result.leftSpeed.toFixed(3)}`);
      lines.push(`Right-hand speed (taps/s): ${result.rightSpeed.toFixed(3)}`);
      lines.push(`Left-hand variability (std dev ms): ${result.leftVariability.toFixed(1)}`);
      lines.push(`Right-hand variability (std dev ms): ${result.rightVariability.toFixed(1)}`);
    }
    lines.push('Time series (t, speed, variability, cumulative_errors, left_speed, right_speed, left_variability, right_variability):');
    for (const point of result.series) lines.push(`${point.t.toFixed(2)}s, ${point.speed.toFixed(3)}, ${point.variability.toFixed(3)}, ${point.errors}, ${(point.leftSpeed ?? 0).toFixed(3)}, ${(point.rightSpeed ?? 0).toFixed(3)}, ${(point.leftVariability ?? 0).toFixed(3)}, ${(point.rightVariability ?? 0).toFixed(3)}`);
    lines.push('');
  }
  return lines.join('\n');
}

function updateStaticUI() {
  const runningStage = appState?.stageIndex >= 0 && appState.stageData ? STAGES[appState.stageIndex] : null;
  els.stageTitle.textContent = runningStage ? runningStage.title : 'Ready';
  els.stageDescription.textContent = runningStage ? runningStage.description : 'Complete participant details to begin.';
  if (runningStage) {
    els.expectedKey.textContent = displayKey(runningStage.keys[appState.expectedIndex]);
    els.tapCount.textContent = String(appState.stageData.totalTaps);
    els.errorCount.textContent = String(appState.stageData.currentErrorCount);
    els.lastKey.textContent = appState.stageData.lastKey ? displayKey(appState.stageData.lastKey) : '—';
    els.phaseMessage.textContent = 'Recording taps…';
  } else {
    els.expectedKey.textContent = '—';
    els.tapCount.textContent = '0';
    els.errorCount.textContent = '0';
    els.lastKey.textContent = '—';
    els.timer.textContent = (appState.stageDurationMs / 1000).toFixed(1);
    els.progressBar.style.width = '0%';
    els.phaseMessage.textContent = 'Waiting to begin';
  }
}

function normaliseKey(key) { return (key || '').toLowerCase(); }
function displayKey(key) { return key === "'" ? "'" : key.toUpperCase(); }
function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function stdDev(values) { const mean = average(values); return Math.sqrt(average(values.map(v => (v - mean) ** 2))); }
function safeNum(value, fallback = 0) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function percentDifference(a, b) {
  const left = safeNum(a);
  const right = safeNum(b);
  const denom = (Math.abs(left) + Math.abs(right)) / 2;
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return (Math.abs(left - right) / denom) * 100;
}
function clearLiveCharts() { renderLiveCharts([], [], []); }
function renderLiveCharts(speedPoints, variabilityPoints, errorPoints) {
  drawLineChart(els.liveSpeedChart, speedPoints, { color: '#0b6f75', yMin: 0, maxX: appState.stageDurationMs / 1000 || 10 });
  drawLineChart(els.liveVariabilityChart, variabilityPoints, { color: '#7d5bd1', yMin: 0, maxX: appState.stageDurationMs / 1000 || 10 });
  drawLineChart(els.liveErrorChart, errorPoints, { color: '#c43f3f', yMin: 0, maxX: appState.stageDurationMs / 1000 || 10, stepLine: true });
}

function drawLineChart(canvas, points, options = {}) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const padding = { top: 18, right: 18, bottom: 34, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#e6eef2'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = padding.top + (innerH / 4) * i; ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke(); }
  const maxX = options.maxX || 10;
  const maxYData = Math.max(options.yMin ?? 0, ...points.map(p => p.y), 1);
  const maxY = niceMax(maxYData); const minY = options.yMin ?? 0;
  ctx.fillStyle = '#607682'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) { const value = minY + ((maxY - minY) / 4) * (4 - i); const y = padding.top + (innerH / 4) * i; ctx.fillText(value.toFixed(maxY < 10 ? 1 : 0), padding.left - 8, y + 4); }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) { const xVal = (maxX / 5) * i; const x = padding.left + (innerW / 5) * i; ctx.fillText(xVal.toFixed(0) + 's', x, height - 10); }
  ctx.strokeStyle = '#9eb4be'; ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, height - padding.bottom); ctx.lineTo(width - padding.right, height - padding.bottom); ctx.stroke();
  if (!points.length) { ctx.fillStyle = '#8aa0aa'; ctx.textAlign = 'center'; ctx.fillText('No data yet', width / 2, height / 2); return; }
  ctx.strokeStyle = options.color || '#0b6f75'; ctx.lineWidth = 2.5; ctx.beginPath();
  points.forEach((point, idx) => {
    const x = padding.left + (point.x / maxX) * innerW;
    const y = padding.top + innerH - ((point.y - minY) / (maxY - minY || 1)) * innerH;
    if (idx === 0) return ctx.moveTo(x, y);
    if (options.stepLine) {
      const prev = points[idx - 1];
      const prevY = padding.top + innerH - ((prev.y - minY) / (maxY - minY || 1)) * innerH;
      ctx.lineTo(x, prevY); ctx.lineTo(x, y);
    } else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function niceMax(value) { if (value <= 1) return 1; const exponent = Math.floor(Math.log10(value)); const fraction = value / 10 ** exponent; const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10; return niceFraction * 10 ** exponent; }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function csvEscape(value) { const s = String(value ?? ''); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; }
function slugify(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'results'; }
function downloadFile(content, filename, mimeType) { const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

els.beginSetupBtn.addEventListener('click', handleSetupSubmit);
els.participantForm.addEventListener('submit', (event) => event.preventDefault());
els.resetBtn.addEventListener('click', () => { els.participantForm.reset(); resetState(); });
els.copyResultsBtn.addEventListener('click', async () => {
  if (!els.resultsExport.value) return;
  await navigator.clipboard.writeText(els.resultsExport.value);
  els.copyResultsBtn.textContent = 'Copied'; setTimeout(() => els.copyResultsBtn.textContent = 'Copy results', 1200);
});
els.exportPdfBtn.addEventListener('click', exportResultsPdf);
els.exportCsvBtn.addEventListener('click', exportDataCsv);
window.addEventListener('keydown', handleKeydown);
resetState();
