# Escenario 03 — SAST/CodeQL: DOM-based XSS con innerHTML

## Objetivo

Ver a CodeQL detectar un flujo de datos peligroso (taint tracking) desde una fuente
de entrada hasta un sumidero inseguro, entender el reporte de alerta, y aplicar el fix.

## El problema

El archivo `src/demo-insecure.js` usa `innerHTML` con el parámetro `name` directamente.
CodeQL ejecuta la query `js/xss` que traza: `name` (fuente) → `innerHTML` (sumidero).

Compara con `src/app.js` en el repositorio principal, que usa `textContent` correctamente.

## Pasos

### 1. Copia el archivo a tu fork

```bash
cp practice/scenarios/03-xss/src/demo-insecure.js src/demo-insecure.js
```

### 2. Crea un PR

```bash
git checkout -b lab/codeql-xss-demo
git add src/demo-insecure.js
git commit -m "lab: agregar ejemplo inseguro para práctica CodeQL (XSS)"
git push origin lab/codeql-xss-demo
```

Abre un Pull Request desde `lab/codeql-xss-demo` hacia `main`.

### 3. Espera el análisis CodeQL

El job de CodeQL puede tardar **5–15 minutos** en el primer análisis.
Puedes monitorearlo en la pestaña **Actions** → workflow `CodeQL Analysis`.

### 4. Observa la alerta de seguridad

Cuando CodeQL termina, verás en el PR:
- Un check `CodeQL / Analyze (javascript-typescript)` como FAILED o con warning
- En GitHub Security → Code scanning alerts: nueva alerta `js/xss`

La alerta muestra:
- **Tipo**: DOM text flows into sink
- **Severidad**: High / Error
- **Ubicación**: `src/demo-insecure.js`, línea del `innerHTML`
- **Flujo**: `name` (parámetro en línea X) → template literal → `innerHTML` (línea Y)

### 5. Entiende el taint tracking

CodeQL no ejecutó el código. Trazó el **flujo de datos** estáticamente:
- **Fuente (source)**: el parámetro `name` de la función — datos de entrada no confiables
- **Propagación**: el template literal `` `<p>¡Hola, ${name}!</p>` `` incluye la fuente
- **Sumidero (sink)**: `outputElement.innerHTML = ...` — interpreta HTML

Si `name = '<img src=x onerror=alert(1)>'`, el navegador ejecutaría el handler.

### 6. Aplica el fix

Edita `src/demo-insecure.js`:

```js
// Antes (inseguro):
outputElement.innerHTML = `<p>¡Hola, ${name}!</p>`;

// Después (seguro):
outputElement.textContent = `¡Hola, ${name}!`;
// O si necesitas el <p>:
const p = document.createElement('p');
p.textContent = `¡Hola, ${name}!`;
outputElement.appendChild(p);
```

```bash
git add src/demo-insecure.js
git commit -m "fix: reemplazar innerHTML con textContent para prevenir XSS"
git push
```

### 7. Resuelve la alerta

En GitHub Security → Code scanning alerts → encuentra la alerta `js/xss`:
- Haz clic en **Dismiss alert** o verifica que un nuevo análisis la marca como resuelta
- El PR ahora puede pasar el check de CodeQL

## Conceptos aprendidos

- **SAST vs tests**: los tests verifican comportamiento esperado, CodeQL verifica propiedades de seguridad de flujos de datos
- **Taint tracking**: traza datos desde fuentes no confiables hasta sumideros peligrosos sin ejecutar el código
- **textContent vs innerHTML**: diferencia fundamental — textContent es texto literal, innerHTML es HTML parseado
- **Security gate CodeQL**: cuando está configurado como Required Status Check, bloquea PRs con hallazgos HIGH
- **Por qué SAST complementa tests**: puedes tener 100% de cobertura de tests y aun así tener vulnerabilidades que solo SAST detecta
