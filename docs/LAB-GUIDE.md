# Guía del Estudiante — Hello Secure World
## Laboratorio de CI/CD y Seguridad DevSecOps

> **No se asume conocimiento previo de seguridad de software.**
> Si nunca has oído hablar de CI/CD, GitHub Actions, SAST, SCA o Least Privilege,
> esta guía explica cada concepto desde cero antes de pedirte hacer algo.

---

## ¿Qué vas a aprender hoy?

Al terminar este laboratorio vas a poder responder:

1. ¿Qué es un pipeline CI/CD y para qué sirve?
2. ¿Cuál es la diferencia entre un scanner de seguridad y un Security Gate?
3. ¿Qué controles de seguridad existen en un pipeline moderno y qué detecta cada uno?
4. ¿Qué es el GITHUB_TOKEN y por qué sus permisos importan para la seguridad?
5. ¿Cómo se ve una vulnerabilidad real en el contexto de un pipeline?
6. ¿Por qué un "pipeline verde" no garantiza que el software sea seguro?

---

## Conceptos base — léelos antes de empezar

### ¿Qué es un pipeline CI/CD?

**CI/CD** son las siglas de Continuous Integration / Continuous Delivery (o Deployment).
En español: Integración Continua / Entrega Continua.

Imagina que 5 personas están trabajando en el mismo proyecto de software.
Cada persona hace cambios en su computadora y eventualmente los sube al repositorio compartido.
¿Cómo saben si los cambios de una persona rompen el trabajo de otra?
¿Cómo saben si el código que van a publicar tiene errores o vulnerabilidades?

La respuesta tradicional: alguien lo revisa manualmente antes de publicar.
El problema: es lento, es inconsistente, depende del estado de ánimo y conocimiento de quien revisa.

**La solución:** un pipeline automatizado que corre una serie de verificaciones automáticas
cada vez que alguien propone un cambio. Si alguna verificación falla, el cambio no puede
avanzar hasta que se corrija.

Un pipeline típico hace algo así:
```
Alguien propone un cambio
        ↓
¿El código tiene errores de estilo o sintaxis? (Lint)
        ↓
¿El código hace lo que se supone que debe hacer? (Pruebas)
        ↓
¿Las dependencias del proyecto tienen vulnerabilidades conocidas? (SCA)
        ↓
¿El código tiene patrones de programación inseguros? (SAST)
        ↓
¿Un humano revisó y aprobó el cambio? (Code Review)
        ↓
El cambio llega al código principal (Merge)
        ↓
El software se publica automáticamente (Deploy)
```

Si cualquier paso falla, el proceso se detiene ahí. El cambio no puede avanzar.

### ¿Qué es GitHub Actions?

GitHub Actions es el sistema de automatización de GitHub que ejecuta los pipelines.
Cuando alguien sube cambios a un repositorio en GitHub, Actions detecta ese evento y ejecuta
un workflow — un archivo de configuración (en formato YAML) que describe qué hacer.

El workflow corre en una máquina virtual temporal llamada "runner". Esa máquina:
- Se crea nueva para cada ejecución (no hay estado previo)
- Tiene los mismos comandos que usarías en tu terminal
- Se destruye al terminar la ejecución

```yaml
# Ejemplo simplificado de un workflow
name: Mi pipeline
on: push          # Corre cuando alguien hace git push

jobs:
  verificar:
    runs-on: ubuntu-latest    # Máquina virtual Linux
    steps:
      - uses: actions/checkout@v4   # Descarga el código
      - run: npm test               # Corre las pruebas
```

### ¿Qué es un "control de seguridad"?

Un control de seguridad es cualquier mecanismo técnico o proceso que reduce un riesgo de seguridad.
En el contexto de un pipeline CI/CD, los controles son las herramientas y configuraciones que
detectan o previenen problemas antes de que el código llegue a producción.

Cada control tiene:
- **Una amenaza que aborda:** ¿qué tipo de problema detecta?
- **Una técnica:** ¿cómo lo detecta?
- **Una política:** ¿qué resultado activa el fallo?
- **Una decisión:** ¿qué pasa cuando falla? ¿BLOCK? ¿ALERT?
- **Una limitación:** ¿qué no puede detectar?
- **Un riesgo residual:** ¿qué riesgo queda incluso cuando el control está activo?

La última parte es importante: **ningún control es perfecto**. Todos tienen limitaciones.
Saber cuáles son esas limitaciones es parte de pensar en seguridad honestamente.

---

## Lab 1 — Ejecuta el Pipeline Completo

### Objetivo
Entender la anatomía de un pipeline CI/CD: qué etapas tiene, qué hace cada una,
y cómo se conectan entre sí.

