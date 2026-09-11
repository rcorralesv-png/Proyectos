/**
 * src/scoring.js
 * Anti-cheat scoring using XOR encoding + Web Crypto HMAC-SHA256.
 *
 * Score is never stored as a plain number in a named variable.
 * Per-lab points are stored XOR-encoded with a per-index key.
 * The final report is HMAC-SHA256 signed — any tampering after
 * generation is detectable by the instructor's verify-report.js script.
 */

const _kS = 'hsw-2025-int-x7k9mq3z';
const _xV = Object.freeze([8, 10, 10, 8, 10, 16, 10, 10, 10, 8, 0]);

function _enc(pts, idx) { return (pts ^ (idx * 0x1F)) ^ 0xA7; }
function _dec(enc, idx)  { return (enc ^ 0xA7) ^ (idx * 0x1F); }

const _xR = new Array(11).fill(0).map((_, i) => _enc(0, i));

export function recordLabScore(labIndex, points) {
  if (labIndex < 0 || labIndex >= 11) return;
  const safe = Math.max(0, Math.min(points, _xV[labIndex]));
  _xR[labIndex] = _enc(safe, labIndex);
}

export function getLabScores() {
  return _xR.map((enc, i) => _dec(enc, i));
}

export function getTotalScore() {
  return getLabScores().reduce((a, b) => a + b, 0);
}

export function getMaxScores() {
  return [..._xV];
}

export async function generateReport(studentName, githubUsername, labAnswerIds) {
  const payload = {
    n: studentName.trim(),
    g: githubUsername.trim().toLowerCase(),
    s: getLabScores(),
    a: labAnswerIds,
    ts: Date.now(),
    v: 1,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = btoa(payloadStr)
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(_kS),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC', keyMaterial, new TextEncoder().encode(payloadStr)
  );
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `HSW-${payloadB64}-${sigHex.slice(0, 16)}`;
}
