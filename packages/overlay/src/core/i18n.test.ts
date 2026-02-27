import { describe, expect, it } from 'vitest';
import { LOCALES, LOCALE_LABELS, t } from './i18n';

describe('i18n', () => {
  it('returns localized strings for known locale', () => {
    expect(t('approvalTitle', 'ja')).toBe('実行許可');
    expect(t('approvalTitle', 'en')).toBe('Approval Required');
  });

  it('falls back to English when locale key is missing', () => {
    expect(t('approvalTitle', 'xx' as any)).toBe('Approval Required');
  });

  it('has labels for all configured locales', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale]).toBeTypeOf('string');
      expect(LOCALE_LABELS[locale].length).toBeGreaterThan(0);
    }
  });
});