### ¿Qué significa cada etapa?

Antes de ejecutar, lee esto para saber qué verás:

**⚡ Evento PR**
Un Pull Request (PR) es una propuesta de cambio de código. El evento es lo que
dispara el pipeline — alguien propuso un cambio y el sistema reacciona automáticamente.

**🔍 Calidad (ESLint)**
ESLint es una herramienta que analiza el código JavaScript buscando problemas de estilo
y errores comunes. Por ejemplo: variables declaradas pero nunca usadas, uso de `eval()`,
funciones con nombres incorrectos. No busca vulnerabilidades de seguridad — su función
es mantener la calidad del código consistente.

**🧪 Pruebas (Vitest)**
Vitest ejecuta las pruebas unitarias del proyecto. Las pruebas verifican que el código
hace lo que se supone que debe hacer. Por ejemplo, verifican que la función `generateGreeting("Ana")`
devuelva exactamente `"¡Hola, Ana! Bienvenido al laboratorio de pipeline seguro."`.

**🔒 SCA (Software Composition Analysis)**
SCA analiza las dependencias del proyecto — las librerías de terceros que el proyecto usa.
Las compara contra una base de datos de vulnerabilidades conocidas (CVEs). Si alguna
dependencia tiene una vulnerabilidad con severidad HIGH o CRITICAL, este control falla.

> **CVE** son las siglas de Common Vulnerabilities and Exposures — un sistema estándar
> para nombrar y documentar vulnerabilidades de software conocidas. Cada CVE tiene
> un identificador único (ej: CVE-2024-12345) y un puntaje de severidad.

**🛡️ SAST (Static Application Security Testing)**
SAST analiza el código fuente que TÚ escribiste buscando patrones de programación inseguros.
En este proyecto, usamos CodeQL (de GitHub) que puede detectar cosas como:
- Flujos de datos de entrada del usuario hasta funciones peligrosas (DOM XSS)
- Posibles inyecciones de código
- Manejo inseguro de rutas de archivo

A diferencia de SCA, SAST no mira las dependencias — mira tu propio código.

**👁️ Revisión (Code Review)**
Un humano revisa el cambio propuesto. Esta etapa representa la revisión humana requerida
en Branch Protection. Es el único control donde interviene inteligencia humana.

**🔀 Merge**
El cambio llega a la rama `main` — el código principal del proyecto. Branch Protection
controla quién puede hacer esto y bajo qué condiciones (solo si todos los checks pasaron
y hubo una revisión aprobada).

**🚀 Deploy**
El software se publica automáticamente a GitHub Pages — el hosting estático de GitHub.
Esto es el "Continuous Deployment": si el código llegó a `main`, automáticamente llega
a los usuarios.

### Acción

1. Ve a la sección **"Ejecuta el Pipeline"** en la interfaz.
2. Selecciona **"✅ Construcción Exitosa"** en el dropdown.
3. Haz clic en **"▶ Ejecutar Pipeline"**.
4. Observa cómo cada etapa cambia de estado: **ESPERANDO → EJECUTANDO → APROBADO**.
5. Lee los logs en la consola del pipeline mientras aparecen — nota los prefijos de color
   `[QUALITY]`, `[TEST]`, `[SCA]`, `[SAST]`, `[MERGE]`, `[DEPLOY]`.

### Lo que deberías ver

Todas las etapas terminan con el badge verde **✓ Aprobado**. El pipeline llega hasta Deploy.

### Reflexiona

> ¿Qué garantiza que todas las etapas estén en verde?
> Garantiza que **los controles configurados no detectaron condiciones de fallo**.
> No garantiza que el software esté libre de vulnerabilidades.
> Esa distinción es fundamental — la exploraremos más adelante.

### Haz clic en una etapa

Cuando el pipeline termina, haz clic en la etapa **SCA** (el candado 🔒).
Se abre un panel con el modelo completo de ese control. Lee los campos:
- **Amenaza:** qué problema aborda
- **Política:** qué regla activa el fallo
- **Decisión:** qué pasa cuando detecta algo
- **Limitación:** qué no puede detectar
- **Riesgo Residual:** qué riesgo queda activo incluso con este control

---

## Lab 2 — Observa un Security Gate en Acción

### Conceptos previos: ¿qué es un Security Gate?

Esta es **la distinción más importante del laboratorio**.

Un **scanner** es una herramienta que analiza y produce un reporte:
> "La dependencia `demo-package@1.0.0` tiene CVE-2024-1234 con severidad HIGH."

Un **Security Gate** es un mecanismo que usa ese reporte para controlar si el cambio puede avanzar:
> "Porque el scanner reportó HIGH, el merge está bloqueado hasta que se corrija."

