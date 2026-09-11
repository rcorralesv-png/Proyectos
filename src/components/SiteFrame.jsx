import { ShieldCheck } from 'lucide-react';

export default function SiteFrame({ children, className = '' }) {
  return (
    <div className={`hsw-site ${className}`}>
      <a className="hsw-skip-link" href="#main-content">Saltar al contenido</a>
      <div className="hsw-container">
        <header className="hsw-header">
          <div className="hsw-brand">
            <ShieldCheck size={32} strokeWidth={1.6} aria-hidden="true" />
            <span>Hello Secure World</span>
          </div>
          <ul className="hsw-tags" aria-label="Tecnologías del laboratorio">
            {['CI/CD', 'DevSecOps', 'SLSA'].map(tag => <li key={tag}>{tag}</li>)}
          </ul>
        </header>
        {children}
        <footer className="hsw-footer">
          Entorno académico · Seguridad en CI/CD · Validación verificable
        </footer>
      </div>
    </div>
  );
}
