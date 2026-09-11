# Evolución Enterprise — Más Allá del Laboratorio

Este documento describe los controles y prácticas que van más allá de la configuración
básica del laboratorio, relevantes para organizaciones con madurez de seguridad más alta.
Son el siguiente paso natural después de dominar los conceptos del laboratorio.

---

## 1. SBOM — Software Bill of Materials

**¿Qué es?** Un inventario estructurado y legible por máquina de todos los componentes
de un artefacto de software: dependencias directas, transitivas, licencias, y hashes.

**Formatos estándar:** SPDX, CycloneDX.

**Generación en GitHub Actions:**
```yaml
- name: Generar SBOM
  uses: anchore/sbom-action@v0
  with:
    format: cyclonedx-json
    output-file: sbom.cyclonedx.json
```

**Usos del SBOM:**
- Identificar rápidamente qué sistemas se ven afectados cuando aparece un nuevo CVE.
- Cumplimiento regulatorio (EO 14028 en el gobierno de EE.UU. requiere SBOMs).
- Auditoría de licencias de código abierto.
- Proveedor a cliente: entregas contractuales de SBOMs.

**Limitación:** El SBOM es un snapshot en el tiempo. Requiere proceso de actualización
continua a medida que cambian las dependencias.

---

## 2. SLSA — Supply-chain Levels for Software Artifacts

**¿Qué es?** Un framework de niveles de madurez para la seguridad de la cadena de
suministro de software. Definido por Google, adoptado como estándar de la industria.

**Niveles:**
| Nivel | Requisito |
|---|---|
| SLSA 1 | Build automatizado (no manual); provenance disponible |
| SLSA 2 | Build en servicio confiable (GitHub Actions califica); firma de la provenance |
| SLSA 3 | Build en entorno aislado y hardened; provenance no falsificable |
| SLSA 4 (obsoleto/fusionado) | Two-party review en todos los cambios |

**Generación de provenance en GitHub Actions:**
```yaml
- uses: slsa-framework/slsa-github-generator/.github/workflows/builder_nodejs_slsa3.yml@v2
  with:
    node-version: 22
```

**¿Qué prueba la provenance?** Que el artefacto fue construido desde un commit
específico, en GitHub Actions, por un workflow específico — y no fue modificado después.

**Relación con este laboratorio:** El workflow `deploy.yml` usa OIDC (`id-token: write`),
que es el mecanismo subyacente que SLSA usa para generar provenance firmada.

---

## 3. Firma de Artefactos (Sigstore / cosign)

**¿Qué es?** Firmar criptográficamente los artefactos de software para verificar
su integridad y procedencia.

**Sigstore** es la infraestructura de código abierto para firmar sin gestión de claves.
**cosign** es la herramienta CLI de Sigstore.

**Firma en GitHub Actions con OIDC (sin claves privadas):**
```yaml
- uses: sigstore/cosign-installer@v3

- name: Firmar artefacto
  env:
    COSIGN_EXPERIMENTAL: 1  # keyless signing
  run: |
    cosign sign --yes --oidc-issuer https://token.actions.githubusercontent.com \
      ghcr.io/org/imagen:tag
```

**Verificación:**
```bash
cosign verify ghcr.io/org/imagen:tag \
  --certificate-identity-regexp 'https://github.com/org/repo/.github/workflows/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

**Por qué importa:** Alguien con acceso al registry podría reemplazar una imagen.
Una firma verificable prueba que la imagen fue creada por tu pipeline, desde tu commit.

---

## 4. OIDC — Autenticación Sin Secretos de Larga Duración

**¿Qué es?** OpenID Connect permite que el runner de GitHub Actions obtenga un
token JWT firmado por GitHub, que los proveedores de cloud (AWS, GCP, Azure) aceptan
en lugar de secretos de larga duración.

**Flujo:**
```
GitHub Actions Runner
  → solicita token al endpoint OIDC de GitHub
  → GitHub emite JWT firmado (válido ~15 min, para ese workflow específico)
  → El runner presenta el JWT al proveedor cloud
  → El proveedor verifica la firma y el claim (sub) del JWT
  → Emite credenciales temporales de corta duración
```

**Ejemplo con AWS:**
```yaml
permissions:
  id-token: write    # Necesario para solicitar el JWT
  contents: read

- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/my-github-role
    aws-region: us-east-1
```

**Ventaja sobre secrets:** No hay credencial de larga duración que rotar, almacenar,
o que pueda ser filtrada de los secretos del repositorio. El token expira en minutos.

**Relación con este laboratorio:** `deploy.yml` usa `id-token: write` por esta razón —
GitHub Pages usa OIDC internamente para las deployments.

---

## 5. DAST — Dynamic Application Security Testing

**¿Qué es?** Análisis de seguridad ejecutado contra la aplicación en funcionamiento —
a diferencia de SAST, que analiza el código fuente estático.

**Herramientas comunes:**
- **OWASP ZAP** — scanner de código abierto, integrable con GitHub Actions
- **Nuclei** — templates de vulnerabilidades, orientado a APIs
- **Burp Suite** (enterprise) — herramienta manual y automatizada

**DAST básico con ZAP en GitHub Actions:**
```yaml
- name: DAST — OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'https://staging.example.com'
    fail_action: true
