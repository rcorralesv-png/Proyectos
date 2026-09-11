# Guía del Instructor — Hello Secure World
## Edición Completa con Contexto, Guiones y Respuestas

> Esta guía asume que el instructor conoce los conceptos generales de software
> pero puede no tener experiencia profunda en DevSecOps o GitHub Actions.
> Cada sección incluye el CONTEXTO que necesitas para explicarlo con confianza,
> el GUIÓN sugerido, las PREGUNTAS que harán los estudiantes, y las RESPUESTAS exactas.

---

## Antes de la clase — preparación de 20 minutos

### Qué debes tener listo

1. **Abre el laboratorio en tu laptop:** `index.html` en un servidor local o browser.
2. **Ten GitHub abierto en otra pestaña** para mostrar ejemplos reales de workflows.
3. **Practica los 7 escenarios del pipeline** al menos una vez — el timing importa en clase.
4. **Lee esta guía completa** — especialmente las secciones "Qué significa esto realmente".

### Si algo sale mal técnicamente

- El pipeline no anima → recarga la página y espera 2 segundos antes de hacer clic.
- El panel de detalle no abre → haz clic directamente sobre el texto de la tarjeta.
- Los logs no aparecen → el escenario puede estar en ejecución. Haz clic en "↺ Reiniciar" primero.

---

## Contexto general — lo que necesitas saber antes de empezar

### ¿Qué es un pipeline CI/CD realmente?

Un pipeline CI/CD es simplemente una **secuencia de scripts automatizados** que se ejecutan
cada vez que alguien propone un cambio de código. Piénsalo como una lista de verificación
automática que el sistema corre sin intervención humana.

La "C" de CI significa Continuous Integration — integrar cambios frecuentemente y verificar
automáticamente que no rompan nada. La "D" de CD significa Continuous Delivery o Deployment —
entregar automáticamente el software verificado a los usuarios.

**Lo que la mayoría de la gente no sabe:** el pipeline no ejecuta magia. Ejecuta los mismos
comandos que ejecutarías en tu terminal: `npm install`, `eslint .`, `vitest run`, `npm audit`.
La diferencia es que los corre automáticamente, en un servidor limpio, con cada cambio de código,
y reporta el resultado de vuelta al sistema de control de versiones.

### ¿Qué hace que un pipeline sea "seguro"?

Un pipeline de CI/CD normal verifica que el código funcione. Un pipeline seguro también verifica:
- ¿El código tiene vulnerabilidades conocidas en sus dependencias?
- ¿El código tiene patrones de programación inseguros?
- ¿Alguna credencial o secreto está siendo filtrado?
- ¿El código puede ser integrado solo después de revisión humana?
- ¿El pipeline mismo tiene los permisos mínimos necesarios?

La diferencia entre "el pipeline corre" y "el pipeline es un control de seguridad" está en
configurar estas verificaciones Y en configurar que el código **no pueda avanzar** si fallan.
Esa última parte es la que la mayoría de los equipos omite.

---

## Plan de clase: 60 minutos (versión extendida)

| Tiempo | Actividad | Recurso |
|---|---|---|
| 0–5 min | Apertura: la pregunta del millón | Solo discusión |
| 5–18 min | Demo del pipeline: 3 escenarios en vivo | Lab — Sección Pipeline |
| 18–28 min | Scanner vs Gate: la distinción fundamental | Lab — Scanner ≠ Gate |
| 28–40 min | GITHUB_TOKEN y Least Privilege | Lab — Radio de Impacto |
| 40–50 min | Ejercicio grupal: Ataque → Defensa | Lab — Ataque → Defensa |
| 50–58 min | Cierre: lo que el pipeline verde realmente significa | Discusión |
| 58–60 min | Instrucciones para exploración autónoma | |

---

## Segmento 1 — Apertura (5 minutos)

### Tu objetivo
Generar disonancia cognitiva desde el primer minuto. Los estudiantes deben darse cuenta
de que asumen cosas que no saben.

### Guión sugerido

> "Antes de empezar, una pregunta directa: cuando dicen que algo está 'en producción',
> ¿qué controles pasó ese código antes de llegar ahí? ¿Cómo lo saben?
> No me digan lo que debería pasar — digan lo que realmente saben que pasó."

