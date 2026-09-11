# Hello Secure World — Práctica Real en GitHub

Esta carpeta contiene escenarios hands-on que debes ejecutar en tu propio fork del repositorio.
El objetivo es que experimentes en vivo los controles de seguridad que estudiaste en el simulador.

## Panorama general

| # | Escenario | Control | Resultado esperado |
|---|-----------|---------|-------------------|
| 01 | Dependencia vulnerable | SCA (npm audit) | CI falla con HIGH vuln |
| 02 | Token en código fuente | Secret Scanning | Push Protection bloquea el push |
| 03 | DOM XSS con innerHTML | SAST (CodeQL) | Alerta `js/xss` en el PR |

Cada escenario incluye:
1. Un archivo con el problema intencionado
2. `INSTRUCTIONS.md` con los pasos detallados
3. Un flujo completo: introducir el problema → observar el control → aplicar el fix → verificar

## Flujo general

```
1. Fork del repositorio → clonar → configurar (ver SETUP.md)
2. Escenario 01: crear rama → introducir package.json → abrir PR → observar fallo SCA → corregir
3. Escenario 02: crear rama → copiar settings.js → intentar push → ver bloqueo → corregir
4. Escenario 03: crear rama → copiar demo-insecure.js → abrir PR → ver alerta CodeQL → corregir
5. Recopilar el código HSW-PRACTICE del comentario de CI en cada PR
6. Compartir tus códigos (HSW del simulador + HSW-PRACTICE por escenario) con tu instructor
```

## Prerequisitos

- Cuenta de GitHub (gratuita)
- Git instalado localmente
- Node.js 18 o superior
- Completar la configuración en [`SETUP.md`](SETUP.md) antes de empezar

## Escenarios

- [01 — SCA: Dependencia Vulnerable](scenarios/01-sca/INSTRUCTIONS.md)
- [02 — Secret Scanning: Token en Código](scenarios/02-secret/INSTRUCTIONS.md)
- [03 — SAST/CodeQL: DOM XSS con innerHTML](scenarios/03-xss/INSTRUCTIONS.md)

## Código de verificación

Cuando completes un escenario correctamente (PR con todos los checks en verde),
el workflow `lab-validate.yml` publicará automáticamente en el PR un comentario con:

```
HSW-PRACTICE-[escenario]-XXXXXXXXXXXXXXXX
```

Este es tu código de verificación de servidor — complementa el código HSW que generó
el simulador y permite al instructor validar que completaste la práctica en GitHub real.

## Preguntas frecuentes

**¿Necesito pagar GitHub?**
No. Todas las características usadas (GitHub Actions, Secret Scanning, Code scanning)
están disponibles en repositorios públicos gratuitos.

**¿Qué pasa si el token en el escenario 02 no es bloqueado?**
Secret Scanning + Push Protection debe estar habilitado en tu fork. Verifica la
configuración en `SETUP.md`. En repositorios públicos está habilitado por defecto.

**¿CodeQL tardó más de 15 minutos?**
El primer análisis puede tardar. Si después de 20 minutos no hay resultado,
cancela el run en Actions y vuelve a hacer push para reiniciarlo.

**¿Puedo hacer los escenarios en cualquier orden?**
Sí. Son independientes entre sí, aunque `SETUP.md` solo necesitas configurarlo una vez.
