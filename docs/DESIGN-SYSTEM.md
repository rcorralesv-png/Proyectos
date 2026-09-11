# Diseño de Hello Secure World

El acceso, los 11 laboratorios y el reporte final comparten una interfaz académica oscura, sobria y legible. La portada presenta la actividad sin anticipar las preguntas. Durante el recorrido, el progreso, las decisiones de seguridad y los resultados se muestran con texto explícito.

## Archivos del sistema

- `src/design-tokens.css`: paleta, tipografía Inter, espaciado, radios y colores semánticos. Los alias mantienen compatibles los componentes interactivos existentes.
- `src/components/SiteFrame.jsx`: marca, etiquetas técnicas, enlace para saltar al contenido y pie de página compartidos.
- `src/application.css`: botones, tarjetas, progreso, preguntas, resultados y adaptaciones para móvil.
- `src/interactive/theme.css`: adaptación visual de las nueve herramientas usadas por los 11 laboratorios.
- `src/interactive/icons.js`: SVG lineales estáticos para los constructores de DOM; las pantallas React usan Lucide.
- `src/screens/WelcomeScreen.css`: proporciones específicas del formulario de acceso.

## Decisiones

| Uso | Token |
| --- | --- |
| Fondo de página | `--background` |
| Tarjeta principal | `--surface` |
| Campos y contenedores internos | `--surface-secondary` |
| Texto principal y secundario | `--text-primary`, `--text-secondary` |
| Texto de ayuda | `--text-muted` |
| Acción principal | `--primary-button`, `--primary-button-hover` |
| Foco y selección | `--accent-soft` |
| Éxito, advertencia y error | `--status-pass`, `--status-warn`, `--status-fail` |

El azul identifica acciones, selección y foco. Las categorías técnicas usan etiquetas neutrales. Los colores de estado siempre se acompañan de palabras o símbolos. No se usan degradados decorativos, brillos pulsantes ni animaciones permanentes. Las animaciones del pipeline y del scanner representan el avance de la simulación.

Se elevó el contraste de los textos de ayuda y de los bordes de los campos respecto a la referencia: el placeholder alcanza 5.91:1 sobre el campo y el borde 3.24:1. Los botones tienen estados hover, focus, active y disabled. Las preguntas usan radios nativos; los campos tienen etiquetas y los errores se vinculan con `aria-describedby`.

En móvil se ocultan las etiquetas del encabezado y los paneles se apilan. El pipeline, la matriz y la tabla de resultados tienen desplazamiento propio accesible por teclado para conservar su estructura. Se respeta `prefers-reduced-motion`.

### Escala y adaptación de las pantallas

Las dimensiones de la referencia se adaptan al uso real en portátil y móvil. El acceso tiene un ancho máximo de 640 px, padding fluido de 20–32 px, título de 26–36 px y campos/botón de 48 px. A 1366 × 768 el formulario y el pie quedan visibles sin desplazar la página. Los campos conservan una fuente de 16 px para evitar el zoom automático al escribir en móvil.

Los laboratorios conservan el ancho útil de 1100 px para sus herramientas, con títulos de 24–32 px, padding fluido de 16–32 px y controles de al menos 44 px. Los resultados comparten esa escala. Los títulos usan `rem` y límites fluidos; no se reduce toda la página con `zoom` ni se oculta contenido para hacerla caber. El contenido largo puede desplazarse verticalmente y las tablas conservan su desplazamiento local. El encabezado permite saltos de línea y el progreso usa columnas que pueden contraerse.

### Flujo del gate y feedback de la nota

Los seis pasos del laboratorio 3 son visibles desde el inicio. La animación resalta cada paso, anuncia su avance y desbloquea la pregunta al completar el flujo. La opacidad y la transformación se restablecen explícitamente en el tema para evitar que los estilos históricos oculten las tarjetas. El botón se sitúa antes de los pasos.

`src/grade-feedback.js` conserva las calificaciones S/A/B/C/D/D-/F y asocia cada una con una etiqueta, un emoji y un comentario humorístico de apoyo. El total, la letra y el porcentaje usan verde para 80–100, ámbar para 60–79 y rojo para 0–59, con los tokens de estado existentes. La etiqueta y el comentario explican el resultado sin depender del color; el emoji es decorativo para lectores de pantalla. Este feedback no modifica los puntos ni el reporte verificable.

## Mantener y extender

Usar `SiteFrame` para nuevas pantallas y los tokens para nuevas variantes. Evitar colores y estilos de presentación inline; se admite un valor dinámico como el ancho del temporizador. Los estilos antiguos de `styles.css` mantienen la estructura de las simulaciones: las adaptaciones del sitio React se delimitan bajo `.hsw-workspace` para evitar colisiones con las páginas históricas.

Los cambios visuales se revisan junto con el código: comprobar escritorio y móvil, foco por teclado y al menos un estado activo y uno de resultado del componente afectado. Ejecutar build, lint y las pruebas existentes antes de integrar. Registrar aquí cualquier cambio de token o patrón compartido.
