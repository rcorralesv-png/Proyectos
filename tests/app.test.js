import { describe, it, expect } from 'vitest';
import { generateGreeting } from '../src/app.js';

describe('generateGreeting', () => {
  it('saluda por nombre', () => {
    expect(generateGreeting('Eddy')).toBe(
      '¡Hola, Eddy! Bienvenido al laboratorio de pipeline seguro.'
    );
  });

  it('saluda sin nombre cuando el input está vacío', () => {
    expect(generateGreeting('')).toBe(
      '¡Hola! Bienvenido al laboratorio de pipeline seguro.'
    );
  });

  it('saluda sin nombre cuando el input es null', () => {
    expect(generateGreeting(null)).toBe(
      '¡Hola! Bienvenido al laboratorio de pipeline seguro.'
    );
  });

  it('saluda sin nombre cuando el input es undefined', () => {
    expect(generateGreeting(undefined)).toBe(
      '¡Hola! Bienvenido al laboratorio de pipeline seguro.'
    );
  });

  it('elimina espacios en blanco al inicio y final del nombre', () => {
    expect(generateGreeting('  Ana  ')).toBe(
      '¡Hola, Ana! Bienvenido al laboratorio de pipeline seguro.'
    );
  });

  it('saluda sin nombre cuando el input es solo espacios en blanco', () => {
    expect(generateGreeting('   ')).toBe(
      '¡Hola! Bienvenido al laboratorio de pipeline seguro.'
    );
  });

  it('incluye el nombre completo en el saludo', () => {
    const result = generateGreeting('María García');
    expect(result).toContain('María García');
  });

  it('retorna siempre una cadena de texto', () => {
    expect(typeof generateGreeting('Test')).toBe('string');
    expect(typeof generateGreeting('')).toBe('string');
    expect(typeof generateGreeting(null)).toBe('string');
  });
});
