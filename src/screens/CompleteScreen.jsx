import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ClipboardList, Copy, GitFork } from 'lucide-react';
import SiteFrame from '../components/SiteFrame.jsx';
import { LABS } from '../labs.js';
import { getGradeFeedback } from '../grade-feedback.js';

export default function CompleteScreen({ data }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const titleRef = useRef(null);
  const reportRef = useRef(null);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  if (!data) return null;

  const { name, github, scores, maxScores, total, reportCode } = data;
  const maxTotal = maxScores.reduce((sum, value) => sum + value, 0);
  const pct = maxTotal ? Math.round(total / maxTotal * 100) : 0;
  const { grade, tone, label, emoji, message } = getGradeFeedback(pct);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reportCode);
      setCopied(true);
      setCopyError('');
    } catch {
      setCopyError('Selecciona el código y cópialo con el teclado.');
      reportRef.current?.focus();
      reportRef.current?.select();
    }
  }

  return (
    <SiteFrame className="hsw-complete">
      <main id="main-content" className="hsw-results hsw-card">
        <div className="hsw-meta"><span className="hsw-tag"><Check size={16} aria-hidden="true" /> Actividad completada</span></div>
        <h1 ref={titleRef} tabIndex={-1} className="hsw-title">Laboratorio completado</h1>
        <p className="hsw-description hsw-student">{name} <span>· @{github}</span></p>

        <section className={`hsw-result-summary is-${tone}`} aria-label="Resultado final">
          <div className="hsw-total"><strong>{total}</strong><span>de {maxTotal} puntos</span></div>
          <div className="hsw-grade">
            <span>Calificación</span>
            <strong>{grade} <span>· {pct}%</span></strong>
            <p className="hsw-grade-label"><span aria-hidden="true">{emoji}</span> {label}</p>
            <p>{message}</p>
          </div>
        </section>

        <section className="hsw-result-section" aria-labelledby="breakdown-title">
          <h2 id="breakdown-title">Desglose por laboratorio</h2>
          <div className="hsw-table-scroll" tabIndex={0} role="region" aria-label="Resultados por laboratorio">
            <table className="hsw-results-table">
              <thead><tr><th scope="col">Laboratorio</th><th scope="col">Estado</th><th scope="col">Puntos</th></tr></thead>
              <tbody>{LABS.map((lab, index) => {
                const score = scores[index], max = maxScores[index];
                const state = max === 0 ? 'neutral' : score === max ? 'success' : score > 0 ? 'warning' : 'error';
                const label = max === 0 ? 'Completado' : score === max ? 'Correcto' : score > 0 ? 'Parcial' : 'Por reforzar';
                return (
                  <tr key={lab.index}>
                    <th scope="row"><span className="hsw-lab-number">{lab.labNumber}</span>{lab.concept}</th>
                    <td><span className={'hsw-result-state is-' + state}>{label}</span></td>
                    <td>{max === 0 ? '—' : score + ' / ' + max}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </section>

        <section className="hsw-result-section" aria-labelledby="report-title">
          <div className="hsw-section-heading">
            <h2 id="report-title"><ClipboardList size={22} aria-hidden="true" /> Código de verificación</h2>
            <button type="button" onClick={handleCopy} className="hsw-button hsw-button-secondary">
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {copied ? 'Copiado' : 'Copiar código'}
            </button>
          </div>
          <p className="hsw-description">Comparte este código con tu instructor para verificar tu participación y tus respuestas.</p>
          <label htmlFor="verification-code" className="sr-only">Código de verificación del laboratorio</label>
          <textarea ref={reportRef} id="verification-code" className="hsw-report-code" value={reportCode} readOnly rows={5} spellCheck={false} />
          <p className="hsw-help" role="status">{copyError || (copied ? 'Código copiado al portapapeles.' : '')}</p>
        </section>

        <section className="hsw-next-step" aria-labelledby="practice-title">
          <div><h2 id="practice-title">Continúa con la práctica en GitHub</h2>
            <p>Haz fork del repositorio y aplica lo aprendido en los escenarios de <code>practice/</code>.</p></div>
          <a href="https://github.com/neavus-23/Helllo-Secure-World" target="_blank" rel="noopener noreferrer" className="hsw-button">
            <GitFork size={20} aria-hidden="true" /> Ir a GitHub <ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>
      </main>
    </SiteFrame>
  );
}
