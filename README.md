# Hello Secure World — CI/CD Security Fundamentals

**Módulo de laboratorio interactivo** · DevSecOps · GitHub Actions · 2 horas · 100 puntos

> Explora los controles de seguridad que protegen un pipeline moderno de CI/CD —
> no como conceptos abstractos, sino observándolos fallar, detectar y bloquear en tiempo real.

---

## Objetivos de aprendizaje

Al completar este módulo serás capaz de:

- Distinguir entre un **scanner** y un **Security Gate** y explicar por qué la diferencia importa
- Analizar el **blast radius** del `GITHUB_TOKEN` según los permisos declarados en un workflow
- Identificar vulnerabilidades mediante **SCA** (npm audit), **SAST** (CodeQL) y **Secret Scanning**
- Aplicar el principio de **mínimo privilegio** en workflows de GitHub Actions
- Reconocer vectores de ataque de **supply chain** en Actions de terceros
- Prevenir **DOM XSS** eligiendo `textContent` en lugar de `innerHTML`
- Trazar **trust boundaries** en arquitecturas CI/CD
- Verificar un reporte firmado con **HMAC-SHA256**

---

## Prerequisitos

| Requisito | Nivel |
|-----------|-------|
| Cuenta de GitHub | Requerido |
| Git básico (commit, push, pull request) | Requerido |
| JavaScript básico (variables, funciones) | Requerido |
| Node.js 18+ | Solo para práctica real |

---

## Estructura del módulo

| Unidad | Concepto | Tiempo | Puntos |
|--------|----------|--------|--------|
| Introducción | Bienvenida y objetivos | 5 min | — |
| Configuración | Abrir el simulador | 3 min | — |
| **Lab 1** | Pipeline CI/CD — qué garantiza un pipeline verde | 6 min | 8 pts |
| **Lab 2** | Security Gate SCA — efectos en cadena | 8 min | 10 pts |
| **Lab 3** | Scanner ≠ Gate — la diferencia es el enforcement | 6 min | 10 pts |
| **Lab 4** | Control Explorer — limitaciones de SCA | 6 min | 8 pts |
| **Lab 5** | Blast Radius — GITHUB_TOKEN y mínimo privilegio | 7 min | 10 pts |
| **Lab 6** | Ataque → Defensa — threat challenge supply chain | 10 min | 16 pts |
| **Lab 7** | DOM XSS — `textContent` vs `innerHTML` | 6 min | 10 pts |
| **Lab 8** | Arquitectura — trust boundaries en CI/CD | 6 min | 10 pts |
| **Lab 9** | Matriz de Controles — 10 controles, 5 tipos de decisión | 6 min | 10 pts |
| **Lab 10** | Secret Scanning — respuesta ante tokens expuestos | 6 min | 8 pts |
| Práctica real | 3 escenarios en tu fork de GitHub | 30 min | — |
| Verificación | Reporte HMAC + código de servidor | 5 min | — |

**Total: ~120 min · 100 puntos**

---

## Preparar el ambiente local

> La **Parte 1** (simulador) solo necesita un navegador. Esta sección es necesaria para la **Parte 2** (práctica real en GitHub) y para verificar reportes como instructor.

### 1 — Instalar Git

Git es el sistema de control de versiones. Sin él, `git clone` y `git push` no existen.

**Windows**