Pausa. Espera respuestas. Las respuestas típicas serán:
- "Pasó por revisión de código" — Bien. ¿Quién la hizo? ¿Con qué criterio?
- "Pasó las pruebas" — Bien. ¿Pruebas de qué? ¿Funcionales? ¿De seguridad?
- "Alguien lo aprobó" — ¿Ese alguien verificó seguridad o solo funcionalidad?

> "Exactamente. La mayoría de nosotros no sabemos con certeza qué controles pasó el código
> que estamos ejecutando ahora mismo. Hoy vamos a cambiar eso — al menos para entender
> qué controles existen, qué detectan, y qué no pueden detectar."

### Por qué funciona esta apertura
Activa el pensamiento crítico antes de mostrar cualquier herramienta. Los estudiantes
llegan con el mindset correcto: "no basta con que funcione, hay que saber cómo fue validado."

---

## Segmento 2 — El pipeline como cadena de custodia (13 minutos)

### Contexto que necesitas entender primero

**¿Cómo funciona GitHub Actions técnicamente?**

Cuando alguien hace `git push` o abre un Pull Request en GitHub, GitHub detecta el evento y
busca archivos `.yml` en la carpeta `.github/workflows/`. Si encuentra uno con el trigger
correcto, crea una ejecución del workflow en un servidor virtual (llamado "runner").

Ese runner es básicamente una máquina virtual Linux limpia que se crea para esa ejecución
específica y se destruye al terminar. El workflow define qué comandos correr en esa máquina.

**¿Por qué importa que sea una máquina limpia?** Porque garantiza reproducibilidad. No hay
estado previo, no hay dependencias instaladas de otra ejecución anterior. Cada vez que corre,
parte exactamente del mismo estado.

**El concepto de "job":** un workflow tiene "jobs" que son grupos de pasos. En este laboratorio,
el workflow `ci.yml` tiene tres jobs: `quality` (ESLint), `test` (Vitest) y `security` (npm audit).
Los jobs pueden configurarse para depender unos de otros (`needs: quality`) — lo que significa
que si `quality` falla, `test` y `security` ni siquiera empiezan.

### Demo en vivo — Escenario 1: Construcción Exitosa

**Qué hacer:**
1. Asegúrate de tener "✅ Construcción Exitosa" seleccionado.
2. Haz clic en "▶ Ejecutar Pipeline".
3. Mientras corre, narra cada etapa en voz alta (ver guión abajo).

**Guión mientras corre la animación:**

> "El pipeline empieza con el Evento PR — alguien propuso un cambio de código.
> GitHub detecta ese evento y activa el workflow automáticamente.
>
> Ahora están corriendo los checks de Calidad — ESLint analiza el código fuente
> buscando errores de sintaxis, variables no usadas, patrones problemáticos.
> No busca vulnerabilidades de seguridad — su función es calidad de código.
>
> Pruebas — Vitest corre las pruebas unitarias. Verifica que el código hace
> lo que se supone que debe hacer. Tampoco busca vulnerabilidades de seguridad.
>
> SCA — ahora sí empieza la parte de seguridad. npm audit compara la lista de
> dependencias del proyecto contra una base de datos de vulnerabilidades conocidas.
>
> SAST — CodeQL analiza el código fuente buscando patrones de programación inseguros.
> Flujos de datos peligrosos, inyecciones potenciales, manejo inseguro de entrada.
>
> Revisión — un humano aprueba el cambio después de que los checks automáticos pasaron.
>
> Merge — el código llega a la rama principal.
>
> Deploy — el código se publica automáticamente a GitHub Pages."

Cuando termine:
> "Todo verde. ¿Qué nos garantiza esto? Que estos controles específicos
> no detectaron condiciones de fallo. Nada más y nada menos.
> No nos dice que el software esté libre de vulnerabilidades — nos dice que
> los controles que configuramos no encontraron problemas."

### Demo en vivo — Escenario 2: Dependencia Vulnerable

**Qué hacer:**
1. Cambia a "🔒 Dependencia Vulnerable".
2. Haz clic en "▶ Ejecutar Pipeline".
3. Mientras corre:

