import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt-builder';
import type { Annotation } from './types';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'test-1',
    timestamp: Date.now(),
    comment: 'Make this button red',
    type: 'click',
    status: 'pending',
    element: {
      selector: '#submit-btn',
      genericSelector: 'button.btn-primary',
      fullPath: 'body > div.app > form > button.btn-primary',
      tagName: 'button',
      textContent: 'Submit',
      cssClasses: ['btn-primary', 'large'],
      attributes: { type: 'submit', 'data-testid': 'submit-btn' },
      boundingBox: { x: 100, y: 200, width: 120, height: 40 },
      parentSelector: 'form.login-form',
      nearbyText: 'Username ... [Submit] ... Cancel',
    },
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('returns a non-empty string', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('includes the user comment', () => {
    const result = buildPrompt(makeAnnotation({ comment: 'Change background to blue' }));
    expect(result).toContain('Change background to blue');
  });

  it('includes the UI Fix Request heading', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('# UI Fix Request');
  });

  it('includes the URGENT notice', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('URGENT');
  });

  it('includes User Request section with the comment', () => {
    const result = buildPrompt(makeAnnotation({ comment: 'Fix spacing' }));
    expect(result).toContain('## User Request');
    expect(result).toContain('"Fix spacing"');
  });

  it('includes selected text when provided', () => {
    const result = buildPrompt(makeAnnotation({ selectedText: 'Hello World' }));
    expect(result).toContain('**Selected text**: "Hello World"');
  });

  it('does not include selected text when not provided', () => {
    const result = buildPrompt(makeAnnotation({ selectedText: undefined }));
    expect(result).not.toContain('**Selected text**');
  });

  it('includes Target Element section with element info table', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('## Target Element');
    expect(result).toContain('| **Tag** | `<button>` |');
    expect(result).toContain('| **Generic Selector** | `button.btn-primary` |');
    expect(result).toContain('| **Unique Selector** | `#submit-btn` |');
    expect(result).toContain('| **Full DOM Path** | `body > div.app > form > button.btn-primary` |');
    expect(result).toContain('| **Parent** | `form.login-form` |');
  });

  it('includes CSS classes when present', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('`.btn-primary`');
    expect(result).toContain('`.large`');
  });

  it('does not include CSS classes row when there are none', () => {
    const annotation = makeAnnotation();
    annotation.element.cssClasses = [];
    const result = buildPrompt(annotation);
    expect(result).not.toContain('**CSS Classes**');
  });

  it('includes attributes', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('| **attr: type** | `submit` |');
    expect(result).toContain('| **attr: data-testid** | `submit-btn` |');
  });

  it('does not include attributes row when there are none', () => {
    const annotation = makeAnnotation();
    annotation.element.attributes = {};
    const result = buildPrompt(annotation);
    expect(result).not.toContain('**attr:');
  });

  it('includes bounding box info', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('x=100, y=200, w=120, h=40');
  });

  it('includes text content when present', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('### Element Text Content');
    expect(result).toContain('Submit');
  });

  it('does not include text content section when empty', () => {
    const annotation = makeAnnotation();
    annotation.element.textContent = '';
    const result = buildPrompt(annotation);
    expect(result).not.toContain('### Element Text Content');
  });

  it('includes nearby text when present', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('### Nearby Text (context)');
    expect(result).toContain('Username ... [Submit] ... Cancel');
  });

  it('does not include nearby text section when empty', () => {
    const annotation = makeAnnotation();
    annotation.element.nearbyText = '';
    const result = buildPrompt(annotation);
    expect(result).not.toContain('### Nearby Text (context)');
  });

  it('includes rules section', () => {
    const result = buildPrompt(makeAnnotation());
    expect(result).toContain('## Rules');
    expect(result).toContain('rg');
    expect(result).toContain('Generic Selector');
  });

  it('truncates long text content to 500 chars', () => {
    const annotation = makeAnnotation();
    annotation.element.textContent = 'a'.repeat(600);
    const result = buildPrompt(annotation);
    // The text in the prompt should be truncated
    const textSection = result.split('### Element Text Content')[1];
    expect(textSection).toBeDefined();
    // The content between ``` markers should be at most 500 chars
    const codeBlock = textSection!.split('```')[1];
    expect(codeBlock!.trim().length).toBeLessThanOrEqual(500);
  });

  it('truncates long nearby text to 500 chars', () => {
    const annotation = makeAnnotation();
    annotation.element.nearbyText = 'b'.repeat(600);
    const result = buildPrompt(annotation);
    const nearbySection = result.split('### Nearby Text (context)')[1];
    expect(nearbySection).toBeDefined();
    const codeBlock = nearbySection!.split('```')[1];
    expect(codeBlock!.trim().length).toBeLessThanOrEqual(500);
  });

  it('truncates long attribute values to 200 chars', () => {
    const annotation = makeAnnotation();
    annotation.element.attributes = { href: 'x'.repeat(300) };
    const result = buildPrompt(annotation);
    expect(result).toContain('**attr: href**');
    // The value in the table should be truncated
    const attrLine = result.split('\n').find(l => l.includes('**attr: href**'));
    expect(attrLine).toBeDefined();
    // Value between backticks should be at most 200 chars
    const backtickContent = attrLine!.match(/`([^`]*)`/);
    expect(backtickContent).toBeTruthy();
    expect(backtickContent![1].length).toBeLessThanOrEqual(200);
  });

  it('handles minimal annotation with empty strings', () => {
    const annotation = makeAnnotation();
    annotation.element.textContent = '';
    annotation.element.nearbyText = '';
    annotation.element.cssClasses = [];
    annotation.element.attributes = {};
    annotation.comment = '';
    const result = buildPrompt(annotation);
    expect(result).toContain('# UI Fix Request');
    expect(result).toContain('## Rules');
  });

  it('produces consistent output structure', () => {
    const result = buildPrompt(makeAnnotation());
    const lines = result.split('\n');
    // Should start with the heading
    expect(lines[0]).toBe('# UI Fix Request');
    // Should contain the main sections in order
    const sectionOrder = ['# UI Fix Request', '## User Request', '## Target Element', '## Rules'];
    let lastIndex = -1;
    for (const section of sectionOrder) {
      const idx = lines.findIndex(l => l === section);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });
});