1. Ve a [git-scm.com/download/win](https://git-scm.com/download/win) y descarga el instalador (64-bit).
2. Ejecútalo. En las pantallas del asistente, deja todo por defecto **excepto estos dos pasos**:
   - **"Choosing the default editor"** → selecciona *Notepad* o *Visual Studio Code* (evita Vim si no lo conoces).
   - **"Adjusting your PATH environment"** → asegúrate de que esté seleccionado *"Git from the command line and also from 3rd-party software"* (es el valor por defecto — solo confírmalo).
3. Haz clic en *Next* en el resto de pantallas y finaliza la instalación.
4. **Abre una terminal nueva** (PowerShell o CMD) y verifica:

```
git --version   # debe mostrar git version 2.x.x
```

5. Configura tu identidad (requerida para hacer commits):

```
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

**macOS**

```bash
# Xcode Command Line Tools incluye git
xcode-select --install

git --version
```

**Linux (Ubuntu / Debian)**

```bash
sudo apt-get update
sudo apt-get install -y git

git --version
```

---

### 2 — Instalar Node.js 20 LTS

Node.js incluye `npm` (el gestor de paquetes). Es necesario para instalar dependencias, correr pruebas y verificar reportes.

**Windows**

1. Ve a [nodejs.org/en/download](https://nodejs.org/en/download).
2. Descarga el instalador **LTS** para Windows (64-bit) — el archivo termina en `.msi`.
3. Ejecútalo. En el asistente:
   - Acepta el acuerdo de licencia.
   - Deja la ruta de instalación por defecto (`C:\Program Files\nodejs\`).
   - En **"Custom Setup"**, deja todos los componentes marcados — especialmente *"Add to PATH"*.
   - En la pantalla **"Tools for Native Modules"**, **NO marques** la casilla "Automatically install the necessary tools" a menos que lo necesites para otros proyectos. Para este laboratorio no hace falta.
4. Haz clic en *Install* y espera a que termine.
5. **Cierra todas las terminales abiertas y abre una nueva.** El PATH se actualiza solo al abrir una terminal nueva.
6. Verifica:

```
node --version   # debe mostrar v20.x.x o v18.x.x
npm --version    # debe mostrar 9.x o superior
```

> **Problema frecuente**: si `node` no se reconoce después de instalar, cierra y vuelve a abrir la terminal. Si persiste, busca "Editar las variables de entorno del sistema" en Windows, abre *Variables de entorno* y verifica que `C:\Program Files\nodejs\` esté en la variable `Path`.

**macOS**

```bash
# Con Homebrew (recomendado)
brew install node@20
brew link node@20 --force

node --version
npm --version
```

Si no tienes Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

**Linux (Ubuntu / Debian)**

```bash
# NodeSource — repositorio oficial mantenido por el equipo de Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version
npm --version
```

---

### 2 — Clonar y preparar el repositorio

```bash
# Reemplaza TU_USUARIO con tu nombre de usuario de GitHub
git clone https://github.com/TU_USUARIO/Helllo-Secure-World.git
cd Helllo-Secure-World

# Instalar dependencias de desarrollo
npm install

# Verificar que todo funciona
npm test        # debe mostrar 33 tests passed
npm run lint    # debe mostrar 0 errors
npm run security  # debe mostrar found 0 vulnerabilities
```

Si alguno de los tres comandos falla, revisa que Node.js sea 18 o superior antes de continuar.

---

### 3 — Estructura de comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `npm test` | Ejecuta las 33 pruebas unitarias con Vitest |
| `npm run lint` | Verifica calidad de código con ESLint |
| `npm run security` | Audita dependencias con `npm audit --audit-level=high` |
| `npm run check` | Los tres anteriores en secuencia |
| `node practice/verify-report.js HSW-...` | Verifica un reporte de estudiante (instructores) |

---

## Parte 1 — Simulador interactivo

### Abrir el laboratorio

👉 **[hello-secure-world.github.io](https://neavus-23.github.io/Helllo-Secure-World/)**

No requiere instalación ni login. Abre en el navegador, regístrate con tu nombre y usuario de GitHub, y avanza los 10 labs en orden.

### Cómo funciona

Cada laboratorio tiene dos fases:

1. **Interacción requerida** — ejecutas una simulación (pipeline, controles, diagrama) hasta completar la actividad específica. La pregunta permanece bloqueada hasta entonces.
2. **Pregunta de comprensión** — seleccionas la respuesta correcta y envías. Los puntos se registran y no puedes volver al lab anterior.

### Reporte final

Al completar los 10 labs, el simulador genera un código como este:

```
HSW-eyJuIjoiQW5hIEdhcmPDrWEiLCJnIjoiYW5hZ2FyY2lhIiwic... -a3f7d2e1b8c09541
```

Este código contiene un payload JSON firmado con HMAC-SHA256 que incluye tu nombre, usuario de GitHub, puntos por lab y timestamp. Compártelo con tu instructor.

---

## Parte 2 — Práctica real en GitHub

Los tres escenarios te ponen frente a los sistemas reales de GitHub, no simulaciones.

### Preparación (una vez)

```bash
# Fork el repositorio en GitHub, luego:
git clone https://github.com/TU_USUARIO/Helllo-Secure-World.git
cd Helllo-Secure-World
npm install
npm test  # 33/33 deben pasar
```

Configura tu fork siguiendo [`practice/SETUP.md`](practice/SETUP.md) — tarda ~10 minutos.

### Escenario 01 — SCA: Dependencia vulnerable

Introduce `lodash@4.17.4` (CVE-2020-8203, HIGH), abre un PR y observa cómo el job
`security / Verificar dependencias` falla. Luego actualiza a la versión segura.

```bash
git checkout -b lab/sca-vulnerable-dep
cp practice/scenarios/01-sca/package.json package.json
npm install
git add package.json package-lock.json
git commit -m "lab: introduce dependencia vulnerable para práctica SCA"
git push origin lab/sca-vulnerable-dep
# → Abre PR en GitHub y observa el fallo de CI
```

📋 Instrucciones detalladas: [`practice/scenarios/01-sca/INSTRUCTIONS.md`](practice/scenarios/01-sca/INSTRUCTIONS.md)

### Escenario 02 — Secret Scanning: Token en código

Intenta hacer push con un archivo que contiene un patrón `github_pat_` (inválido/revocado).
GitHub Push Protection bloquea el push antes de que llegue al historial.

```bash
git checkout -b lab/secret-scanning-demo
mkdir -p config
cp practice/scenarios/02-secret/config/settings.js config/settings.js
git add config/settings.js
git commit -m "lab: token para práctica Secret Scanning"
git push origin lab/secret-scanning-demo
# → GitHub bloquea el push con GH013
```

📋 Instrucciones detalladas: [`practice/scenarios/02-secret/INSTRUCTIONS.md`](practice/scenarios/02-secret/INSTRUCTIONS.md)

### Escenario 03 — SAST/CodeQL: DOM XSS

Agrega un archivo con `innerHTML` y entrada de usuario. CodeQL traza el flujo
`parámetro → template literal → innerHTML` y genera una alerta `js/xss`.

```bash
git checkout -b lab/codeql-xss-demo
cp practice/scenarios/03-xss/src/demo-insecure.js src/demo-insecure.js
git add src/demo-insecure.js
git commit -m "lab: ejemplo inseguro para práctica CodeQL"
git push origin lab/codeql-xss-demo
# → Abre PR y espera el análisis CodeQL (~10 min)
```

📋 Instrucciones detalladas: [`practice/scenarios/03-xss/INSTRUCTIONS.md`](practice/scenarios/03-xss/INSTRUCTIONS.md)

### Código de verificación del servidor

Cuando el PR de SCA tenga todos los checks en verde, el workflow `lab-validate.yml`
publica automáticamente un comentario con:

```
HSW-PRACTICE-XXXXXXXXXXXXXXXX
```

Este hash confirma que ejecutaste el workflow real en el servidor de GitHub.

---

## Verificar un reporte (instructores)

```bash
node practice/verify-report.js HSW-eyJuIjoiQW5h...

# ✅ REPORTE VERIFICADO
# ──────────────────────────────────────────────────
# Estudiante:    Ana García
# GitHub:        anagarcia
# Puntaje:       82 / 100 (82%) — Nota: B
# Fecha:         1 de septiembre de 2026, 15:32
#
# Desglose por lab:
#   ✓ Lab 1 — Pipeline verde: 8/8
#   ✗ Lab 2 — SCA bloquea SAST: 0/10
#   ...
```

---

## Repositorio

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci.yml           ← Calidad (ESLint) + Pruebas (Vitest) + SCA (npm audit)
│   │   ├── codeql.yml       ← SAST — GitHub CodeQL (JavaScript)
│   │   ├── deploy.yml       ← CD — GitHub Pages
│   │   └── lab-validate.yml ← Validación de escenarios de práctica
│   └── dependabot.yml
├── src/
│   ├── app.js               ← generateGreeting() — lógica pura sin DOM
│   ├── pipeline.js          ← runPipelineScenario() — 7 escenarios, 8 etapas
│   ├── controls.js          ← CONTROL_MATRIX, getControlDetails(), getBlastRadius()
│   ├── challenges.js        ← QUIZ_QUESTIONS, LAB6_THREAT_IDS, evaluateThreatChallenge()
│   ├── labs.js              ← 10 definiciones de lab con interacciones requeridas
│   ├── lab-engine.js        ← State machine: WELCOME → LAB → COMPLETE
│   ├── scoring.js           ← Anti-cheat: XOR encoding + HMAC-SHA256
│   └── main.js              ← Orquestador: builders de componentes
├── tests/
│   ├── app.test.js
│   ├── controls.test.js
│   └── pipeline.test.js
├── practice/
│   ├── README.md            ← Guía general de práctica real
│   ├── SETUP.md             ← Configuración del fork (Actions, Secret Scanning, CodeQL)
│   ├── verify-report.js     ← Verificador de reportes HSW para instructores
│   └── scenarios/
│       ├── 01-sca/          ← lodash@4.17.4 (CVE-2020-8203)
│       ├── 02-secret/       ← Token github_pat_ inválido
│       └── 03-xss/          ← innerHTML con entrada de usuario
├── index.html               ← Simulador de una sola página
├── styles.css
└── package.json
```

---

## Ejecutar localmente

```bash
npm ci           # Instalar dependencias
npm test         # 33 tests (Vitest)
npm run lint     # ESLint
npm run security # npm audit --audit-level=high
npm run check    # Los tres anteriores
```

Para abrir el simulador: abre `index.html` en el navegador. No requiere servidor.

---

## Stack técnico

| Componente | Tecnología |
|------------|------------|
| Aplicación | HTML5 + CSS + JavaScript ES2022 (sin frameworks) |
| Testing | Vitest |
| Linting | ESLint v9 flat config |
| SCA | npm audit |
| SAST | GitHub CodeQL |
| Deploy | GitHub Pages |

---

## Documentación adicional

- [`practice/README.md`](practice/README.md) — Guía de práctica real en GitHub
- [`practice/SETUP.md`](practice/SETUP.md) — Configurar fork con Branch Protection y security features
- [`SECURITY.md`](SECURITY.md) — Política de seguridad del repositorio
# Helllo-Secure-World