> "Los mismos primeros pasos: calidad pasa, pruebas pasan.
> Ahora SCA — y aquí hay un problema.
>
> npm audit encontró una dependencia con una vulnerabilidad conocida de severidad HIGH.
> ¿Qué pasa ahora?
> El comando termina con exit code 1 — indica error.
> GitHub Actions interpreta exit code 1 como fallo del job.
> El check 'security' falla y lo reporta al repositorio.
> Branch Protection requiere ese check como 'Required Status Check'.
> El PR no puede mergearse mientras el check esté fallido.
>
> Eso es un Security Gate completo."

Cuando aparezca el finding panel, señálalo:
> "El sistema nos muestra el hallazgo: qué paquete, qué CVE, qué severidad.
> Pero lo más importante para entender es el flujo que llevó a bloquear el merge —
> no solo que se detectó el problema, sino que hay un mecanismo que impide avanzar."

Haz clic en la etapa SCA del pipeline y abre el panel de detalle:
> "Y si hacemos clic en la etapa, vemos el modelo completo de ese control de seguridad.
> Amenaza. Control. Política. Decisión. Riesgo Residual.
> El riesgo residual es honesto: npm audit no detecta dependencias maliciosas
> sin CVE publicado. No es magia — tiene alcance y tiene límites."

### Demo en vivo — Escenario 3: Secreto Detectado

**Qué hacer:**
1. Cambia a "🔑 Secreto Detectado".
2. Haz clic en "▶ Ejecutar Pipeline".

> "Este escenario es diferente. El fallo ocurre en la primera etapa — Evento PR.
> Secret Scanning detecta el secreto antes de que cualquier otro check corra.
> Severidad: CRITICAL. Y miren el riesgo residual..."

Señala el finding panel:
> "El problema con los secretos en código es que el historial de git los preserva.
> Aunque elimines el secreto en el próximo commit, existió en el commit anterior.
> El repositorio tiene memoria. La solución correcta cuando un secreto llega al repo
> es rotar ese secreto inmediatamente — asumiendo que fue comprometido."

---

## Segmento 3 — Scanner ≠ Security Gate (10 minutos)

### Contexto que necesitas entender primero

Esta es la distinción más importante del laboratorio y la que más confusión genera en equipos reales.

**El error común:** muchos equipos instalan `npm audit` o CodeQL en su pipeline y
asumen que ahora tienen un Security Gate. No necesariamente. Depende de cómo está configurado.

**La diferencia técnica:**

Un **scanner** es cualquier herramienta que analiza y produce un resultado:
- "Esta dependencia tiene CVE-2024-1234 con severidad HIGH"
- "Esta función puede ser vulnerable a XSS"
- "Este archivo contiene un patrón que parece un token"

Un **Security Gate** es un mecanismo que usa ese resultado para controlar si el cambio puede avanzar.
Para ser un gate, se necesitan tres elementos:
1. El scanner que detecta
2. Una política que define qué resultados generan un fallo
3. Un mecanismo de enforcement que aplique esa política

En GitHub Actions, los tres elementos son:
1. `npm audit` (el scanner)
2. `--audit-level=high` (la política: HIGH o superior → fallo)
3. Required Status Check en Branch Protection (el enforcement)

**Si falta cualquiera de los tres, no es un gate:**
- Sin scanner: no hay detección
- Sin política: el scanner produce información pero no consecuencias
- Sin enforcement: las consecuencias existen pero no se aplican

### Cómo explicar la animación

Haz clic en "▶ Animar el flujo" y narra cada paso:

> **Paso 1 — El Scanner:**
> "npm audit es la herramienta. Analiza el archivo package-lock.json y lo compara
> con la npm Advisory Database — una base de datos de vulnerabilidades conocidas."

> **Paso 2 — El Hallazgo:**
> "El scanner produce un resultado concreto y estructurado: nombre del paquete,
> versión afectada, CVE específico, severidad CVSS. Solo información — ninguna acción."

> **Paso 3 — La Política:**
> "El flag `--audit-level=high` es la política. Le dice al scanner:
> 'si encuentras algo HIGH o CRITICAL, retorna un error en lugar de solo reportarlo'.
> Sin este flag, npm audit siempre termina con exit code 0, pase lo que pase."

> **Paso 4 — El Exit Code:**
> "Exit code 1 es cómo los programas de Unix/Linux comunican 'algo salió mal'.
> GitHub Actions lee ese exit code: si es 0, el step pasó; si es distinto de 0, falló."

