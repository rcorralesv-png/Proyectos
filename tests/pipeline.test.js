import { describe, it, expect } from 'vitest';
import { runPipelineScenario, SCENARIOS, STAGE_DEFINITIONS } from '../src/pipeline.js';

describe('runPipelineScenario', () => {
  it('retorna null para un escenario inexistente', () => {
    expect(runPipelineScenario('nonexistent')).toBeNull();
    expect(runPipelineScenario('')).toBeNull();
    expect(runPipelineScenario(null)).toBeNull();
  });

  it('Construcción Exitosa — todas las etapas pasan', () => {
    const result = runPipelineScenario('healthy');
    expect(result).not.toBeNull();
    expect(result.stages.calidad.result).toBe('PASSED');
    expect(result.stages.pruebas.result).toBe('PASSED');
    expect(result.stages.sca.result).toBe('PASSED');
    expect(result.stages.sast.result).toBe('PASSED');
    expect(result.stages.revision.result).toBe('PASSED');
    expect(result.stages.merge.result).toBe('PASSED');
    expect(result.stages.deploy.result).toBe('PASSED');
  });

  it('Construcción Exitosa — no tiene finding de seguridad', () => {
    const result = runPipelineScenario('healthy');
    expect(result.finding).toBeNull();
  });

  it('Fallo de Lint — calidad falla, etapas posteriores bloqueadas', () => {
    const result = runPipelineScenario('lint-failure');
    expect(result.stages.calidad.result).toBe('FAILED');
    expect(result.stages.pruebas.result).toBe('BLOCKED');
    expect(result.stages.sca.result).toBe('BLOCKED');
    expect(result.stages.merge.result).toBe('BLOCKED');
    expect(result.stages.deploy.result).toBe('BLOCKED');
  });

  it('Fallo de Pruebas — calidad pasa, pruebas fallan', () => {
    const result = runPipelineScenario('test-failure');
    expect(result.stages.calidad.result).toBe('PASSED');
    expect(result.stages.pruebas.result).toBe('FAILED');
    expect(result.stages.sca.result).toBe('BLOCKED');
    expect(result.stages.merge.result).toBe('BLOCKED');
  });

  it('Dependencia Vulnerable — SCA falla con finding HIGH', () => {
    const result = runPipelineScenario('vulnerable-dependency');
    expect(result.stages.calidad.result).toBe('PASSED');
    expect(result.stages.pruebas.result).toBe('PASSED');
    expect(result.stages.sca.result).toBe('FAILED');
    expect(result.stages.sast.result).toBe('BLOCKED');
    expect(result.stages.merge.result).toBe('BLOCKED');
    expect(result.finding).not.toBeNull();
    expect(result.finding.severity).toBe('HIGH');
  });

  it('Hallazgo SAST — SCA pasa, SAST falla', () => {
    const result = runPipelineScenario('sast-finding');
    expect(result.stages.sca.result).toBe('PASSED');
    expect(result.stages.sast.result).toBe('FAILED');
    expect(result.stages.revision.result).toBe('BLOCKED');
    expect(result.stages.merge.result).toBe('BLOCKED');
  });

  it('Secreto Detectado — pipeline bloqueado desde el evento', () => {
    const result = runPipelineScenario('secret-detected');
    expect(result.stages.evento.result).toBe('FAILED');
    expect(result.stages.calidad.result).toBe('BLOCKED');
    expect(result.finding.severity).toBe('CRITICAL');
  });

  it('Revisión Rechazada — todos los checks pasan pero revisión falla', () => {
    const result = runPipelineScenario('review-rejected');
    expect(result.stages.sca.result).toBe('PASSED');
    expect(result.stages.sast.result).toBe('PASSED');
    expect(result.stages.revision.result).toBe('FAILED');
    expect(result.stages.merge.result).toBe('BLOCKED');
  });

  it('todos los escenarios tienen logs no vacíos', () => {
    Object.keys(SCENARIOS).forEach(scenarioId => {
      const result = runPipelineScenario(scenarioId);
      expect(result.logs, `${scenarioId} debe tener logs`).toBeInstanceOf(Array);
      expect(result.logs.length, `${scenarioId} debe tener al menos un log`).toBeGreaterThan(0);
    });
  });

  it('todos los escenarios tienen insight y discussion', () => {
    Object.keys(SCENARIOS).forEach(scenarioId => {
      const result = runPipelineScenario(scenarioId);
      expect(result.insight, `${scenarioId} debe tener insight`).toBeTruthy();
      expect(result.discussion, `${scenarioId} debe tener discussion`).toBeTruthy();
    });
  });

  it('todos los escenarios tienen nombre y descripción', () => {
    Object.keys(SCENARIOS).forEach(scenarioId => {
      const result = runPipelineScenario(scenarioId);
      expect(result.name, `${scenarioId} debe tener nombre`).toBeTruthy();
      expect(result.description, `${scenarioId} debe tener descripción`).toBeTruthy();
    });
  });
});

describe('STAGE_DEFINITIONS', () => {
  it('contiene al menos 8 etapas del pipeline', () => {
    expect(STAGE_DEFINITIONS.length).toBeGreaterThanOrEqual(8);
  });

  it('cada etapa tiene id, label e icon', () => {
    STAGE_DEFINITIONS.forEach(stage => {
      expect(stage.id, 'etapa debe tener id').toBeTruthy();
      expect(stage.label, 'etapa debe tener label').toBeTruthy();
      expect(stage.icon, 'etapa debe tener icon').toBeTruthy();
    });
  });
});
