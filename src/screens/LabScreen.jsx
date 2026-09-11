import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import SiteFrame from '../components/SiteFrame.jsx';
import { LABS } from '../labs.js';
import { QUIZ_QUESTIONS, LAB6_THREAT_IDS, LAB6_POINTS_PER_THREAT, checkQuizAnswer } from '../challenges.js';
import {
  markInteraction, selectAnswer, submitCurrentLab,
  getThreatResults, advance,
} from '../lab-engine.js';
import { recordLabScore, getTotalScore } from '../scoring.js';
import { mountInteractive } from '../interactive/builders.js';

export default function LabScreen({ onComplete }) {
  const [labIndex, setLabIndex] = useState(0);
  const [labPhase, setLabPhase] = useState('interact');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [timerSec, setTimerSec] = useState(60);
  const [totalScore, setTotalScore] = useState(0);
  const [submitted, setSubmitted] = useState(new Array(11).fill(false));

  const headingRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [labIndex]);
  const submitHandlerRef = useRef(null);
  const lab = LABS[labIndex];

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    mountInteractive(containerRef.current, lab, (key) => {
      const changed = markInteraction(key);
      if (changed) { setLabPhase('challenge'); setTimerSec(60); }
    });
    return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
  }, [labIndex]);

  useEffect(() => {
    if (labPhase !== 'challenge') return;
    const id = setInterval(() => {
      setTimerSec(t => {
        if (t <= 1) { clearInterval(id); if (submitHandlerRef.current) submitHandlerRef.current('__timeout__'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [labPhase]);

  const handleSubmit = useCallback((forcedAnswer) => {
    const answerToUse = forcedAnswer || selectedAnswer;
    if (!answerToUse) return;
    if (forcedAnswer) selectAnswer(forcedAnswer);

    const result = submitCurrentLab((idx, answerId) => {
      if (lab.interactiveKey === 'threat-challenge') {
        const threats = getThreatResults();
        const hits = LAB6_THREAT_IDS.filter(id => threats[id]?.primaryHit).length;
        return { points: hits * LAB6_POINTS_PER_THREAT, maxPoints: lab.maxPoints };
      }
      const check = checkQuizAnswer(lab.questionId, answerId);
      return { points: check.correct ? lab.maxPoints : 0, maxPoints: lab.maxPoints };
    });

    if (!result) return;
    recordLabScore(labIndex, result.points);
    setTotalScore(getTotalScore());
    const newSubmitted = [...submitted];
    newSubmitted[labIndex] = true;
    setSubmitted(newSubmitted);
    setSubmitResult({ ...result, correct: result.points === result.maxPoints });
    setLabPhase('submitted');
  }, [labIndex, lab, selectedAnswer, submitted]);

  useEffect(() => { submitHandlerRef.current = handleSubmit; }, [handleSubmit]);

  function handleSelectAnswer(answerId) {
    if (labPhase !== 'challenge' && labPhase !== 'answered') return;
    selectAnswer(answerId);
    setSelectedAnswer(answerId);
    setLabPhase('answered');
  }

  function handleContinue() {
    if (labIndex >= 10) { onComplete(); return; }
    advance();
    setLabIndex(i => i + 1);
    setLabPhase('interact');
    setSelectedAnswer(null);
    setSubmitResult(null);
    setTimerSec(60);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const question = lab.questionId ? QUIZ_QUESTIONS.find(q => q.id === lab.questionId) : null;
  const isThreatChallenge = lab.interactiveKey === 'threat-challenge';
  const timerPct = (timerSec / 60) * 100;
  const timerState = timerSec <= 10 ? 'critical' : timerSec <= 20 ? 'warning' : 'normal';
  const resultState = submitResult?.correct ? 'success' : submitResult?.points > 0 ? 'warning' : 'error';

  return (
    <SiteFrame className="hsw-workspace">
      <section className="hsw-progress" aria-label="Progreso del laboratorio">
        <div className="hsw-progress-summary">
          <span>Tu progreso <strong>{submitted.filter(Boolean).length} de {LABS.length} completados</strong></span>
          <span className="hsw-score">{totalScore} puntos</span>
        </div>
        <ol className="hsw-steps">
          {LABS.map((item, index) => (
            <li key={item.index} className={submitted[index] ? 'is-done' : index === labIndex ? 'is-current' : ''}
              aria-current={index === labIndex ? 'step' : undefined}
              aria-label={'Laboratorio ' + (index + 1) + ': ' + (submitted[index] ? 'completado' : index === labIndex ? 'actual' : 'pendiente')}>
              <span>{submitted[index] ? <Check size={16} aria-hidden="true" /> : index + 1}</span>
            </li>
          ))}
        </ol>
      </section>

      <main id="main-content" className="hsw-lab hsw-card">
        <div className="hsw-lab-hero">
          <div className="hsw-meta">
            <span className="hsw-tag">Laboratorio {lab.labNumber} / {LABS.length}</span>
            <span className="hsw-tag">{lab.maxPoints > 0 ? lab.maxPoints + ' puntos' : 'Síntesis'}</span>
          </div>
          <p className="hsw-eyebrow">{lab.concept}</p>
          <h1 ref={headingRef} tabIndex={-1} className="hsw-title">{lab.title}</h1>
          <p className="hsw-description">{lab.description}</p>
        </div>

        <section aria-label="Actividad interactiva" className="hsw-activity">
          <div ref={containerRef} className="lab-interactive" />
        </section>

        <section className="hsw-challenge" aria-label="Comprobación de comprensión">
          {labPhase === 'interact' && (
            <div className="hsw-locked">
              <LockKeyhole size={24} aria-hidden="true" />
              <div><h2>Completa la actividad para continuar</h2><p>{lab.lockHint}</p></div>
            </div>
          )}

          {labPhase !== 'interact' && labPhase !== 'submitted' && (
            <>
              <div className={'hsw-timer is-' + timerState}>
                <div><span>Tiempo para responder</span><span role="timer" aria-label="Tiempo restante">{timerSec} s</span></div>
                <div className="hsw-timer-track" aria-hidden="true"><div style={{ width: timerPct + '%' }} /></div>
              </div>
              {question && !isThreatChallenge && (
                <fieldset className="hsw-question">
                  <legend>{question.question}</legend>
                  <div className="hsw-options">
                    {question.options.map(opt => (
                      <label key={opt.id} className={'hsw-option' + (selectedAnswer === opt.id ? ' is-selected' : '')}>
                        <input type="radio" name="lab-answer" value={opt.id} checked={selectedAnswer === opt.id}
                          onChange={() => handleSelectAnswer(opt.id)} />
                        <span className="hsw-option-key" aria-hidden="true">{opt.id.toUpperCase()}</span>
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {isThreatChallenge && <ThreatSynthesis onReady={() => handleSelectAnswer('threat-eval')} />}
            </>
          )}

          {labPhase === 'submitted' && submitResult && (
            <div className="hsw-feedback" role="status">
              <p className={'hsw-notice is-' + resultState}>
                {submitResult.maxPoints === 0 ? '✓ Síntesis completada' : (
                  <>{submitResult.correct ? '✓ Correcto' : submitResult.points > 0 ? '◐ Parcialmente correcto' : '✗ Incorrecto'}
                    {' — '}{submitResult.points}/{submitResult.maxPoints} puntos</>
                )}
              </p>
              {question && <div className="hsw-explanation"><h2>Explicación</h2><p>{question.explanation}</p></div>}
            </div>
          )}
        </section>

        {labPhase === 'answered' && (
          <div className="hsw-actions">
            <button type="button" onClick={() => handleSubmit()} className="hsw-button hsw-button-wide">
              Enviar respuesta <ArrowRight size={20} aria-hidden="true" />
            </button>
            <p className="hsw-help">Una vez enviada, no podrás modificar tu respuesta.</p>
          </div>
        )}
        {labPhase === 'submitted' && (
          <div className="hsw-actions">
            <button type="button" onClick={handleContinue} className="hsw-button hsw-button-wide">
              {labIndex < LABS.length - 1 ? 'Continuar al laboratorio ' + (labIndex + 2) : 'Ver resultados'}
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </main>
    </SiteFrame>
  );
}

function ThreatSynthesis({ onReady }) {
  const [ready, setReady] = useState(false);
  const threats = getThreatResults();
  const hits = LAB6_THREAT_IDS.filter(id => threats[id]?.primaryHit).length;
  const pts = hits * LAB6_POINTS_PER_THREAT;
  const bothEvaluated = LAB6_THREAT_IDS.every(id => id in threats);

  useEffect(() => {
    if (bothEvaluated && !ready) { setReady(true); onReady(); }
  }, [bothEvaluated, ready, onReady]);

  if (!bothEvaluated) return <p className="hsw-description">Evalúa ambas amenazas para continuar.</p>;
  return (
    <div className="hsw-explanation">
      <h2>Resultado del análisis</h2>
      <p>Identificaste el control primario correcto en <strong>{hits}/2</strong> amenazas.</p>
      <p>Puntos: <strong>{pts} / 16</strong>. Envía tu respuesta para continuar.</p>
    </div>
  );
}