> **Paso 5 — El Check Falla:**
> "GitHub Actions reporta el estado del check al repositorio. El check 'security'
> ahora aparece como 'failed' en la interfaz del PR."

> **Paso 6 — Merge Bloqueado:**
> "Branch Protection tiene configurado este check como 'Required Status Check'.
> GitHub no permite mergear el PR mientras haya required checks fallidos.
> Eso es enforcement. Eso es un Security Gate."

### Pregunta de discusión para la clase

> "¿Qué pasa si tienen npm audit con `--audit-level=high` en el pipeline,
> el check falla, pero NO tienen ese check configurado como Required Status Check
> en Branch Protection?"

La respuesta:
> "El check aparece como rojo en la interfaz del PR, pero el PR SE PUEDE MERGEAR.
> GitHub permite mergear con checks fallidos a menos que estén marcados como 'required'.
> Tienen visibilidad pero no control. Tienen un scanner, no un gate."

Esto siempre genera reacciones fuertes en clase — es un error muy común en equipos reales.

---

## Segmento 4 — GITHUB_TOKEN y Least Privilege (12 minutos)

### Contexto que necesitas entender primero

Este segmento enseña el concepto de identidad del pipeline y por qué importa.

**¿Qué es el GITHUB_TOKEN?**

Cuando GitHub Actions ejecuta un workflow, automáticamente genera un token de autenticación
temporal para esa ejecución específica. Ese token se llama GITHUB_TOKEN. Es como una
credencial de acceso temporal que le permite al workflow interactuar con la API de GitHub:
leer código, escribir comentarios, publicar releases, etc.

Lo importante es que cualquier Action de terceros que ejecutes en tu workflow también
tiene acceso a ese token. Si la Action hace `process.env.GITHUB_TOKEN` en Node.js o
`${{ secrets.GITHUB_TOKEN }}` en el YAML, puede usar los permisos que le asignaste.

**¿Qué son los permisos?**

La declaración `permissions:` en el YAML del workflow define qué puede hacer ese token.
Por defecto (sin declaración explícita), GitHub usa el "default permission" del repositorio,
que en repositorios personales suele ser `write-all` — acceso de escritura a todo.

```yaml
# Esto le da al token acceso de escritura a TODO el repositorio
permissions: write-all

# Esto le da al token solo acceso de lectura al código
permissions:
  contents: read
```

**¿Por qué importa si la Action es comprometida?**

Si una Action de terceros que usas en tu workflow es comprometida por un atacante
(el autor de la Action sube código malicioso), esa Action puede:
- Con `write-all`: modificar archivos, crear commits, publicar releases maliciosos,
  leer todos los secretos del repositorio, crear webhooks
- Con `contents: read`: leer el código fuente (que igual es probablemente público)
  y nada más

Least Privilege — el principio de dar el mínimo permiso necesario — reduce el daño
potencial si algo en el pipeline es comprometido.

### Demo interactiva

Navega a la sección "Radio de Impacto" y narra:

> "Este toggle simula la diferencia entre dos configuraciones de permisos.
> Con 'Least Privilege', el workflow declara explícitamente solo los permisos que necesita."

Muestra el modo "Least Privilege":
> "contents: read — el workflow puede leer el código para analizarlo.
> Eso es todo. Si cualquier Action de este workflow fuera comprometida,
> el impacto es limitado."

Cambia a "Permisos Excesivos":
> "write-all — ahora el token puede hacer casi cualquier cosa en el repositorio.
> Una Action comprometida podría modificar código, crear releases falsos,
> leer todos los secretos configurados en el repositorio, crear webhooks para
> exfiltrar datos de futuros runs.
>
> El pipeline es exactamente el mismo código. La diferencia es solo la declaración
> de permisos. Pero el impacto potencial de un compromiso cambia radicalmente."

### Pregunta profunda para discusión

> "El workflow de deploy necesita `pages: write` para publicar en GitHub Pages.
> ¿Cómo manejamos eso sin dar `write-all`?"

Respuesta:
> "Declaramos exactamente los permisos que ese workflow específico necesita:
> `contents: read` para leer el código, `pages: write` para publicar,
> `id-token: write` para autenticación OIDC.
> Cada workflow tiene su propia declaración. El CI no tiene `pages: write`.
> El de deploy no tiene más de lo que necesita para hacer su función.
> Esta es la aplicación del principio de Least Privilege al pipeline."

