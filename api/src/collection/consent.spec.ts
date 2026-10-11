import { BadRequestException } from '@nestjs/common';
import { assertValidConsent, CONSENT_REQUIRED } from './consent';

const STARTED = '2026-10-10T14:00:00.000Z';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse() as { code: string };
  }
  throw new Error('expected a refusal');
};

describe('assertValidConsent', () => {
  it('aceita o consentimento dado antes do início e devolve o instante do aceite', () => {
    const at = assertValidConsent({ accepted: true, acceptedAt: '2026-10-10T13:59:00.000Z' }, STARTED);
    expect(at.toISOString()).toBe('2026-10-10T13:59:00.000Z');
  });

  it('aceita o consentimento no mesmo instante do início', () => {
    expect(() => assertValidConsent({ accepted: true, acceptedAt: STARTED }, STARTED)).not.toThrow();
  });

  it('recusa quando não há consentimento', () => {
    expect(codeOf(() => assertValidConsent(undefined, STARTED)).code).toBe(CONSENT_REQUIRED);
    expect(codeOf(() => assertValidConsent(null, STARTED)).code).toBe(CONSENT_REQUIRED);
  });

  it('recusa quando o entrevistado não aceitou', () => {
    expect(codeOf(() => assertValidConsent({ accepted: false, acceptedAt: '2026-10-10T13:59:00.000Z' }, STARTED)).code).toBe(
      CONSENT_REQUIRED,
    );
  });

  it('recusa aceite sem data e hora válidas', () => {
    expect(codeOf(() => assertValidConsent({ accepted: true }, STARTED)).code).toBe(CONSENT_REQUIRED);
    expect(codeOf(() => assertValidConsent({ accepted: true, acceptedAt: 'ontem' }, STARTED)).code).toBe(CONSENT_REQUIRED);
  });

  it('recusa aceite registrado depois do início da coleta', () => {
    expect(codeOf(() => assertValidConsent({ accepted: true, acceptedAt: '2026-10-10T14:00:01.000Z' }, STARTED)).code).toBe(
      CONSENT_REQUIRED,
    );
  });
});
