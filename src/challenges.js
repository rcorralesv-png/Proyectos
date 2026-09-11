/**
 * Datos de los retos interactivos Amenaza → Defensa y preguntas de quiz.
 * La evaluación es analítica: siempre explica el porqué y las limitaciones.
 */
export const THREAT_SCENARIOS = [
  {
    id: 'vulnerable-npm',
    threat: 'Dependencia npm con vulnerabilidad conocida',
    description: 'Un desarrollador agrega una biblioteca de terceros que tiene un CVE registrado con severidad HIGH en la base de datos de GitHub Advisory.',
    primaryControls: ['sca'],
    complementaryControls: ['code-review', 'dependabot'],
    explanation: 'SCA (Software Composition Analysis) es el control principal para este vector. Herramientas como npm audit correlacionan las dependencias instaladas contra bases de datos de vulnerabilidades conocidas (NVD, GitHub Advisory Database).',
    limitations: 'No detecta zero-days ni paquetes maliciosos sin CVE registrado. La detección depende de que la vulnerabilidad ya esté documentada en la base de datos.',
  },
  {
    id: 'hardcoded-key',
    threat: 'Clave de API hardcodeada en el código fuente',
    description: 'Un desarrollador incluye un token de acceso directamente en el código que sube al repositorio, exponiéndolo potencialmente a todos los que tienen acceso.',
    primaryControls: ['secret-scanning'],
    complementaryControls: ['code-review'],
    explanation: 'Secret Scanning es el control principal. GitHub detecta patrones de tokens de proveedores conocidos y puede bloquear el push antes de que el secreto llegue al historial (Push Protection).',
    limitations: 'La detección depende de que el formato del secreto sea reconocido por los patrones del proveedor. Secretos en formatos personalizados o no registrados pueden no detectarse.',
  },
  {
    id: 'dom-injection',
    threat: 'Manipulación insegura del DOM con entrada del usuario',
    description: 'Un desarrollador usa innerHTML con datos controlados por el usuario, creando un vector potencial de DOM-based XSS.',
    primaryControls: ['sast'],
    complementaryControls: ['code-review'],
    explanation: 'SAST (Static Application Security Testing) analiza el código sin ejecutarlo, buscando flujos de datos peligrosos desde fuentes (entrada del usuario) hacia sumideros (innerHTML). CodeQL es especialmente efectivo para este tipo de patrones.',
    limitations: 'SAST puede producir falsos positivos y falsos negativos. No puede detectar todos los patrones de flujo de datos, especialmente en código muy dinámico.',
  },
  {
    id: 'functional-regression',
    threat: 'Cambio que rompe funcionalidad existente',
    description: 'Una modificación al código altera el comportamiento esperado de una función que otros componentes del sistema utilizan.',
    primaryControls: ['tests'],
    complementaryControls: ['code-review'],
    explanation: 'Las pruebas automatizadas son el control principal para regresiones funcionales. Validan el comportamiento esperado de forma repetible en cada PR.',
    limitations: 'Los tests solo cubren los casos que fueron escritos explícitamente. El comportamiento no cubierto no se detecta, incluyendo casos borde y vectores de ataque no anticipados.',
  },
  {
    id: 'direct-push',
    threat: 'Push directo a la rama main sin revisión ni controles',
    description: 'Un desarrollador realiza un push directo a main, evadiendo completamente el pipeline de CI, la revisión de código y los security gates configurados.',
    primaryControls: ['branch-protection'],
    complementaryControls: ['code-review', 'least-privilege'],
    explanation: 'Branch Protection Rules bloquean los pushes directos a main y requieren que los required status checks pasen y que las revisiones sean aprobadas antes del merge.',
    limitations: 'Los administradores del repositorio pueden eludir la protección. Una configuración incorrecta puede dejar brechas. Los Rulesets de GitHub ofrecen mayor granularidad.',
  },
  {
    id: 'malicious-pr',
    threat: 'Cambio malicioso camuflado dentro de un Pull Request',
    description: 'Un contribuyente malintencionado oculta código con efectos secundarios dañinos dentro de un PR que parece legítimo y pasa todos los checks automatizados.',
    primaryControls: ['code-review'],
    complementaryControls: ['sast', 'sca', 'branch-protection', 'least-privilege'],
    explanation: 'La revisión de código es el control principal para este vector, ya que los scanners automatizados pueden no detectar cambios maliciosos de lógica de negocio diseñados para evadir la detección.',
    limitations: 'Un revisor puede no detectar código malicioso suficientemente bien camuflado. La fatiga del revisor es un riesgo real en equipos con alta velocidad de cambios.',
  },
  {
    id: 'compromised-action',
    threat: 'GitHub Action de terceros comprometida en el workflow',
    description: 'Un atacante compromete el repositorio de una Action de terceros utilizada en el workflow, inyectando código malicioso que se ejecuta en el runner.',
    primaryControls: ['least-privilege'],
    complementaryControls: ['code-review', 'branch-protection'],
    explanation: 'Least Privilege limita el blast radius: con permisos mínimos, una Action comprometida tiene menor alcance sobre los recursos del repositorio. SHA pinning añade inmutabilidad. Usar Actions de publishers confiables reduce la exposición.',
    limitations: 'Least Privilege limita pero no elimina el riesgo. La Action comprometida aún ejecuta código en el runner y puede exfiltrar secretos accesibles en el contexto del workflow.',
  },
];