### Si alguien pregunta sobre OIDC

> "OIDC es OpenID Connect — un protocolo de autenticación. `id-token: write`
> le permite al workflow obtener un token firmado por GitHub para autenticarse
> con GitHub Pages sin necesitar guardar una API key como secreto.
> En lugar de 'aquí está mi contraseña', el workflow dice 'aquí está un token
> firmado por GitHub que prueba que soy el workflow deploy.yml del repo X
> corriendo en el commit Y'. GitHub Pages verifica la firma y lo acepta.
> El token expira en minutos. Sin secretos de larga duración."

---

## Segmento 5 — Ejercicio grupal: Ataque → Defensa (10 minutos)

### Cómo facilitar el ejercicio

Divide la clase en 3–4 grupos. Asigna un escenario a cada grupo:

| Grupo | Escenario |
|---|---|
| A | "Dependencia npm con CVE conocida" |
| B | "API key hardcodeada en código fuente" |
| C | "GitHub Action de terceros comprometida" |
| D | "PR con código malicioso camuflado" |

Instrucción:
> "Tienen 4 minutos para seleccionar los controles en la interfaz y hacer clic en 'Evaluar'.
> Lean la explicación completa incluyendo limitaciones.
> Luego preparen 30 segundos para explicar al resto de la clase:
> cuál es el control PRIMARIO y por qué es el primario, no solo un complementario."

### Respuestas y puntos de facilitation

**Grupo A — Dependencia npm con CVE:**
- Control primario: SCA (npm audit)
- Por qué: SCA analiza específicamente el grafo de dependencias contra CVEs. Es la herramienta diseñada exactamente para este problema.
- SAST no ayuda aquí: SAST analiza el código fuente que ESCRIBISTE, no las vulnerabilidades en código de terceros.
- Pregunta de facilitation: *"¿Code Review detectaría esto?"* Quizás — si el revisor conoce el paquete. Pero es impredecible y no escala. SCA es determinístico.

**Grupo B — API key hardcodeada:**
- Control primario: Secret Scanning (Push Protection)
- Por qué: Secret Scanning detecta patrones conocidos de tokens y puede bloquear el push antes de que llegue al servidor.
- Code Review como complementario: un revisor podría detectarlo, pero Secret Scanning no depende de que el revisor lo note.
- Pregunta de facilitation: *"¿Por qué Code Review no es suficiente solo?"* Porque los revisores son humanos, se cansan, no conocen todos los patrones de tokens, y el secret ya llegó al repo mientras esperan la revisión.

**Grupo C — GitHub Action comprometida:**
- Control primario: Least Privilege
- Por qué: es el único control que limita el daño CUANDO la Action ya es comprometida. Los otros controles intentan prevenir el compromiso, no limitarlo.
- SHA pinning como complementario: usar el SHA exacto de la Action en lugar del tag mutable reduce la posibilidad de que el compromiso afecte el pipeline sin saberlo.
- Pregunta de facilitation: *"¿SCA detectaría una Action comprometida?"* No directamente — SCA analiza npm. Dependabot puede alertar sobre cambios en Actions usadas, pero no verifica que el código sea malicioso.

**Grupo D — PR con código malicioso camuflado:**
- Control primario: Code Review
- Por qué: es el único control que entiende el significado del código en contexto, no solo patrones sintácticos.
- SAST como complementario: CodeQL detecta patrones conocidos de vulnerabilidades (XSS, inyección, etc.) pero no detecta lógica de negocio maliciosa arbitraria.
- Pregunta de facilitation: *"¿Por qué SAST no es suficiente?"* Porque SAST tiene un vocabulario de patrones conocidos. Un atacante sofisticado puede escribir código malicioso que no coincide con ningún patrón conocido.

---

## Segmento 6 — Cierre: lo que el pipeline verde realmente significa (8 minutos)

### El punto más importante de toda la clase

> "Un pipeline verde indica que los controles configurados no detectaron condiciones de fallo.
> No indica que el software esté libre de vulnerabilidades."