La diferencia crucial: un scanner solo te avisa. Un Security Gate actúa.

Para que un control sea un Security Gate, necesita **tres elementos**:
1. **El scanner** que detecta el problema
2. **Una política** que define qué resultados generan un fallo (ej: `--audit-level=high`)
3. **Un mecanismo de enforcement** que aplique la política (Branch Protection + Required Status Checks)

Si falta cualquiera de los tres, tienes visibilidad pero no control.

**Ejemplo concreto de cómo funciona en este proyecto:**
```
npm audit --audit-level=high
    ↓ encuentra CVE HIGH
    ↓ termina con exit code 1 (error)
    ↓ GitHub Actions interpreta: job FAILED
    ↓ El check "security" aparece como fallido en el PR
    ↓ Branch Protection tiene "security" como Required Status Check
    ↓ GitHub bloquea el merge mientras haya required checks fallidos
```

Cada eslabón de esa cadena es necesario. Si `--audit-level=high` no estuviera,
`npm audit` siempre terminaría con exit code 0 (éxito) aunque encontrara CVEs.
Si "security" no fuera un Required Status Check, el PR podría mergearse con el check rojo.

### Acción

1. Cambia el escenario a **"🔒 Dependencia Vulnerable"**.
2. Haz clic en **"▶ Ejecutar Pipeline"**.
3. Observa qué etapa falla y qué etapas quedan en **⛔ BLOQUEADO**.
4. Lee el panel de hallazgo que aparece — especialmente los campos **Política**, **Decisión** y **Riesgo Residual**.

### Lo que deberías ver

- **Evento PR**: ✓ Aprobado
- **Calidad**: ✓ Aprobado
- **Pruebas**: ✓ Aprobado
- **SCA**: ✗ Fallido — encontró una dependencia con CVE HIGH
- **SAST, Revisión, Merge, Deploy**: ⛔ Bloqueado

### Reflexiona

> Las pruebas pasaron. ESLint pasó. Pero el software tiene una vulnerabilidad.
> ¿Por qué pasaron las pruebas si hay una vulnerabilidad?
>
> Porque las pruebas unitarias verifican funcionalidad, no seguridad.
> Una función puede hacer exactamente lo que se supone que debe hacer
> y al mismo tiempo usar una dependencia con una vulnerabilidad conocida.
> Son preguntas distintas con herramientas distintas.

---

## Lab 3 — El Modelo Completo de un Control de Seguridad

### Conceptos previos: Amenaza → Control → Política → Decisión → Riesgo Residual

Cada control de seguridad tiene un propósito específico y limitaciones específicas.
Analizar un control honestamente significa incluir lo que NO puede hacer.

El modelo que usamos en este laboratorio tiene 5 elementos:

**Amenaza:** ¿qué tipo de ataque o problema aborda este control?
**Control:** ¿qué herramienta o mecanismo lo implementa?
**Política:** ¿qué regla exactamente activa el fallo?
**Decisión:** ¿qué pasa cuando el control detecta algo? ¿BLOCK? ¿APPROVE? ¿ALERT?
**Riesgo Residual:** ¿qué riesgo queda activo INCLUSO cuando el control está funcionando?

El riesgo residual siempre existe. Ningún control lo elimina todo.

### Acción

1. Ve a la sección **"Explorador de Controles de Seguridad"**.
2. Haz clic en la tarjeta **"Branch Protection"**.
3. Lee todos los campos del panel que se abre.
4. Cierra el panel (clic en ✕ o fuera del panel) y haz clic en **"CodeQL (SAST)"**.
5. Lee todos sus campos también.

### Puntos de aprendizaje

**Branch Protection — Riesgo Residual importante:**
Branch Protection protege la rama `main` de cambios no autorizados. Pero:
- Si la configuración tiene errores, deja pasar cambios que no debería
- Si la cuenta del administrador del repositorio es comprometida, el administrador
  puede bypassear Branch Protection
- No protege contra cambios maliciosos que pasan todos los controles automáticos

**CodeQL SAST — Limitaciones importantes:**
CodeQL analiza el código buscando patrones conocidos de vulnerabilidades. Pero:
- Solo detecta lo que está en su catálogo de queries
- Tiene falsos positivos (reporta problemas que no son reales)
- Tiene falsos negativos (no detecta vulnerabilidades que sí existen)
- No detecta vulnerabilidades de lógica de negocio que no coincidan con patrones conocidos

### Reflexiona

> ¿Por qué documentar las limitaciones de un control que estás usando?
>
> Porque si alguien del equipo asume que CodeQL detecta absolutamente todo,
> puede omitir controles complementarios creyendo que no hacen falta.
> Conocer las limitaciones te dice qué otros controles son necesarios
> para cubrir los gaps que deja cada uno.