```

**Cuándo ejecutarlo:** Sobre un ambiente de staging, después del deploy de CI pero
antes de promocionar a producción. No reemplaza SAST — lo complementa.

**Limitación para este laboratorio:** Esta aplicación es completamente estática y
el comportamiento de la UI es en el cliente — DAST tiene poco que atacar aquí.
DAST brilla en aplicaciones con APIs, autenticación, y lógica server-side.

---

## 6. Seguridad en Runtime

**¿Qué es?** Controles que operan mientras la aplicación está corriendo en producción —
más allá del pipeline de CI/CD.

**Herramientas de Runtime Security:**

**Para contenedores (si la app fuera containerizada):**
- **Falco** — detección de comportamiento anómalo en syscalls del kernel
- **seccomp profiles** — restringen qué syscalls puede hacer el proceso
- **AppArmor / SELinux** — control de acceso mandatorio en el host

**Para repositorios de GitHub:**
- **GitHub Advanced Security** — incluye code scanning, secret scanning, y dependency review
  con alertas en tiempo real y dashboards de postura de seguridad

**Monitoreo de integridad de artefactos:**
- Alertas cuando la imagen desplegada no coincide con la firma esperada
- Comparar el hash del artefacto desplegado con el registrado en la provenance

**Para aplicaciones web en producción:**
- WAF (Web Application Firewall) — filtra tráfico malicioso
- Content Security Policy (CSP) — mitiga XSS en el navegador incluso si hay una vulnerabilidad
- Subresource Integrity (SRI) — verifica que scripts externos no han sido modificados

---

## 7. Branch Rulesets (GitHub Enterprise)

**¿Qué son?** La evolución moderna de Branch Protection, disponible también en
repositorios públicos y en GitHub Enterprise. Ofrecen:

- Política a nivel de **organización** (no solo por repositorio)
- **Bypass lists** — quién puede hacer excepciones y bajo qué condiciones
- **Insights** — auditoría de cuántas veces se hicieron bypasses y por quién
- Targeting por patrón de nombre de rama (`release/**`, `hotfix/**`)
- Aplicable también a **tags**

**Ejemplo de política enterprise:**
```
Ruleset: production-branches
  Target: branches matching "main", "release/*"
  Rules:
    - require pull request (2 approvals)
    - require status checks (CI, SAST, SCA)
    - restrict deletions
    - require linear history
  Bypass: Security team (emergency only) — logged to audit trail
```

---

## 8. Gestión de Secretos con Vault o Cloud KMS

**¿Qué es?** En lugar de guardar secretos como repositorio secrets de GitHub,
usar un sistema dedicado de gestión de secretos.

**HashiCorp Vault con OIDC:**
```yaml
- uses: hashicorp/vault-action@v3
  with:
    url: https://vault.example.com
    method: jwt
    jwtGithubAudience: ${{ secrets.VAULT_AUDIENCE }}
    role: my-github-role
    secrets: |
      secret/data/prod/database password | DB_PASSWORD
```

**Ventajas:**
- Rotación automática de secretos
- Auditoría granular de acceso
- Políticas de tiempo de vida (TTL) para secretos
- Un solo lugar para gestionar secretos de múltiples sistemas

---

## Camino de madurez recomendado

```
NIVEL 1 (Este laboratorio)
  ├── ESLint + Vitest + npm audit
  ├── CodeQL (SAST)
  ├── Secret Scanning
  ├── Branch Protection con Required Checks
  ├── Least Privilege (permissions)
  └── Dependabot

NIVEL 2 (Siguiente paso)
  ├── SBOM generado en cada build
  ├── SHA pinning para todas las Actions
  ├── OIDC para deployments a cloud
  ├── Branch Rulesets con bypass audit trail
  └── DAST básico sobre staging

NIVEL 3 (Madurez avanzada)
  ├── SLSA Level 2+ con provenance firmada
  ├── Sigstore/cosign para firma de artefactos
  ├── Vault para gestión de secretos
  ├── Runtime security (Falco, WAF)
  └── Programa de bug bounty

NIVEL 4 (Enterprise/Compliance)
  ├── SLSA Level 3
  ├── SBOM requerido contractualmente
  ├── Política de seguridad de organización (GitHub Rulesets)
  ├── Revisión de seguridad de terceros (penetration testing)
  └── Cumplimiento regulatorio (SOC 2, FedRAMP, ISO 27001)
```

El laboratorio cubre el Nivel 1 completamente. El gap más frecuente en organizaciones
reales es entre Nivel 1 y Nivel 2: tienen los controles básicos pero no el SBOM,
no tienen SHA pinning, y usan `secrets:` donde OIDC sería más seguro.
