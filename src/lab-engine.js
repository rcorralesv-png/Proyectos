/**
 * src/lab-engine.js
 * Sequential lab state machine.
 *
 * Global phases: WELCOME → LAB → COMPLETE
 * Per-lab phases: INTERACT → CHALLENGE → ANSWERED → SUBMITTED
 */

export const Phase = Object.freeze({
  WELCOME:  'welcome',
  LAB:      'lab',
  COMPLETE: 'complete',
});

export const LabPhase = Object.freeze({
  INTERACT:  'interact',
  CHALLENGE: 'challenge',
  ANSWERED:  'answered',
  SUBMITTED: 'submitted',
});

// Required interaction keys per lab (index matches lab index 0-10)
const _req = [
  ['pipeline-run-healthy'],
  ['pipeline-run-vulnerable-dep'],
  ['gate-animation-complete'],
  ['control-sca-opened'],
  ['blast-toggled-excessive'],
  ['threat-vuln-npm', 'threat-compromised-action'],
  ['xss-btn-clicked'],
  ['arch-zone-dev', 'arch-zone-runner', 'arch-zone-deploy'],
  ['matrix-filter-used'],
  ['pipeline-run-secret-detected'],
  ['incident-phase-1-done', 'incident-phase-2-done', 'incident-phase-3-done', 'incident-phase-4-done'],
];

const _st = {
  phase: Phase.WELCOME,
  studentName: '',
  githubUsername: '',
  currentLabIndex: 0,
  labPhase: LabPhase.INTERACT,
  submitted: new Array(11).fill(false),
  selectedAnswers: new Array(11).fill(null),
  interactionsDone: new Set(),
  threatResults: {},   // keyed by threatId → { primaryHit }
};

export function getState() {
  return {
    phase: _st.phase,
    currentLabIndex: _st.currentLabIndex,
    labPhase: _st.labPhase,
    submitted: [..._st.submitted],
    selectedAnswer: _st.selectedAnswers[_st.currentLabIndex],
    totalDone: _st.submitted.filter(Boolean).length,
  };
}

export function startLab(studentName, githubUsername) {
  _st.studentName = studentName;
  _st.githubUsername = githubUsername;
  _st.phase = Phase.LAB;
  _st.currentLabIndex = 0;
  _st.labPhase = LabPhase.INTERACT;
}

/** Returns true if the phase changed to CHALLENGE. */
export function markInteraction(interactionKey) {
  const key = `lab-${_st.currentLabIndex}-${interactionKey}`;
  _st.interactionsDone.add(key);
  if (_st.labPhase !== LabPhase.INTERACT) return false;
  const required = _req[_st.currentLabIndex];
  const allDone = required.every(k =>
    _st.interactionsDone.has(`lab-${_st.currentLabIndex}-${k}`)
  );
  if (allDone) { _st.labPhase = LabPhase.CHALLENGE; return true; }
  return false;
}

export function getRemainingInteractions() {
  const required = _req[_st.currentLabIndex];
  return required.filter(k =>
    !_st.interactionsDone.has(`lab-${_st.currentLabIndex}-${k}`)
  );
}

/** Record threat challenge result for Lab 6 scoring. */
export function recordThreatResult(threatId, primaryHit) {
  _st.threatResults[threatId] = { primaryHit };
}

export function getThreatResults() {
  return { ..._st.threatResults };
}

/** Returns true if valid selection. */
export function selectAnswer(answerId) {
  if (_st.labPhase !== LabPhase.CHALLENGE && _st.labPhase !== LabPhase.ANSWERED) return false;
  _st.selectedAnswers[_st.currentLabIndex] = answerId;
  _st.labPhase = LabPhase.ANSWERED;
  return true;
}

/** Submit current lab. Returns { points, maxPoints } or null. */
export function submitCurrentLab(scoringFn) {
  if (_st.labPhase !== LabPhase.ANSWERED) return null;
  if (_st.submitted[_st.currentLabIndex]) return null;
  const answer = _st.selectedAnswers[_st.currentLabIndex];
  const result = scoringFn(_st.currentLabIndex, answer);
  _st.submitted[_st.currentLabIndex] = true;
  _st.labPhase = LabPhase.SUBMITTED;
  return result;
}

/** Advance to next lab or completion. */
export function advance() {
  if (_st.labPhase !== LabPhase.SUBMITTED) return;
  if (_st.currentLabIndex < 10) {
    _st.currentLabIndex++;
    _st.labPhase = LabPhase.INTERACT;
  } else {
    _st.phase = Phase.COMPLETE;
  }
}

export function getStudentInfo() {
  return { name: _st.studentName, github: _st.githubUsername };
}

export function getAllAnswers() {
  return [..._st.selectedAnswers];
}
