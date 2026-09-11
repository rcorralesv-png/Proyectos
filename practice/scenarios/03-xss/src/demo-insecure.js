/**
 * ARCHIVO DE PRÁCTICA EDUCATIVA — CÓDIGO INTENCIONALMENTE INSEGURO
 *
 * Este archivo usa innerHTML con datos de usuario para que CodeQL (js/xss)
 * detecte el flujo peligroso como parte del laboratorio Hello Secure World.
 *
 * Compara con src/app.js que usa textContent correctamente.
 * CodeQL trazará: parámetro 'name' (fuente) → innerHTML (sumidero)
 */

/**
 * Versión INSEGURA del saludo. NO usar en producción.
 * @param {string} name - Nombre del usuario (entrada no confiable)
 * @param {HTMLElement} outputElement - Elemento donde mostrar el saludo
 */
export function renderGreetingInsecure(name, outputElement) {
  // ✗ INSEGURO: innerHTML interpreta el contenido como HTML
  // Si name = '<script>alert("XSS")</script>', el navegador lo ejecuta
  outputElement.innerHTML = `<p>¡Hola, ${name}!</p>`;
}