---

## Lab 4 — Scanner ≠ Security Gate

### Conceptos previos: la cadena completa

Muchas organizaciones instalan scanners y asumen que tienen Security Gates.
Esta es una de las confusiones más comunes y peligrosas en DevSecOps.

La animación de este lab muestra la cadena completa de 6 pasos que se necesita
para que un scanner se convierta en un Security Gate. Observa que:
- Los primeros 2 pasos son el scanner funcionando
- El paso 3 es la política
- Los pasos 4–6 son el enforcement

Sin los pasos 4–6, el scanner corre pero no bloquea nada.

### Acción

1. Ve a la sección **"Scanner ≠ Security Gate"**.
2. Haz clic en **"▶ Animar el flujo"**.
3. Lee cada paso mientras aparece — no hagas clic en nada más hasta que aparezca el callout final.
4. Lee el callout final.

### Puntos de aprendizaje

**El exit code es el mecanismo técnico clave:**
Los programas en Unix/Linux terminan con un código de salida:
- Exit code `0`: todo bien
- Exit code `1` (o cualquier otro número): algo salió mal

GitHub Actions lee ese exit code para saber si un step pasó o falló.
`npm audit --audit-level=high` termina con exit code `1` cuando encuentra
vulnerabilidades de severidad HIGH o superior. Sin ese flag, siempre termina con `0`.

**El Required Status Check es la última pieza:**
GitHub no bloquea el merge automáticamente cuando un check falla.
Solo lo bloquea si ese check está configurado como "Required Status Check" en Branch Protection.
Esta configuración se hace en Settings → Branches en el repositorio de GitHub.

### Reflexiona

> Escenario: tienes `npm audit --audit-level=high` en tu pipeline, el check falla
> porque encontró una dependencia vulnerable, pero NO tienes ese check configurado
> como Required Status Check. ¿Qué pasa?
>
> Respuesta: el PR puede mergearse igual. El check aparece como rojo en la interfaz,
> pero GitHub no lo bloquea. Tienes un scanner. No tienes un Security Gate.

---

## Lab 5 — Ataque → Defensa

### Conceptos previos: por qué los controles son específicos

Cada control de seguridad aborda amenazas específicas. No son intercambiables.

| Control | ¿Qué detecta? | ¿Qué NO detecta? |
|---|---|---|
| ESLint | Errores de estilo y calidad de código | Vulnerabilidades de seguridad |
| Pruebas unitarias | Regresiones funcionales | Dependencias vulnerables |
| SCA (npm audit) | Dependencias con CVE publicados | Dependencias maliciosas sin CVE |
| SAST (CodeQL) | Patrones de código inseguros | Lógica de negocio maliciosa |
| Secret Scanning | Patrones conocidos de tokens/credenciales | Secretos con formato personalizado |
| Code Review | Problemas de lógica y diseño | Todo lo que el revisor no note |
| Branch Protection | Cambios sin revisión ni checks | Cambios maliciosos que pasaron todo |
| Least Privilege | Limita el daño si algo es comprometido | Prevenir el compromiso inicial |

Para cada amenaza, hay un control PRIMARIO (el diseñado específicamente para esa amenaza)
y controles COMPLEMENTARIOS (que ayudan pero no son suficientes solos).

### Acción

1. Ve a la sección **"Ataque → Defensa"**.
2. Para el escenario **"Dependencia npm con CVE conocida"**:
   - Selecciona los controles que crees que mitigan esta amenaza.
   - Haz clic en **"Evaluar selección"**.
   - Lee la explicación completa, especialmente la sección de Limitaciones.
3. Repite con **"API key hardcodeada en código fuente"**.
4. Repite con **"GitHub Action de terceros comprometida"**.

### Guía de análisis para cada escenario

**Dependencia npm con CVE conocida:**
- Control PRIMARIO: SCA (npm audit). Analiza específicamente el grafo de dependencias.
- SAST no ayuda aquí: SAST analiza tu código, no el código de las dependencias.
- Code Review puede detectarlo si el revisor conoce el paquete, pero no es sistemático.

**API key hardcodeada:**
- Control PRIMARIO: Secret Scanning con Push Protection.
  Detecta patrones de tokens conocidos y puede bloquear el push antes de que llegue al servidor.
- Code Review como complementario: el revisor puede notarlo, pero puede no ver el archivo o
  no reconocer el formato del token.
- SAST puede detectarlo si tiene reglas para strings que parecen credenciales, pero no es su función principal.

**GitHub Action de terceros comprometida:**
- Control PRIMARIO: Least Privilege (permissions: contents: read).
  Si la Action tiene permisos mínimos, el daño que puede hacer cuando es comprometida es mínimo.
