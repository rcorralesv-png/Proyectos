# Modelo de Amenazas — Hello Secure World Pipeline

Sistema modelado: pipeline CI/CD de GitHub Actions + aplicación estática en GitHub Pages.

---

## Metodología

Este modelo sigue la estructura:
**Amenaza → Activo → Vector → Impacto → Control → Detección → Decisión → Riesgo Residual**

Los escenarios están ordenados por probabilidad de ocurrencia en repositorios reales.

---

## Escenario 1 — Dependencia vulnerable introducida vía PR

| Campo | Detalle |
|---|---|
| **Amenaza** | Dependencia npm con CVE conocido introducida al repositorio |
| **Activo** | Árbol de dependencias del proyecto (`package-lock.json`) |
| **Vector** | PR que actualiza o agrega una dependencia afectada |
| **Impacto** | Código vulnerable llega a producción si no hay control; desde disclosure hasta ejecución remota según el CVE |
| **Control** | SCA — `npm audit --audit-level=high` en el job `security` de `ci.yml` |
| **Detección** | npm Advisory Database — CVE publicados con severidad CVSS |
| **Decisión** | BLOCK: exit code 1 + Required Status Check + Branch Protection = PR no puede mergearse |
| **Riesgo Residual** | Dependencias con vulnerabilidades sin CVE publicado no son detectadas. Días cero. Dependencias transitivas complejas. |

---

## Escenario 2 — Secreto committado al repositorio

| Campo | Detalle |
|---|---|
| **Amenaza** | Credencial o token sensible incluido en el código fuente |
| **Activo** | API keys, tokens de acceso, credenciales de servicios externos |
| **Vector** | `git commit` + `git push` con secreto en cualquier archivo del repositorio |
| **Impacto** | Acceso no autorizado al servicio o recurso protegido por el secreto; el historial de git conserva el secreto incluso después de eliminarlo |
| **Control** | GitHub Secret Scanning + Push Protection (configuración del repositorio) |
| **Detección** | Patrones de tokens conocidos (GitHub, AWS, Google, etc.) + análisis de entropía |
| **Decisión** | BLOCK: Push Protection previene el push (modo preventivo) o ALERT: detección post-push (modo detective) |
| **Riesgo Residual** | Secretos con formato personalizado no detectados. Secretos de baja entropía. Secretos en archivos binarios o comprimidos. |

---

## Escenario 3 — PR con código malicioso camuflado

| Campo | Detalle |
|---|---|
| **Amenaza** | Contribuidor malintencionado o comprometido envía código con payload oculto |
| **Activo** | Código fuente de la aplicación; lógica de negocio |
| **Vector** | PR con cambios que pasan los checks automáticos pero contienen lógica maliciosa sutil |
| **Impacto** | Backdoor en producción; exfiltración de datos; comportamiento no autorizado del sistema |
| **Control** | Code Review humano requerido (Branch Protection: "Required reviews: 1") + SAST (CodeQL) |
| **Detección** | Revisión manual de la lógica del código; CodeQL para patrones de vulnerabilidades conocidos |
| **Decisión** | REJECT: el revisor puede rechazar el PR; BLOCK: SAST puede detectar patrones inseguros |
| **Riesgo Residual** | Un revisor comprometido o distraído puede aprobar código malicioso. SAST detecta patrones conocidos, no lógica de negocio maliciosa arbitraria. |

---

## Escenario 4 — Workflow modificado para escalar permisos

| Campo | Detalle |
|---|---|
| **Amenaza** | Modificación del YAML del workflow para obtener permisos más amplios o ejecutar código no autorizado |
| **Activo** | Archivos `.github/workflows/*.yml`; GITHUB_TOKEN con permisos ampliados |
| **Vector** | PR que modifica un archivo de workflow añadiendo `permissions: write-all` o steps maliciosos |
| **Impacto** | El workflow comprometido puede escribir en el repositorio, publicar packages, leer secretos, crear releases |
| **Control** | Code Review requerido para cambios en `.github/workflows/`; Branch Protection; Least Privilege base |
| **Detección** | Revisión del diff del PR — cambios en workflows deben ser revisados con especial atención |
| **Decisión** | REJECT: revisión manual identifica y rechaza el cambio |
| **Riesgo Residual** | Reviewer no familiarizado con la semántica del YAML de Actions puede no detectar el cambio malicioso. |

---

## Escenario 5 — GitHub Action de terceros comprometida

| Campo | Detalle |
|---|---|
| **Amenaza** | Una Action pública usada en el workflow es comprometida por el atacante (supply chain) |
| **Activo** | GITHUB_TOKEN; código fuente ejecutado en el runner; secretos accesibles en el runner |
| **Vector** | El mantenedor de la Action es comprometido; la acción es typosquatted; el tag mutable apunta a código malicioso |
| **Impacto** | La Action comprometida ejecuta código arbitrario en el runner con acceso al GITHUB_TOKEN y a los secretos del workflow |
| **Control** | Least Privilege (`permissions: contents: read`); SHA pinning; usar solo Actions de publishers verificados |
| **Detección** | Difícil de detectar en tiempo real; Dependabot puede alertar sobre cambios en Actions usadas |
| **Decisión** | LIMIT: Least Privilege limita el blast radius aunque la Action sea comprometida |
| **Riesgo Residual** | Con `contents: read`, la Action comprometida puede leer el código pero no modificar el repositorio. Con permisos mayores, el impacto escala proporcionalmente. SHA pinning no garantiza que el código sea seguro — solo que no cambia. |

---

## Escenario 6 — Bypass de Branch Protection

