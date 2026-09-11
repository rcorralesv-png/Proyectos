import { describe, it, expect } from 'vitest';
import { getControlDetails, getBlastRadius, CONTROL_MATRIX } from '../src/controls.js';

describe('getControlDetails', () => {
  it('retorna los detalles del control SCA', () => {
    const control = getControlDetails('sca');
    expect(control).not.toBeNull();
    expect(control.id).toBe('sca');
    expect(control.category).toBe('SCA');
    expect(control.decision).toContain('BLOCK');
  });

  it('retorna los detalles del control ESLint', () => {
    const control = getControlDetails('eslint');
    expect(control).not.toBeNull();
    expect(control.decision).toContain('PASS');
    expect(control.controlType).toBe('quality');
  });

  it('retorna los detalles del control SAST', () => {
    const control = getControlDetails('sast');
    expect(control).not.toBeNull();
    expect(control.id).toBe('sast');
  });

  it('retorna los detalles del control least-privilege', () => {
    const control = getControlDetails('least-privilege');
    expect(control).not.toBeNull();
    expect(control.controlType).toBe('access');
  });

  it('retorna null para un ID inexistente', () => {
    expect(getControlDetails('nonexistent')).toBeNull();
    expect(getControlDetails('')).toBeNull();
    expect(getControlDetails(null)).toBeNull();
  });

  it('todos los controles tienen los campos requeridos', () => {
    const required = [
      'id', 'name', 'category', 'type', 'stage',
      'threat', 'policy', 'decision', 'strength', 'limitation', 'residualRisk',
    ];
    CONTROL_MATRIX.forEach(control => {
      required.forEach(field => {
        expect(
          control[field],
          `Control "${control.id}" debe tener el campo "${field}"`
        ).toBeDefined();
        expect(
          control[field],
          `Control "${control.id}" campo "${field}" no debe estar vacío`
        ).not.toBe('');
      });
    });
  });

  it('contiene al menos 10 controles en la matriz', () => {
    expect(CONTROL_MATRIX.length).toBeGreaterThanOrEqual(10);
  });
});

describe('getBlastRadius', () => {
  it('retorna configuración de least privilege con impacto limitado', () => {
    const result = getBlastRadius('least-privilege');
    expect(result.mode).toBe('least-privilege');
    expect(result.severity).toBe('limited');
    expect(result.permissions).toEqual({ contents: 'read' });
    expect(result.impact).toBeInstanceOf(Array);
    expect(result.impact.length).toBeGreaterThan(0);
  });

  it('retorna configuración de permisos excesivos con impacto alto', () => {
    const result = getBlastRadius('excessive');
    expect(result.mode).toBe('excessive');
    expect(result.severity).toBe('high');
    expect(result.permissions).toBe('write-all');
    expect(result.impact).toBeInstanceOf(Array);
  });

  it('retorna permisos excesivos para modo no reconocido', () => {
    const result = getBlastRadius('unknown-mode');
    expect(result.severity).toBe('high');
    expect(result.mode).toBe('excessive');
  });

  it('ambos modos incluyen descripción y permissionsDisplay', () => {
    const lp = getBlastRadius('least-privilege');
    const ex = getBlastRadius('excessive');
    expect(lp.description).toBeTruthy();
    expect(ex.description).toBeTruthy();
    expect(lp.permissionsDisplay).toContain('contents');
    expect(ex.permissionsDisplay).toContain('write-all');
  });
});
