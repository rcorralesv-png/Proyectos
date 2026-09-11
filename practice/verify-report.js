#!/usr/bin/env node
/**
 * Verificador de reportes HSW para instructores.
 * Uso: node practice/verify-report.js HSW-<payload>-<sig>
 *
 * Requiere Node.js 18+ (Web Crypto API disponible en globalThis.crypto)
 */

const SALT = 'hsw-2025-int-x7k9mq3z';
const MAX_SCORES = [8, 10, 10, 8, 10, 16, 10, 10, 10, 8];

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 70, grade: 'C' },
  { min: 60, grade: 'D' },
  { min: 0,  grade: 'F' },
];

function gradeForPercent(pct) {
  return (GRADE_THRESHOLDS.find(t => pct >= t.min) || { grade: 'F' }).grade;
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const b64 = pad ? padded + '='.repeat(4 - pad) : padded;
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function verifyHmac(payloadB64, sigHex) {
  const keyData = new TextEncoder().encode(SALT);
  const payloadData = new TextEncoder().encode(payloadB64);

  const key = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );

  const sigBuf = await crypto.subtle.sign('HMAC', key, payloadData);
  const fullHex = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return fullHex.slice(0, 16) === sigHex;
}

async function main() {
  const arg = process.argv[2];

  if (!arg || arg === '--help' || arg === '-h') {
    console.log('Uso: node practice/verify-report.js HSW-<payload>-<sig>');
    console.log('Ejemplo: node practice/verify-report.js HSW-eyJuIjoiQW5hIi...-a3f7d2e1b8c09541');
    process.exit(arg ? 0 : 1);
  }

  const parts = arg.split('-');
  if (parts.length < 3 || parts[0] !== 'HSW') {
    console.error('Error: formato inválido. El reporte debe comenzar con HSW-');
    process.exit(1);
  }

  // sig es la última parte (16 hex chars), payload es todo lo que está entre HSW- y -sig
  const sigHex = parts[parts.length - 1];
  const payloadB64 = parts.slice(1, parts.length - 1).join('-');

  if (!/^[0-9a-f]{16}$/.test(sigHex)) {
    console.error('Error: la firma debe ser 16 caracteres hexadecimales');
    process.exit(1);
  }

  // Decodificar payload
  let payload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch {
    console.error('Error: no se pudo decodificar el payload. ¿El código está completo?');
    process.exit(1);
  }

  // Verificar HMAC
  const valid = await verifyHmac(payloadB64, sigHex);

  const line = '─'.repeat(50);
  console.log('');
  if (valid) {
    console.log('✅ REPORTE VERIFICADO');
  } else {
    console.log('❌ REPORTE INVÁLIDO — firma no coincide');
    console.log('   El código fue modificado o generado con un salt incorrecto.');
  }
  console.log(line);

  if (payload.n) console.log(`Estudiante:    ${payload.n}`);
  if (payload.g) console.log(`GitHub:        ${payload.g}`);

  const total = Array.isArray(payload.s) ? payload.s.reduce((a, b) => a + b, 0) : '?';
  const maxTotal = MAX_SCORES.reduce((a, b) => a + b, 0);
  const pct = typeof total === 'number' ? Math.round(total / maxTotal * 100) : '?';
  const grade = typeof pct === 'number' ? gradeForPercent(pct) : '?';

  console.log(`Puntaje:       ${total} / ${maxTotal} (${pct}%) — Nota: ${grade}`);

  if (payload.ts) {
    const fecha = new Date(payload.ts).toLocaleString('es', {
      dateStyle: 'long', timeStyle: 'medium'
    });
    console.log(`Fecha:         ${fecha}`);
  }

  if (Array.isArray(payload.s) && payload.s.length === 10) {
    console.log('');
    console.log('Desglose por lab:');
    const labNames = [
      'Pipeline verde',
      'SCA bloquea SAST',
      'Scanner ≠ Gate',
      'Control Explorer (SCA)',
      'Blast Radius GITHUB_TOKEN',
      'Threat Challenge (ataque→defensa)',
      'DOM XSS / textContent',
      'Arquitectura / Trust Boundaries',
      'Matriz de Controles',
      'Secret Scanning / Síntesis',
    ];
    payload.s.forEach((pts, i) => {
      const max = MAX_SCORES[i];
      const mark = pts === max ? '✓' : pts > 0 ? '~' : '✗';
      console.log(`  ${mark} Lab ${i + 1} — ${labNames[i]}: ${pts}/${max}`);
    });
  }

  if (Array.isArray(payload.a) && payload.a.length > 0) {
    console.log('');
    console.log('Respuestas enviadas:');
    payload.a.forEach((ans, i) => {
      if (ans) console.log(`  Lab ${i + 1}: ${ans}`);
    });
  }

  console.log(line);
  console.log('');

  process.exit(valid ? 0 : 2);
}

main().catch(err => {
  console.error('Error inesperado:', err.message);
  process.exit(1);
});