// Lab 6: threat IDs and scoring
export const LAB6_THREAT_IDS = ['vulnerable-npm', 'compromised-action'];
export const LAB6_POINTS_PER_THREAT = 8;

export const QUIZ_QUESTIONS = [
  // ── Labs secuenciales 1-5, 7-10 ────────────────────────────────────
  {
    id: 'lab1-green-pipeline',
    question: '¿Qué garantiza realmente un pipeline verde — todos los checks pasan?',
    options: [
      { id: 'a', text: 'Que el software no tiene ninguna vulnerabilidad de seguridad' },
      { id: 'b', text: 'Que el código fue auditado manualmente por expertos en seguridad' },
      { id: 'c', text: 'Que los controles configurados no detectaron condiciones de fallo dentro de su alcance', correct: true },
      { id: 'd', text: 'Que el software está aprobado para producción sin restricciones adicionales' },
    ],
    explanation: 'Un pipeline verde confirma que los controles configurados se ejecutaron y no encontraron condiciones de fallo dentro de su propio alcance. No garantiza ausencia de vulnerabilidades: zero-days, problemas de diseño, vectores no cubiertos por los controles, o vulnerabilidades introducidas después del análisis quedan fuera de su alcance.',
  },
  {
    id: 'lab2-sast-blocked',
    question: 'En el escenario "Dependencia Vulnerable", ¿por qué SAST aparece como BLOQUEADO en lugar de FALLIDO?',
    options: [
      { id: 'a', text: 'Porque CodeQL no puede analizar código que tiene dependencias vulnerables' },
      { id: 'b', text: 'Porque SAST no analiza dependencias de terceros, solo código propio' },
      { id: 'c', text: 'Porque el job de SAST depende del de SCA; al fallar SCA, SAST nunca se ejecutó', correct: true },
      { id: 'd', text: 'Porque no había vulnerabilidades de código fuente, solo de dependencias' },
    ],
    explanation: 'En GitHub Actions, los jobs usan `needs:` para declarar dependencias de otros jobs. Si el job "security" (SCA) falla, los jobs downstream que lo necesitan nunca se ejecutan — aparecen como "skipped" en la interfaz real y como BLOQUEADO en este simulador. FALLIDO significaría que el job se ejecutó y encontró un problema. BLOQUEADO significa que no se ejecutó porque un prerequisito falló primero.',
  },
  {
    id: 'lab3-scanner-vs-gate',
    question: '¿Qué convierte un scanner de seguridad en un Security Gate?',
    options: [
      { id: 'a', text: 'Que el scanner sea más rápido y tenga menor tasa de falsos positivos' },
      { id: 'b', text: 'Que el scanner esté integrado directamente en el IDE del desarrollador' },
      { id: 'c', text: 'La combinación de: scanner + política que define el umbral + enforcement que bloquea el merge si la política no se cumple', correct: true },
      { id: 'd', text: 'Que el scanner tenga un dashboard visual con historiales de alertas' },
    ],
    explanation: 'Un scanner detecta y reporta — genera información. Un Security Gate usa esa información para controlar si el cambio puede avanzar. Los tres elementos son necesarios: (1) el scanner genera el hallazgo, (2) la política define qué hallazgos activan el fallo, y (3) el enforcement bloquea físicamente el merge si el required status check falla. Sin los tres, tienes visibilidad pero no control.',
  },
  {
    id: 'lab4-sca-limitation',
    question: '¿Cuál es la limitación principal de SCA (npm audit) como control de seguridad?',
    options: [
      { id: 'a', text: 'Es demasiado lento — puede tardar horas en analizar proyectos grandes' },
      { id: 'b', text: 'Solo funciona con JavaScript, no con otros lenguajes como Python o Java' },
      { id: 'c', text: 'Solo detecta vulnerabilidades ya documentadas en bases de datos conocidas — no detecta zero-days ni paquetes maliciosos sin CVE registrado', correct: true },
      { id: 'd', text: 'Requiere conexión a internet en tiempo real y no puede ejecutarse en entornos aislados' },
    ],
    explanation: 'SCA correlaciona el árbol de dependencias contra bases de datos de vulnerabilidades conocidas (NVD, GitHub Advisory Database). Su fortaleza es también su límite: si la vulnerabilidad no está documentada, no puede detectarla. Un paquete malicioso nuevo publicado ayer, o una vulnerabilidad zero-day en una dependencia legítima, pasarán SCA sin problema. Por eso SCA es un control necesario pero no suficiente.',
  },
  {
    id: 'lab5-blast-radius',
    question: 'Con `permissions: write-all` en el workflow, ¿qué capacidad adicional relevante obtiene una GitHub Action comprometida comparado con `permissions: contents: read`?',
    options: [
      { id: 'a', text: 'Puede ejecutar código más rápido porque tiene más recursos de CPU asignados' },
      { id: 'b', text: 'Puede modificar potencialmente ramas, releases e issues del propio repositorio', correct: true },
      { id: 'c', text: 'Puede acceder a repositorios privados de otras organizaciones de GitHub' },
      { id: 'd', text: 'Puede desactivar los required status checks configurados en Branch Protection' },
    ],
    explanation: 'El GITHUB_TOKEN define el alcance del workflow dentro del propio repositorio. Con write-all, una Action comprometida puede crear releases, modificar issues, hacer push a ramas no protegidas, modificar el wiki, y más. Con contents: read, solo puede leer el código. El blast radius — el impacto potencial si el workflow es comprometido — es directamente proporcional a los permisos declarados.',
  },
  {
    id: 'lab7-textcontent',
    question: '¿Por qué usar `textContent` en lugar de `innerHTML` protege contra DOM-based XSS?',
    options: [
      { id: 'a', text: 'Porque textContent es más rápido y el navegador omite el parsing de seguridad' },
      { id: 'b', text: 'Porque textContent escapa automáticamente < > & " antes de insertar el texto' },
      { id: 'c', text: 'Porque el navegador trata el contenido de textContent como texto puro — no lo parsea como HTML ni ejecuta scripts embebidos', correct: true },
      { id: 'd', text: 'Porque textContent solo acepta strings ASCII y rechaza caracteres especiales' },
    ],
    explanation: 'Con innerHTML, el navegador parsea el contenido como HTML — si el string contiene <script>alert()</script>, el navegador lo puede interpretar y ejecutar. Con textContent, el contenido se inserta literalmente como texto: <script> se muestra como texto visible en pantalla, no como HTML. No es un mecanismo de escape — es una diferencia fundamental en cómo el navegador interpreta el contenido.',
  },
  {
    id: 'lab8-architecture',
    question: 'En el diagrama de arquitectura, ¿qué zona tiene mayor exposición a amenazas externas que el equipo no controla directamente?',
    options: [
      { id: 'a', text: 'Entorno del Desarrollador — porque es donde se origina todo el código' },
      { id: 'b', text: 'Plataforma GitHub — porque almacena el código fuente y la configuración' },
      { id: 'c', text: 'GitHub Actions Runner — porque ejecuta código de terceros (Actions del marketplace) con identidad y permisos propios', correct: true },
      { id: 'd', text: 'Entorno de Despliegue — porque es la zona pública accesible a usuarios finales' },
    ],
    explanation: 'El Runner ejecuta código que puede provenir de terceros — cualquier Action del marketplace. Cada Action usada es código externo que corre en el contexto del workflow, con acceso al GITHUB_TOKEN y a los secretos configurados para ese job. Si una Action es comprometida (ataque de supply chain), tiene acceso a todos los recursos dentro del alcance del token. Es donde la cadena de suministro de software impacta más directamente la seguridad del pipeline.',
  },
  {
    id: 'lab9-block-controls',
    question: 'Después de revisar la Matriz de Controles, ¿cuántos controles de los 10 tienen una decisión que incluye BLOCK?',
    options: [
      { id: 'a', text: '3 controles' },
      { id: 'b', text: '4 controles' },
      { id: 'c', text: '5 controles', correct: true },
      { id: 'd', text: '7 controles' },
    ],
    explanation: 'Los 5 controles con decisión BLOCK son: SCA (ALLOW/BLOCK), SAST (ALLOW/BLOCK), Secret Scanning (ALLOW/BLOCK), Branch Protection (ALLOW/BLOCK), y Deploy (DEPLOY/BLOCK). Los demás tienen decisiones distintas: ESLint y Pruebas tienen PASS/FAIL, Code Review tiene APROBAR/RECHAZAR, Dependabot tiene PR/ALERTA, y Least Privilege tiene LIMITAR. La diferencia importa: BLOCK significa que el control puede prevenir físicamente que un cambio avance.',
  },
  {
    id: 'lab11-kill-chain',
    question: 'Analizaste 4 fases de un ataque en cadena. ¿Qué decisión, tomada antes de que comenzara el ataque, habría detenido la cadena en la fase más temprana posible?',
    options: [
      { id: 'a', text: 'Haber activado Secret Scanning con Push Protection para bloquear tokens hardcodeados' },
      { id: 'b', text: 'Haber aplicado SHA pinning en todas las GitHub Actions de terceros del workflow' },
      { id: 'c', text: 'Haber configurado SCA como Security Gate (required status check que bloquea el merge) con umbral HIGH', correct: true },
      { id: 'd', text: 'Haber declarado permissions: contents: read en el workflow de deploy' },
    ],
    explanation: 'La cadena comenzó en la Fase 1: una dependencia con CVE HIGH fue mergeada porque SCA era solo un scanner informativo — no un Security Gate. Si el merge hubiera requerido que SCA pasara (required status check), la dependencia vulnerable no habría llegado a producción y las fases 2, 3 y 4 no habrían ocurrido con el mismo vector. Secret Scanning (A) resuelve la Fase 3, SHA pinning (B) resuelve la Fase 4, y Least Privilege (D) limita el blast radius de la Fase 4 — pero ninguno detiene el ataque en la fase más temprana de la cadena.',
  },
  {
    id: 'lab10-synthesis',
    question: 'Cuando Secret Scanning (Push Protection) bloquea un push con un token detectado, ¿cuál es la acción MÁS urgente?',
    options: [
      { id: 'a', text: 'Eliminar el archivo con el secreto, hacer commit y push inmediatamente' },
      { id: 'b', text: 'Cambiar el nombre del archivo o moverlo a otro directorio para evitar la detección' },
      { id: 'c', text: 'Revocar el token inmediatamente en el proveedor, aunque el push haya sido bloqueado', correct: true },
      { id: 'd', text: 'Contactar al administrador para desactivar temporalmente Push Protection y subir el archivo' },
    ],
    explanation: 'Aunque el push fue bloqueado, el secreto puede haber sido copiado — por el IDE, herramientas de build locales, o simplemente porque ya existe en la máquina del desarrollador. La revocación inmediata en el proveedor invalida el token independientemente de cómo fue creado o copiado. Eliminar el archivo sin revocar el token no protege si el token ya está en manos de un atacante.',
  },
  // ── Preguntas originales (mantenidas para compatibilidad) ───────────
  {
    id: 'blast-radius',
    question: 'Una GitHub Action de terceros es comprometida. El workflow usa permissions: write-all. ¿Qué aumenta principalmente el radio de impacto potencial?',
    options: [
      { id: 'a', text: 'La cantidad de archivos CSS en el repositorio' },
      { id: 'b', text: 'Los permisos excesivos del workflow', correct: true },
      { id: 'c', text: 'La cantidad de pruebas unitarias escritas' },
      { id: 'd', text: 'El nombre de la rama de feature' },
    ],
    explanation: 'Una Action comprometida ejecuta código dentro del contexto del workflow y puede heredar los permisos del GITHUB_TOKEN disponibles. Cuanto más amplios sean los permisos declarados, mayor es el impacto potencial sobre los recursos del repositorio. Este es el principio de Least Privilege aplicado al pipeline.',
  },
  {
    id: 'green-pipeline',
    question: '¿Qué demuestra realmente un pipeline verde (todos los checks pasan)?',
    options: [
      { id: 'a', text: 'El software no tiene vulnerabilidades de seguridad' },
      { id: 'b', text: 'El software está listo y es seguro para producción' },
      { id: 'c', text: 'Los controles configurados no detectaron condiciones de fallo', correct: true },
      { id: 'd', text: 'El código fue auditado por expertos de seguridad' },
    ],
    explanation: 'Un pipeline verde confirma que los controles configurados se ejecutaron y no detectaron condiciones de fallo dentro de su alcance. No garantiza ausencia de vulnerabilidades, especialmente zero-days, problemas de diseño, vectores no cubiertos por los controles, o vulnerabilidades introducidas después del análisis.',
  },
  {
    id: 'scanner-vs-gate',
    question: '¿Cuál es la diferencia principal entre un scanner y un Security Gate?',
    options: [
      { id: 'a', text: 'Un scanner es más rápido que un Security Gate' },
      { id: 'b', text: 'Un scanner genera información; un Security Gate usa esa información para controlar si el cambio puede avanzar', correct: true },
      { id: 'c', text: 'Un Security Gate es un tipo de scanner más avanzado' },
      { id: 'd', text: 'No existe diferencia — son términos equivalentes' },
    ],
    explanation: 'Un scanner detecta y reporta. Un Security Gate combina un scanner + una política + enforcement. npm audit por sí solo es un scanner. npm audit con --audit-level=high que hace fallar el job, combinado con un required status check que bloquea el merge, es un Security Gate.',
  },
  {
    id: 'shift-left',
    question: '¿Por qué "Shift Left" no elimina la necesidad de controles en producción (Shift Right)?',
    options: [
      { id: 'a', text: 'Porque Shift Left solo aplica a proyectos pequeños' },
      { id: 'b', text: 'Porque los controles de CI son demasiado lentos para usarse en producción' },
      { id: 'c', text: 'Porque algunos riesgos solo se manifiestan en runtime o en producción, y el estado del sistema cambia continuamente', correct: true },
      { id: 'd', text: 'Porque los equipos no tienen tiempo para implementar Shift Left correctamente' },
    ],
    explanation: 'Shift Left mueve controles hacia etapas tempranas del SDLC para detectar problemas antes de que sean costosos. Pero el sistema en producción está expuesto a condiciones que no existen en CI: tráfico real, configuraciones de entorno, nuevas vulnerabilidades publicadas después del despliegue, y comportamientos emergentes. Shift Right (monitoreo, DAST, runtime security) cubre ese espacio.',
  },
];

export function evaluateThreatChallenge(threatId, selectedControls) {
  const scenario = THREAT_SCENARIOS.find(s => s.id === threatId);
  if (!scenario) return null;

  const allRelevant = [...scenario.primaryControls, ...scenario.complementaryControls];
  const primaryHit = scenario.primaryControls.some(c => selectedControls.includes(c));
  const allSelected = selectedControls.every(c => allRelevant.includes(c));

  return {
    threatId,
    primaryControls: scenario.primaryControls,
    complementaryControls: scenario.complementaryControls,
    primaryHit,
    allSelected,
    explanation: scenario.explanation,
    limitations: scenario.limitations,
  };
}

export function checkQuizAnswer(questionId, answerId) {
  const question = QUIZ_QUESTIONS.find(q => q.id === questionId);
  if (!question) return null;

  const selectedOption = question.options.find(o => o.id === answerId);
  const correct = selectedOption?.correct === true;

  return {
    questionId,
    answerId,
    correct,
    explanation: question.explanation,
  };
}