Explica la diferencia:
> "Hay una diferencia importante entre 'ausencia de evidencia de problemas'
> y 'evidencia de ausencia de problemas'.
> El pipeline verde es lo primero — los controles no encontraron nada.
> Pero eso no prueba que no haya nada que encontrar."

### Por qué siempre hay riesgo residual

Haz clic en cualquier control en el explorador y ve al campo "Riesgo Residual":

> "Cada control en este laboratorio documenta su riesgo residual. No porque los controles
> sean malos — son buenos y necesarios — sino porque ningún control es completo.
>
> SCA no detecta dependencias maliciosas sin CVE publicado.
> SAST no detecta vulnerabilidades de lógica de negocio.
> Secret Scanning no detecta secretos con formato personalizado.
> Code Review no detecta todos los ataques sofisticados.
>
> Por eso se llama Defense in Depth — defensa en profundidad.
> No ponemos todos los controles porque ninguno funciona solo.
> Los ponemos todos porque cada uno detecta lo que los otros no detectan.
>
> Y aun con todos en su lugar, hay riesgo residual. El objetivo de la seguridad
> no es eliminar el riesgo — es reducirlo a un nivel aceptable dado el contexto."

### Pregunta final de cierre

> "Si tuvieran que elegir SOLO UN control para un proyecto nuevo, ¿cuál elegirían y por qué?"

No hay respuesta correcta única — el objetivo es la argumentación. Escucha la justificación.
Respuestas comunes y cómo responder:

- "Branch Protection" → Buena elección: impide que cambios no revisados lleguen a main. Pero sin SCA ni SAST, pasan dependencias vulnerables y código inseguro.
- "SCA" → Razonable: las dependencias son la fuente de riesgo más común en proyectos reales. Pero no protege contra código malicioso.
- "Code Review" → El favorito tradicional. Pero escala mal, es lento, y los revisores tienen puntos ciegos sistemáticos.
- "Secret Scanning" → Excelente argumento: el daño de un secreto filtrado es inmediato e irreversible.

Cierra con:
> "La respuesta honesta es que no deberían tener que elegir uno solo.
> El costo de configurar estos controles en GitHub es bajo — la mayoría es gratuita.
> El costo de no tenerlos puede ser muy alto.
> Lo que sí pueden priorizar es asegurarse de que Branch Protection esté activado —
> porque sin él, los otros controles corren pero no bloquean nada."

---

## Preguntas frecuentes con respuestas completas

### "¿npm audit detecta todo?"

**Respuesta completa:**
No. npm audit solo detecta paquetes con vulnerabilidades registradas en la npm Advisory Database.
No detecta:
- Dependencias maliciosas que no tienen CVE publicado (ej: el atacante publicó el paquete él mismo)
- Código malicioso en el source del paquete que no ha sido reportado
- Vulnerabilidades en TU propio código
- Dependencias con CVE no publicados aún (zero-days)

La Advisory Database se actualiza constantemente, así que algo que no detecta hoy puede detectarlo mañana — por eso Dependabot hace actualizaciones automáticas semanales.

### "¿CodeQL encuentra todas las vulnerabilidades?"

**Respuesta completa:**
No. CodeQL tiene un catálogo de "queries" — básicamente patrones que busca. Puede detectar:
- DOM-based XSS (flujos de datos de entrada del usuario a `innerHTML`)
- SQL injection
- Path traversal
- Ciertos patrones de inyección de comandos

No puede detectar:
- Lógica de negocio maliciosa arbitraria
- Problemas semánticos (código que funciona pero hace algo incorrecto)
- Vulnerabilidades en patrones que no están en su catálogo

Además tiene falsos positivos (reporta problemas que no son reales) y falsos negativos
(no reporta problemas que sí son reales). Es una herramienta útil con límites conocidos.

### "¿Por qué no usar TypeScript para más seguridad?"

**Respuesta completa:**
TypeScript agrega seguridad de tipos — reduce errores de tipo en tiempo de compilación.
Eso es valioso para calidad de software pero no es exactamente seguridad en el sentido
de amenazas externas. TypeScript no previene:
- Dependencias vulnerables
- Secretos hardcodeados
- Inyección XSS (puedes tener XSS en TypeScript perfectamente tipado)
- Permisos excesivos del pipeline

El laboratorio usa JavaScript puro para que el foco esté en los controles del pipeline,
no en las características del lenguaje. Los conceptos son independientes del lenguaje.

