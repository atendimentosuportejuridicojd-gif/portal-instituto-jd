import { describe, expect, test } from 'bun:test';
import { ambientePagamentos, fimDataProva, validarDataProva } from './simulado-pagamento';

describe('Simulados payment validation', () => {
  const now = new Date('2026-10-10T01:00:00Z');
  test('allows today in Brasilia, rejects past or impossible dates', () => {
    expect(validarDataProva('2026-10-09', now)).toBe('2026-10-09');
    expect(() => validarDataProva('2026-10-08', now)).toThrow();
    expect(() => validarDataProva('2026-02-30', now)).toThrow();
    expect(() => validarDataProva('2026-13-01', now)).toThrow();
  });
  test('access ends at the end of the exam day in Brasilia', () => {
    expect(fimDataProva('2026-10-09')).toBe('2026-10-10T02:59:59.999Z');
  });
  test('missing credentials never silently select live', () => {
    expect(ambientePagamentos('pk_test_example')).toBe('sandbox');
    expect(ambientePagamentos('pk_live_example')).toBe('live');
    expect(() => ambientePagamentos(undefined)).toThrow();
    expect(() => ambientePagamentos('invalid')).toThrow();
  });
});