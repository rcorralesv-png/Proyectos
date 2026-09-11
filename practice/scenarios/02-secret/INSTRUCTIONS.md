# Escenario 02 — Secret Scanning: Token en Código Fuente

## Objetivo

Experimentar GitHub Push Protection bloqueando un push con un token detectado,
entender por qué esto protege incluso si el push fue bloqueado, y practicar la respuesta correcta.

## El problema

El archivo `config/settings.js` en este directorio contiene un token con el patrón
`github_pat_...` que GitHub Secret Scanning reconoce como un Personal Access Token de GitHub.

**IMPORTANTE**: El token es inválido y fue revocado inmediatamente. Su único propósito
es demostrar cómo funciona la detección de patrones.

## Pasos

### 1. Copia el archivo a tu fork

```bash
mkdir -p config
cp practice/scenarios/02-secret/config/settings.js config/settings.js
```

### 2. Intenta hacer push

```bash
git checkout -b lab/secret-scanning-demo
git add config/settings.js
git commit -m "lab: agregar configuración con token (práctica Secret Scanning)"
git push origin lab/secret-scanning-demo
```

### 3. Observa el bloqueo de Push Protection

GitHub bloqueará el push con un mensaje como:

```
remote: error: GH013: Repository rule violations found for refs/heads/lab/secret-scanning-demo.
remote: - GITHUB PUSH PROTECTION
remote:   —————————————————————————————————————
remote:     Resolve the following secrets before pushing:
remote:     (?) GitHub Personal Access Token
remote:          Location: config/settings.js:15
remote:     ——————————————————————————————————————
```

El secreto **nunca llegó al historial del repositorio**.

### 4. Responde correctamente: revoca primero

Aunque el token es inválido para este ejercicio, en un escenario real la acción
más urgente sería revocar el token **antes** de eliminar el archivo:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens
2. Identifica el token comprometido y revócalo
3. Notifica al equipo de seguridad

### 5. Corrige el archivo

```bash
# Reemplaza el token con una referencia a una variable de entorno
```

Edita `config/settings.js` para que quede así:

```js
const config = {
  apiUrl: 'https://api.example.com',
  // El token viene de una variable de entorno, no del código fuente
  token: process.env.API_TOKEN,
};
export default config;
```

```bash
git add config/settings.js
git commit -m "fix: mover token a variable de entorno (eliminar hardcoded secret)"
git push
```

### 6. Verifica que el push funciona

Sin el patrón de token, Push Protection permite el push.
En GitHub Security → Secret scanning alerts, verás la alerta auto-resuelta.

## Conceptos aprendidos

- **Push Protection es preventivo**: el secreto nunca llega al historial (a diferencia del modo detectivo)
- **La revocación es siempre el primer paso**: independientemente de si el push fue bloqueado
- **Por qué importa el historial**: `git log` y `git reflog` conservan el contenido incluso después de eliminar un archivo
- **Variables de entorno**: la alternativa correcta a credenciales hardcodeadas
- **Patrones de proveedor**: GitHub detecta ~200+ tipos de tokens de servicios conocidos