### "¿Dependabot mergea automáticamente las actualizaciones?"

**Respuesta completa:**
Por defecto, Dependabot crea un PR pero un humano debe revisarlo y mergearlo.
Existe "Dependabot auto-merge" como configuración opcional, pero se recomienda con cuidado:
actualizar automáticamente puede introducir cambios de comportamiento no esperados.

La práctica recomendada para patches de seguridad urgentes es auto-merge con tests,
pero para actualizaciones de minor/major, revisión humana. El laboratorio no configura
auto-merge — solo las actualizaciones semanales propuestas como PRs.

### "¿Qué pasa si alguien con acceso de admin bypasea Branch Protection?"

**Respuesta completa:**
Es un riesgo real. Por defecto, los propietarios del repositorio pueden bypasear Branch Protection.
Las mitigaciones son:
- En GitHub Enterprise: usar Branch Rulesets con la opción "Do not allow bypass" que aplica a todos incluyendo admins
- Mantener el número de admins al mínimo y requerir 2FA
- En organizaciones: usar el audit log de GitHub para detectar bypasses
- Separar el rol de "puede deployar" del rol de "puede mergear a main"

La configuración "Do not allow bypassing the above settings" en Branch Protection es importante —
sin ella, cualquier admin puede mergear directo a main ignorando todos los controles.

### "¿Por qué el workflow necesita `id-token: write`?"

**Respuesta completa:**
`id-token: write` habilita OIDC (OpenID Connect). Con este permiso, el workflow puede
solicitar un JWT (JSON Web Token) firmado por GitHub que prueba su identidad:
"soy el workflow deploy.yml del repositorio X, ejecutándome en el commit Y."

GitHub Pages usa OIDC internamente para validar que el deployment viene de un workflow
autorizado. Sin este permiso, el deployment falla porque no puede autenticarse.

Esto es mejor que usar un token de acceso personal (PAT) como secreto del repositorio
porque: el JWT expira en minutos, no hay credencial de larga duración que rotar o que
pueda ser filtrada, y el JWT está firmado por GitHub mismo.

---

## Errores técnicos comunes y cómo manejarlos en clase

**"Hice clic en Ejecutar y el pipeline se quedó en Ejecutando para siempre"**
→ Probablemente hubo un error de JS. Recarga la página con F5 y espera 2 segundos antes de ejecutar.

**"El panel de detalle de control no se cierra"**
→ Haz clic fuera del panel (en el overlay oscuro) o presiona Escape.

**"Los controles de Ataque→Defensa no muestran resultado"**
→ Se necesita seleccionar al menos un control antes de hacer clic en "Evaluar selección".

**"El quiz de GITHUB_TOKEN ya tiene la respuesta marcada de antes"**
→ Recarga la página para reiniciar el estado.

**"La animación de Scanner≠Gate no reinicia"**
→ Hay un botón "↺ Repetir animación" que aparece después de la primera ejecución.

---

## Material de extensión para grupos avanzados

Si tienes tiempo extra o estudiantes que quieren profundizar:

**SHA Pinning:**
> "En los workflows usamos `uses: actions/checkout@v4`. El `@v4` es un tag mutable —
> puede apuntar a código diferente mañana si el autor actualiza la Action.
> La alternativa segura es `uses: actions/checkout@11bd71901...` — el SHA exacto del commit.
> Ese SHA nunca cambia. ¿La desventaja? Tenemos que actualizar manualmente cuando
> queremos nuevas versiones. Dependabot puede hacer esto automáticamente."

**Environment Protection Rules:**
> "El workflow de deploy usa `environment: github-pages`. Los environments en GitHub
> pueden tener reglas adicionales: aprobación humana requerida antes del deploy,
> restricción a ramas específicas, tiempo de espera mínimo entre deployments.
> Son el equivalente de 'cuatro ojos' para el proceso de deploy."

**SBOM:**
> "¿Cómo saben qué exactamente está en el software que entregan?
> Un SBOM (Software Bill of Materials) es un inventario estructurado de todos
> los componentes: nombre, versión, licencia, hash. Es como el listado de ingredientes
> en un producto de consumo. Organizaciones reguladas están empezando a requerir
> SBOMs como parte de los contratos de software."