- Nota: este es el único control que limita el daño DESPUÉS de que ocurre el compromiso.
  Los otros intentan prevenir que el código comprometido llegue al pipeline.

### Reflexiona

> En el escenario de la Action de terceros comprometida, ¿por qué los demás controles
> (SAST, SCA, Code Review) no son suficientes?
>
> Porque detectan problemas en el CÓDIGO DEL PROYECTO. La Action comprometida
> es código externo que se ejecuta en el runner del pipeline — está fuera del
> alcance del código que analizan esos controles.
> El único mecanismo que protege contra ese escenario es limitar qué puede hacer
> esa Action con el GITHUB_TOKEN — es decir, Least Privilege.

---

## Lab 6 — Radio de Impacto (Blast Radius)

### Conceptos previos: el GITHUB_TOKEN y la identidad del pipeline

Cuando GitHub Actions ejecuta un workflow, automáticamente crea una credencial temporal
llamada GITHUB_TOKEN. Esta credencial le permite al workflow interactuar con la API de GitHub.

**¿Por qué importa esto para la seguridad?**

Cualquier código que se ejecuta en el runner del pipeline tiene acceso potencial a ese token.
Esto incluye Actions de terceros que usas en tu workflow.

Si una Action de terceros es comprometida (el atacante modifica su código),
esa Action puede intentar usar el GITHUB_TOKEN para hacer cosas maliciosas.

**¿Qué puede hacer?** Depende de los permisos que declaraste en el workflow.

```yaml
# CON ESTO — el token puede escribir en todo el repositorio
permissions: write-all

# CON ESTO — el token solo puede leer el código
permissions:
  contents: read
```

**Least Privilege** es el principio de dar el mínimo permiso necesario para que algo funcione.
Aplicado al pipeline: cada workflow declara solo los permisos que necesita para su función.
Si el workflow solo necesita leer el código para analizarlo, solo debe tener `contents: read`.

El **blast radius** (radio de impacto) es cuánto daño puede hacer algo comprometido.
Con `write-all`, el blast radius es enorme. Con `contents: read`, es mínimo.

### Acción

1. Ve a la sección **"Radio de Impacto"**.
2. Lee la explicación del GITHUB_TOKEN (los 4 recuadros en la parte superior).
3. Observa el modo **"✓ Least Privilege"** — lee los permisos declarados y el impacto potencial.
4. Cambia a **"⚠ Permisos Excesivos"** — lee los mismos campos.
5. Responde la pregunta del quiz al final de la sección.

### Puntos de aprendizaje

**En el modo Least Privilege (`permissions: contents: read`):**
Una Action comprometida puede: leer el código fuente del repositorio.
Eso es todo. No puede modificar nada, no puede publicar nada, no puede leer secretos.

**En el modo Permisos Excesivos (`permissions: write-all`):**
Una Action comprometida puede: modificar archivos y crear commits, publicar releases,
sobreescribir secretos del repositorio, crear webhooks para exfiltrar datos futuros,
borrar ramas protegidas, publicar packages.

**El código del workflow es idéntico en ambos casos.**
La única diferencia es la declaración `permissions:`. Esa diferencia cambia radicalmente
el daño potencial si algo sale mal.

### Sobre los workflows de este proyecto

```yaml
# ci.yml — solo necesita leer el código para analizarlo
permissions:
  contents: read

# codeql.yml — necesita leer el código Y escribir alertas de seguridad
permissions:
  contents: read
  security-events: write

# deploy.yml — necesita leer el código, escribir en Pages, y autenticarse con OIDC
permissions:
  contents: read
  pages: write
  id-token: write
```

Cada workflow tiene exactamente los permisos que necesita. Nada más.

### Reflexiona

> Un pipeline no es solo código. Es código con identidad y con permisos.
> La seguridad del pipeline no depende solo de qué código se ejecuta —
> depende de qué puede hacer ese código con los recursos del repositorio.

---

## Lab 7 — Demo de Código Seguro (DOM XSS)

### Conceptos previos: ¿qué es XSS?

XSS (Cross-Site Scripting) es un tipo de vulnerabilidad web donde un atacante logra
que el navegador de otro usuario ejecute código JavaScript malicioso.

La variante que este lab demuestra se llama **DOM-based XSS**. Ocurre cuando:
1. La aplicación web toma un dato controlado por el usuario (ej: un campo de texto)
2. Lo inserta en el documento HTML usando `innerHTML`
3. El navegador interpreta ese HTML y ejecuta cualquier `<script>` dentro

**El problema técnico:**