| Campo | Detalle |
|---|---|
| **Amenaza** | Cambio comprometido llega a main evitando los Required Status Checks o la revisión requerida |
| **Activo** | Rama `main` protegida; historial del repositorio |
| **Vector** | Cuenta de administrador comprometida (admins pueden bypassear Branch Protection); configuración incorrecta de las reglas |
| **Impacto** | Código no validado llega a producción; pipeline de despliegue es triggereado con código potencialmente malicioso |
| **Control** | Branch Protection con "Do not allow bypassing" activado; 2FA en cuentas de administrador |
| **Detección** | Auditoría del historial de commits en main; alertas de commits directos |
| **Decisión** | BLOCK: Branch Protection bloquea pushes directos cuando está correctamente configurado |
| **Riesgo Residual** | Configuración incorrecta de Branch Protection. Cuenta de admin comprometida con bypass activo. GitHub Enterprise Rulesets ofrecen mayor control. |

---

## Escenario 7 — Compromiso de la supply chain de dependencias

| Campo | Detalle |
|---|---|
| **Amenaza** | Paquete npm legítimo es comprometido en el registro (no CVE — el paquete mismo es malicioso) |
| **Activo** | `package-lock.json`; código ejecutado en el pipeline y en producción |
| **Vector** | Mantenedor del paquete comprometido publica nueva versión maliciosa; typosquatting de un paquete popular |
| **Impacto** | Código malicioso ejecutado en el runner y potencialmente en la aplicación desplegada |
| **Control** | Dependabot (alerta ante cambios inesperados); revisión de PRs de dependencias; npm audit (si hay CVE) |
| **Detección** | Si hay CVE: npm audit. Si no hay CVE: muy difícil de detectar automáticamente |
| **Decisión** | ALERT: Dependabot notifica sobre actualizaciones; la decisión de mergear es humana |
| **Riesgo Residual** | Un paquete comprometido sin CVE publicado puede no ser detectado por ningún scanner automatizado. Este es el escenario de supply chain más difícil de mitigar. |

---

## Escenario 8 — Compromiso de cuenta del desarrollador

| Campo | Detalle |
|---|---|
| **Amenaza** | Credenciales de un desarrollador del equipo son robadas o filtradas |
| **Activo** | Acceso al repositorio; capacidad de crear PRs y commits; secretos a los que el desarrollador tiene acceso |
| **Vector** | Phishing, credential stuffing, contraseña reutilizada filtrada, token robado |
| **Impacto** | El atacante puede crear PRs maliciosos, acceder al código, triggear workflows, leer Issues privados |
| **Control** | 2FA requerido para todos los miembros; GitHub token scoping; revisión de código por un segundo par de ojos |
| **Detección** | Alertas de acceso desde ubicaciones inusuales (GitHub Advanced Security) |
| **Decisión** | REQUIRE: 2FA como política de organización |
| **Riesgo Residual** | 2FA puede ser bypasseado con ataques de ingeniería social sofisticados (SIM swap, session hijacking). Un segundo revisor no siempre detectará cambios maliciosos sutiles. |

---

## Escenario 9 — CI deshabilita un control requerido

| Campo | Detalle |
|---|---|
| **Amenaza** | Un cambio en el workflow desactiva o debilita un Security Gate |
| **Activo** | Integridad del pipeline de CI; confianza en el proceso de validación |
| **Vector** | PR que cambia `--audit-level=high` a `--audit-level=critical`, comenta un step de análisis, o agrega `continue-on-error: true` |
| **Impacto** | Vulnerabilidades que antes serían bloqueadas ahora pasan; erosión silenciosa de la postura de seguridad |
| **Control** | Code Review que incluye revisión de cambios en `.github/workflows/`; política de organización para workflows |
| **Detección** | Revisión del diff — cambios en jobs de security son señales de alerta |
| **Decisión** | REJECT: revisión identifica el debilitamiento del control |
| **Riesgo Residual** | Un reviewer no familiarizado con el impacto de seguridad de los parámetros del CLI puede no detectar el cambio. |

---

## Escenario 10 — Pipeline verde con vulnerabilidad no detectada

| Campo | Detalle |
|---|---|
| **Amenaza** | El pipeline pasa todos los controles pero existe una vulnerabilidad real en el código |
| **Activo** | Aplicación desplegada; usuarios de la aplicación |
| **Vector** | Vulnerabilidad en lógica de negocio; patrón no cubierto por los scanners; vulnerabilidad en dependencia sin CVE publicado |
| **Impacto** | Sistema vulnerable en producción con falsa sensación de seguridad |
| **Control** | Ningún control único previene esto — es la limitación fundamental de los controles automáticos |
| **Detección** | DAST (Dynamic Application Security Testing) post-deploy; pruebas de penetración; bug bounty |
| **Decisión** | Este escenario ilustra el riesgo residual del sistema completo |
| **Riesgo Residual** | SIEMPRE presente. Un pipeline verde indica que los controles configurados no detectaron condiciones de fallo. No garantiza ausencia de vulnerabilidades. |

---

## Resumen de cobertura de controles

| Control | Escenarios mitigados |
|---|---|
| SCA (npm audit) | 1 (parcial), 7 (parcial) |
| Secret Scanning | 2 |
| Code Review | 3, 4, 9 |
| SAST (CodeQL) | 3 (parcial) |
| Branch Protection | 4, 6 |
| Least Privilege | 5 |
| Dependabot | 1, 7 |
| 2FA / Cuenta segura | 8 |

Ningún escenario tiene cobertura completa del 100%. Todos tienen riesgo residual documentado.
