# Configuración del Fork — Hello Secure World

Configura tu fork una sola vez antes de comenzar los escenarios.
Esto toma aproximadamente 10 minutos.

## Paso 1: Fork y clon

1. En la página del repositorio original, haz clic en **Fork** (arriba a la derecha)
2. Selecciona tu cuenta de GitHub como destino
3. Clona tu fork localmente:

```bash
git clone https://github.com/TU_USUARIO/Hello_Secure_World.git
cd Hello_Secure_World
npm install
```

4. Verifica que los tests pasan:

```bash
npm test
```

## Paso 2: Habilitar GitHub Actions

En tu fork:
1. Ve a la pestaña **Actions**
2. Si ves "Workflows aren't being run on this forked repository", haz clic en **I understand my workflows, go ahead and enable them**

Los tres workflows que se activarán son:
- `CI` — quality, test, security
- `CodeQL Analysis` — análisis SAST de JavaScript
- `Lab Validation` — validación de escenarios de práctica

## Paso 3: Habilitar Secret Scanning y Push Protection

En repositorios **públicos** esto está habilitado por defecto.
Si tu fork es privado, habilítalo manualmente:

1. Ve a **Settings** → **Security** → **Code security and analysis**
2. En "Secret scanning": haz clic en **Enable**
3. En "Push protection": haz clic en **Enable**

## Paso 4: Habilitar CodeQL

CodeQL se activa automáticamente con el workflow `codeql.yml` incluido en el repositorio.
No hay configuración adicional necesaria — el análisis corre en cada PR.

Si quieres verificar que está configurado:
- Ve a **Settings** → **Security** → **Code security and analysis**
- Bajo "Code scanning": deberías ver "CodeQL" listado

## Paso 5: Configurar Branch Protection (recomendado)

Para que los Security Gates funcionen como guardianes reales que bloqueen merges:

1. Ve a **Settings** → **Branches**
2. Haz clic en **Add branch protection rule**
3. En "Branch name pattern": escribe `main`
4. Activa:
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
5. En el buscador de status checks, agrega:
   - `security / Verificar dependencias`
   - `CodeQL / Analyze (javascript-typescript)`
6. Haz clic en **Create**

Con esto configurado, ningún PR con vulnerabilidades HIGH de SCA o hallazgos
CodeQL de severidad HIGH podrá mergearse — exactamente como funciona en producción.

## Paso 6: Verifica la configuración

Crea un PR de prueba vacío para ver todos los checks:

```bash
git checkout -b test/setup-verification
git commit --allow-empty -m "test: verificar configuración de CI"
git push origin test/setup-verification
```

Abre el PR en GitHub. Deberías ver los siguientes checks ejecutándose:
- `quality / Lint y formato`
- `test / Pruebas unitarias`
- `security / Verificar dependencias`
- `CodeQL / Analyze (javascript-typescript)` *(puede tardar 5-10 min en el primero)*
- `Lab Validation / Validar escenarios de práctica`

Cuando todos estén verdes, cierra el PR sin mergear y elimina la rama:

```bash
git checkout main
git push origin --delete test/setup-verification
git branch -D test/setup-verification
```

## Listo

Tu fork está configurado. Ahora puedes comenzar con los escenarios:

- [01 — SCA](scenarios/01-sca/INSTRUCTIONS.md)
- [02 — Secret Scanning](scenarios/02-secret/INSTRUCTIONS.md)
- [03 — SAST/CodeQL](scenarios/03-xss/INSTRUCTIONS.md)