```javascript
// INSEGURO — el navegador parsea el valor como HTML
elemento.innerHTML = 'Hola, ' + nombreDelUsuario;

// Si nombreDelUsuario es: <script>alert("XSS")</script>
// El navegador lo ejecuta y muestra la alerta
```

```javascript
// SEGURO — el navegador trata el valor como texto puro
elemento.textContent = 'Hola, ' + nombreDelUsuario;

// Si nombreDelUsuario es: <script>alert("XSS")</script>
// El navegador lo muestra literalmente como texto — no lo ejecuta
```

La diferencia es una sola palabra: `innerHTML` vs `textContent`.
Esa palabra determina si el navegador trata el contenido como HTML (parseable, ejecutable)
o como texto plano (literal, seguro).

**¿Por qué importa esto en el contexto del laboratorio?**
CodeQL (el SAST del proyecto) tiene una query específica llamada `js/xss` que detecta exactamente
este patrón: flujos de datos desde fuentes de entrada del usuario hasta `innerHTML`.
Si alguien cambiara `textContent` por `innerHTML` en este proyecto, CodeQL lo detectaría.

### Acción

1. Ve a la sección **"Demo de Interacción Segura con el DOM"**.
2. Escribe tu nombre en el campo de texto y haz clic en **"✉ Generar Saludo"**.
3. Observa el saludo y el estado de seguridad (✓ Entrada tratada como dato).
4. Haz clic en **"⚡ Probar XSS"** — el campo se llena automáticamente con `<script>alert("XSS")</script>`.
5. Haz clic en **"✉ Generar Saludo"** otra vez.
6. Observa que el texto aparece LITERALMENTE, no se ejecuta ninguna alerta.
7. Haz clic en **"❓ ¿Por qué importa esto?"** para leer la explicación.

### Lo que deberías observar

Después del paso 5, el output muestra:
```
¡Hola, <script>alert("XSS")</script>! Bienvenido al laboratorio de pipeline seguro.
```

Todo el texto de la etiqueta `<script>` aparece como texto visible — los navegadores
no pueden ejecutar código HTML que está en `textContent`, aunque parezca código.

### Mira el código fuente

El panel derecho muestra exactamente cómo está implementado:
```javascript
// La función solo trabaja con strings — no toca el DOM
export function generateGreeting(name) {
  const trimmed = String(name ?? '').trim();
  return trimmed
    ? `¡Hola, ${trimmed}! Bienvenido...`
    : '¡Hola! Bienvenido...';
}

// El uso seguro: textContent, nunca innerHTML
outputEl.textContent = generateGreeting(input);
```

La función `generateGreeting` no toca el DOM. Recibe un string y devuelve un string.
Eso la hace testeable fácilmente en Vitest, sin necesitar un navegador.
El único lugar donde toca el DOM es en el event handler, y usa `textContent`.

### Reflexiona

> ¿Una prueba unitaria de `generateGreeting()` detectaría esta vulnerabilidad
> si alguien cambiara `textContent` por `innerHTML`?
>
> No. La prueba unitaria verifica que la función devuelva el string correcto.
> No verifica cómo ese string es insertado en el DOM.
> Eso es exactamente para lo que existe SAST: analizar flujos de datos
> que las pruebas unitarias no pueden ver.

---

## Lab 8 — Arquitectura y Fronteras de Confianza

### Conceptos previos: Threat Modeling

**Threat Modeling** (modelado de amenazas) es el proceso de identificar sistemáticamente:
- ¿Dónde están los activos valiosos que queremos proteger?
- ¿Quién podría querer atacarlos y desde dónde?
- ¿Qué controles tenemos para protegerlos?
- ¿Qué riesgos quedan activos después de los controles?

Las **fronteras de confianza** son los puntos del sistema donde el control pasa de un
actor o componente a otro. En esos puntos, la confianza cambia — y esos puntos son
históricamente donde ocurren los ataques.

Por ejemplo:
- La frontera entre el desarrollador y GitHub: el código que existe en la laptop del
  desarrollador no está verificado aún. Cuando cruza esa frontera (git push),
  empieza el proceso de verificación.
- La frontera entre el workflow y el runner: código de terceros (Actions) se ejecuta
  aquí con acceso al GITHUB_TOKEN.

### Acción

1. Ve a la sección **"Arquitectura y Fronteras de Confianza"**.
2. Haz clic en la zona naranja/roja: **"GitHub Actions Runner"** (Frontera 3).
3. Lee los activos, amenazas y controles de esa zona.
4. Haz clic en **"Entorno de Despliegue"** (Frontera 4) y compara.

### Puntos de aprendizaje

**La zona del Runner (Frontera 3) es la más expuesta:**

Activos ahí: el código fuente, las dependencias, la configuración del workflow,
el GITHUB_TOKEN con sus permisos.

