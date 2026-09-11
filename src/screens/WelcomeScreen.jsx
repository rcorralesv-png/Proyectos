import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import './WelcomeScreen.css';
import SiteFrame from '../components/SiteFrame.jsx';

export default function WelcomeScreen({ onStart }) {
  const [name, setName] = useState('');
  const [github, setGithub] = useState('');
  const [errors, setErrors] = useState({});
  const [startError, setStartError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const nameRef = useRef(null);
  const githubRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isStarting) return;

    const studentName = name.trim();
    const githubUsername = github.trim();
    const nextErrors = {
      name: studentName ? '' : 'Este campo es obligatorio.',
      github: githubUsername ? '' : 'Este campo es obligatorio.',
    };
    setErrors(nextErrors);
    setStartError('');

    if (nextErrors.name || nextErrors.github) {
      (nextErrors.name ? nameRef : githubRef).current?.focus();
      return;
    }

    setIsStarting(true);
    try {
      await onStart(studentName, githubUsername);
    } catch {
      setStartError('No se pudo iniciar el laboratorio. Inténtalo de nuevo.');
      setIsStarting(false);
    }
  }

  return (
    <SiteFrame className="lab-access-page">
      <main id="main-content" className="lab-access-card" aria-labelledby="lab-access-title">
        <h1 id="lab-access-title" className="lab-access-title">Laboratorio de DevSecOps</h1>
        <p className="lab-access-description">
          Ejercicio práctico sobre controles de seguridad en pipelines de CI/CD.
          <br />{' '}
          Completa el acceso para iniciar la actividad.
        </p>

        <hr className="lab-access-divider" />

        <form className="lab-access-form" onSubmit={handleSubmit} noValidate aria-busy={isStarting}>
          <div className="lab-access-field">
            <label htmlFor="full-name">Nombre completo</label>
            <input
              ref={nameRef}
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Escribe tu nombre y apellido"
              value={name}
              onChange={event => {
                setName(event.target.value);
                if (event.target.value.trim()) setErrors(previous => ({ ...previous, name: '' }));
              }}
              className="lab-access-input"
              required
              readOnly={isStarting}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'full-name-error' : undefined}
            />
            {errors.name && <p id="full-name-error" className="lab-access-error">{errors.name}</p>}
          </div>

          <div className="lab-access-field">
            <label htmlFor="github-username">Usuario de GitHub</label>
            <input
              ref={githubRef}
              id="github-username"
              name="githubUsername"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Ingresa tu usuario de GitHub"
              value={github}
              onChange={event => {
                setGithub(event.target.value);
                if (event.target.value.trim()) setErrors(previous => ({ ...previous, github: '' }));
              }}
              className="lab-access-input"
              required
              readOnly={isStarting}
              aria-invalid={Boolean(errors.github)}
              aria-describedby={errors.github ? 'github-username-error' : undefined}
            />
            {errors.github && <p id="github-username-error" className="lab-access-error">{errors.github}</p>}
          </div>

          <button className="lab-access-submit" type="submit" disabled={isStarting}>
            <span>
              {isStarting ? 'Preparando laboratorio…' : 'Iniciar actividad'}
            </span>
            {!isStarting && <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />}
          </button>
          {startError && <p className="lab-access-error" role="alert">{startError}</p>}
        </form>
        <p className="sr-only" role="status" aria-live="polite">
          {isStarting ? 'Preparando laboratorio…' : ''}
        </p>
      </main>

    </SiteFrame>
  );
}
