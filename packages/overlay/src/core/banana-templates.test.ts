import { describe, expect, it } from 'vitest';
import { bananaTemplates, getTemplateName } from './banana-templates';

describe('banana templates', () => {
  it('contains multiple predefined templates', () => {
    expect(bananaTemplates.length).toBeGreaterThan(5);
  });

  it('returns locale-specific name when available', () => {
    const tpl = bananaTemplates[0];
    expect(getTemplateName(tpl, 'ja')).toBe(tpl.name.ja);
  });

  it('falls back to English for unsupported locale key', () => {
    const tpl = bananaTemplates[0];
    expect(getTemplateName(tpl, 'xx' as any)).toBe(tpl.name.en);
  });
});