Amenazas específicas a esa zona:
- Una dependencia comprometida se ejecuta aquí durante `npm ci`
- Una GitHub Action de terceros se ejecuta aquí con acceso al token
- Un workflow modificado maliciosamente define qué corre aquí

Controles para esa zona:
- Least Privilege limita qué puede hacer el GITHUB_TOKEN
- SHA pinning reduce el riesgo de Actions modificadas silenciosamente
- Code Review del diff del workflow detecta cambios sospechosos

**La zona de Despliegue (Frontera 4) solo es accesible desde main protegida:**

El workflow de deploy solo corre cuando el código llega a `main`.
Para llegar a `main`, el código tuvo que pasar todos los controles anteriores.
Es la defensa en profundidad en acción — la última zona solo es alcanzable
si todas las capas anteriores han sido satisfechas.

### Reflexiona

> Mapea una amenaza específica de la lista de la zona Runner
> a su control de seguridad. ¿El control elimina completamente la amenaza
> o solo la mitiga? ¿Cuál es el riesgo residual?

---

## Lab 9 — Matriz de Controles de Seguridad

### Objetivo

Tener una vista comparativa de todos los controles y entender cómo se complementan.

### Acción

1. Ve a la sección **"Matriz de Controles de Seguridad"**.
2. Con el filtro **"Todos"**, observa cuántos controles tienen decisión BLOCK
   versus controles que solo reportan (PASS/FAIL sin bloquear).
3. Filtra por **"Gobernanza"** — lee las Limitaciones de Branch Protection y Code Review.
4. Filtra por **"Acceso"** — ¿qué hace diferente a Least Privilege del resto?

### Puntos de aprendizaje

**Tipos de decisión:**
- **PASS / FAIL:** el job de GitHub Actions pasa o falla. Si está configurado como Required Check, también bloquea el merge.
- **ALLOW / BLOCK:** específicamente bloquea el avance (SCA, SAST, Branch Protection).
- **APPROVE / REJECT:** una persona toma la decisión (Code Review).
- **LIMIT:** no bloquea, pero restringe el alcance del daño posible (Least Privilege).

**Lo que Least Privilege tiene de diferente:**
Los otros controles intentan DETECTAR o PREVENIR problemas.
Least Privilege LIMITA el daño si un problema ya ocurrió.
Es un control de tipo distinto — actúa cuando los demás fallaron.

### Reflexiona

> Mira las Limitaciones de Code Review y Branch Protection juntas.
> ¿Hay amenazas que ningún control automático puede mitigar completamente?
> ¿Cuál es la implicación de eso para cómo pensamos sobre la seguridad del pipeline?

---

## Lab 10 — El Escenario Más Crítico: Secreto Detectado

### Conceptos previos: por qué los secretos son especialmente peligrosos

Un "secreto" en el contexto de software es cualquier credencial que otorga acceso a un sistema:
API keys, tokens de autenticación, contraseñas, certificados, claves SSH.

Si un secreto llega al repositorio de código, el daño potencial es inmediato:
- Cualquier persona con acceso al repositorio puede verlo
- El historial de git preserva todos los commits — aunque elimines el secreto
  en el próximo commit, existió en el commit anterior y el historial lo recuerda
- Robots y bots escanean constantemente repositorios públicos en busca de secretos

**La solución al problema del historial:** rotar el secreto.
Rotar significa invalidar el secreto comprometido y generar uno nuevo.
No basta con borrarlo del código — hay que asumir que fue visto y asumir que fue usado.

**Push Protection vs Secret Scanning:**
- Secret Scanning (modo detective): detecta secretos DESPUÉS de que llegaron al repositorio y crea alertas.
- Push Protection (modo preventivo): intercepta el push ANTES de que llegue al servidor y lo bloquea.

Push Protection es más poderoso porque el secreto nunca llega al historial.

### Acción

1. Cambia el escenario a **"🔑 Secreto Detectado"**.
2. Haz clic en **"▶ Ejecutar Pipeline"**.
3. Observa en qué etapa falla (es la primera — Evento PR).
4. Lee el panel de hallazgo: severidad CRITICAL, y especialmente el Riesgo Residual.

### Lo que deberías ver

La etapa **Evento PR** falla con severidad **CRITICAL**.
Todas las demás etapas quedan **⛔ BLOQUEADO** — el pipeline ni siquiera llega a Calidad.

### Puntos de aprendizaje

**Por qué es CRITICAL y no solo HIGH:**
Un secreto filtrado no es solo una vulnerabilidad de código — es una llave entregada.
Cualquier persona que lo vea puede usarlo inmediatamente. La ventana de daño comienza
en el momento del push, no en el momento del exploit.

