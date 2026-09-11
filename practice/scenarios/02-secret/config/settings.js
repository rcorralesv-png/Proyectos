/**
 * ARCHIVO DE PRÁCTICA EDUCATIVA — NO CONTIENE CREDENCIALES REALES
 *
 * Este archivo está diseñado intencionalmente para activar GitHub Secret Scanning
 * como parte del laboratorio Hello Secure World.
 *
 * El token mostrado es INVÁLIDO y fue REVOCADO inmediatamente después de crearse.
 * Su único propósito es enseñar cómo Push Protection detecta patrones de tokens.
 *
 * NUNCA almacenes tokens reales en el código fuente.
 */

const config = {
  apiUrl: 'https://api.example.com',
  // Token inválido y revocado — solo para práctica de Secret Scanning
  // GitHub detectará el patrón github_pat_... y bloqueará el push
  token: 'github_pat_11AAAAAA0AAAAAAAAAAAAA_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

export default config;
