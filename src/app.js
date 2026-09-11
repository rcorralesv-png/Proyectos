/**
 * Genera un saludo para la demo de código seguro.
 * Esta función es intencionalmente simple — la profundidad está en cómo se
 * muestra el resultado (textContent vs innerHTML) y lo que eso implica.
 */
export function generateGreeting(name) {
  const trimmed = String(name ?? '').trim();
  return trimmed
    ? `¡Hola, ${trimmed}! Bienvenido al laboratorio de pipeline seguro.`
    : '¡Hola! Bienvenido al laboratorio de pipeline seguro.';
}