**El riesgo residual del Secret Scanning:**
Secret Scanning detecta patrones conocidos: tokens de GitHub, AWS, Google, Stripe, etc.
No detecta:
- Secretos con formato personalizado que no coinciden con ningún patrón
- Secretos con baja entropía (contraseñas cortas y simples)
- Secretos en archivos binarios o comprimidos

### Reflexiona

> Si un token de GitHub llegó a la rama main hace 3 commits y justo ahora lo detectas,
> ¿es suficiente con hacer un cuarto commit que lo elimine? ¿Por qué sí o por qué no?
>
> No es suficiente. El token existe en el commit 1 del historial de git.
> Eliminarlo en el commit 4 no borra el historial.
> La acción correcta es ROTAR el token — invalidarlo en GitHub y generar uno nuevo —
> asumiendo que estuvo expuesto desde el momento del commit 1.

---

## Resumen — Qué llevarte del laboratorio

### Los 5 conceptos más importantes

**1. Un pipeline seguro es una cadena de controles, no un solo control.**
Ningún control detecta todo. ESLint no detecta CVEs. SCA no detecta XSS. SAST no detecta
secretos. Cada uno cubre lo que los otros no pueden.

**2. Scanner ≠ Security Gate.**
Un scanner te avisa. Un Security Gate bloquea. La diferencia está en la política y en el enforcement.
Tener npm audit no significa tener un Security Gate de SCA.

**3. Todo control tiene riesgo residual.**
Un pipeline verde no prueba que el software sea seguro. Prueba que los controles configurados
no detectaron condiciones de fallo. Son cosas distintas.

**4. El pipeline tiene identidad y permisos.**
El GITHUB_TOKEN no es solo una credencial técnica — define qué puede hacer el pipeline
si algo en él es comprometido. Least Privilege reduce el blast radius.

**5. Los secretos en el historial son un problema permanente.**
Eliminar un secreto en el código no borra el historial. La respuesta correcta es rotar,
no solo borrar.

### La pregunta que deberías poder responder

Si alguien en tu futuro equipo dice:
> "Tenemos npm audit en el pipeline — ya tenemos Security Gate de dependencias."

Tú deberías poder responder:
> "¿Con qué `--audit-level`? ¿Ese check está configurado como Required Status Check
> en Branch Protection? ¿El pipeline tiene `permissions: contents: read` o `write-all`?
> ¿Dependabot actualiza las dependencias automáticamente?
> Si respondiste 'no sé' a cualquiera de esas preguntas, puede que tengas un scanner
> pero no un Security Gate completo."

---

## Glosario

| Término | Definición |
|---|---|
| CI/CD | Continuous Integration / Continuous Delivery — automatización del proceso de integrar y entregar código |
| Pipeline | Secuencia de jobs automatizados que el código debe pasar antes de llegar a producción |
| Runner | Máquina virtual temporal donde GitHub Actions ejecuta el workflow |
| Job | Grupo de steps dentro de un workflow |
| Required Status Check | Check de GitHub Actions marcado como obligatorio para poder mergear un PR |
| Branch Protection | Reglas de GitHub que controlan quién puede hacer qué en una rama específica |
| SAST | Static Application Security Testing — análisis estático del código fuente |
| SCA | Software Composition Analysis — análisis de dependencias de terceros |
| CVE | Common Vulnerabilities and Exposures — identificador estándar de vulnerabilidades conocidas |
| GITHUB_TOKEN | Credencial temporal generada por GitHub para cada ejecución de workflow |
| Least Privilege | Principio de dar el mínimo permiso necesario para una tarea |
| Blast Radius | Alcance del daño potencial si algo es comprometido |
| Secret Scanning | Control que detecta credenciales y tokens en el código fuente |
| Push Protection | Variante preventiva de Secret Scanning — bloquea el push antes de que llegue al servidor |
| Riesgo Residual | Riesgo que permanece activo incluso cuando los controles están funcionando |
| Defense in Depth | Principio de usar múltiples capas de control, cada una cubriendo lo que las otras no pueden |
| DOM XSS | Tipo de vulnerabilidad web donde código malicioso se ejecuta en el navegador vía innerHTML |
| textContent | Propiedad segura de DOM que trata el contenido como texto plano — no parsea HTML |
| innerHTML | Propiedad insegura de DOM cuando se usa con datos del usuario — parsea HTML y puede ejecutar scripts |
| OIDC | OpenID Connect — protocolo de autenticación que permite credenciales temporales sin secretos almacenados |
| SHA Pinning | Usar el hash exacto de una Action en lugar de un tag mutable para garantizar que no cambia |
| Dependabot | Servicio de GitHub que crea PRs automáticos para actualizar dependencias con vulnerabilidades |
