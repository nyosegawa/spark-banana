/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Polyfill CSS.escape for jsdom (not available natively)
if (typeof globalThis.CSS === 'undefined') {
  (globalThis as any).CSS = {};
}
if (typeof CSS.escape !== 'function') {
  CSS.escape = function (value: string): string {
    // Simple CSS.escape polyfill for testing
    return value.replace(/([^\w-])/g, '\\$1');
  };
}

import { getUniqueSelector, captureElement } from './selector-engine';

// Helper to create DOM structure
function createDOM(html: string): Element {
  document.body.innerHTML = html;
  return document.body;
}

describe('getUniqueSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns id selector when element has a unique id', () => {
    createDOM('<div id="unique-el">Hello</div>');
    const el = document.getElementById('unique-el')!;
    const selector = getUniqueSelector(el);
    expect(selector).toBe('#unique-el');
  });

  it('returns data-testid selector when available', () => {
    createDOM('<div data-testid="my-component">Hello</div>');
    const el = document.querySelector('[data-testid="my-component"]')!;
    const selector = getUniqueSelector(el);
    expect(selector).toContain('data-testid');
    // Should be able to find the element with the selector
    expect(document.querySelectorAll(selector).length).toBe(1);
  });

  it('uses class-based selector when unique', () => {
    createDOM('<button class="btn-primary">Click</button>');
    const el = document.querySelector('.btn-primary')!;
    const selector = getUniqueSelector(el);
    expect(selector).toContain('btn-primary');
    expect(document.querySelectorAll(selector).length).toBe(1);
  });

  it('prefers id over data-testid over class', () => {
    createDOM('<button id="my-btn" data-testid="test-btn" class="btn-primary">Click</button>');
    const el = document.getElementById('my-btn')!;
    const selector = getUniqueSelector(el);
    expect(selector).toBe('#my-btn');
  });

  it('uses parent context when class alone is not unique', () => {
    createDOM(`
      <div id="container">
        <span class="label">First</span>
        <span class="label">Second</span>
      </div>
    `);
    const spans = document.querySelectorAll('.label');
    // Each span should get a unique selector
    const sel1 = getUniqueSelector(spans[0]);
    const sel2 = getUniqueSelector(spans[1]);
    expect(sel1).not.toBe(sel2);
    expect(document.querySelectorAll(sel1).length).toBe(1);
    expect(document.querySelectorAll(sel2).length).toBe(1);
  });

  it('falls back to nth-child path for elements without unique identifiers', () => {
    createDOM(`
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    `);
    const items = document.querySelectorAll('li');
    const sel = getUniqueSelector(items[1]);
    expect(document.querySelectorAll(sel).length).toBe(1);
    // nth-child selectors contain the :nth-child() syntax
    expect(sel).toMatch(/nth-child|li/);
  });

  it('filters out CSS-in-JS hash classes', () => {
    // CSS-in-JS hashes are typically 5+ lowercase chars like "abcde"
    createDOM('<div class="abcdef real-class">Content</div>');
    const el = document.querySelector('.real-class')!;
    const selector = getUniqueSelector(el);
    // Should use real-class, not abcdef
    expect(selector).toContain('real-class');
  });

  it('filters out classes starting with __', () => {
    createDOM('<div class="__internal visible-class">Content</div>');
    const el = document.querySelector('.visible-class')!;
    const selector = getUniqueSelector(el);
    expect(selector).not.toContain('__internal');
  });

  it('handles elements with special characters in id', () => {
    createDOM('<div id="my:special.id">Content</div>');
    const el = document.getElementById('my:special.id')!;
    const selector = getUniqueSelector(el);
    // CSS.escape should handle special chars
    expect(document.querySelectorAll(selector).length).toBe(1);
  });

  it('handles body element', () => {
    const selector = getUniqueSelector(document.body);
    expect(selector).toBeDefined();
    expect(typeof selector).toBe('string');
  });
});

describe('captureElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('captures basic element info', () => {
    createDOM('<button id="test-btn" class="primary large" data-action="submit">Submit Form</button>');
    const el = document.getElementById('test-btn')!;
    const capture = captureElement(el);

    expect(capture.tagName).toBe('button');
    expect(capture.selector).toBe('#test-btn');
    expect(capture.cssClasses).toContain('primary');
    expect(capture.cssClasses).toContain('large');
    expect(capture.textContent).toBe('Submit Form');
  });

  it('captures attributes excluding class, id, and style', () => {
    createDOM('<a id="link" class="nav-link" style="color: red" href="/about" target="_blank">About</a>');
    const el = document.getElementById('link')!;
    const capture = captureElement(el);

    expect(capture.attributes).toHaveProperty('href', '/about');
    expect(capture.attributes).toHaveProperty('target', '_blank');
    expect(capture.attributes).not.toHaveProperty('class');
    expect(capture.attributes).not.toHaveProperty('id');
    expect(capture.attributes).not.toHaveProperty('style');
  });

  it('captures bounding box with rounded values', () => {
    createDOM('<div id="box">Content</div>');
    const el = document.getElementById('box')!;

    // jsdom returns 0 for getBoundingClientRect by default
    const capture = captureElement(el);
    expect(capture.boundingBox).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  it('captures full DOM path', () => {
    createDOM('<div class="container"><p class="text">Hello</p></div>');
    const el = document.querySelector('.text')!;
    const capture = captureElement(el);

    expect(capture.fullPath).toContain('div');
    expect(capture.fullPath).toContain('p');
    expect(capture.fullPath).toContain('>');
  });

  it('captures generic selector (class-based)', () => {
    // Use a class with mixed case or special chars to avoid CSS-in-JS hash filter
    // (5+ lowercase-only chars like "title" get filtered as suspected CSS-in-JS hashes)
    createDOM('<div class="card"><span class="btn-title">Hello</span></div>');
    const el = document.querySelector('.btn-title')!;
    const capture = captureElement(el);

    expect(capture.genericSelector).toBeDefined();
    expect(capture.genericSelector).toContain('span');
    expect(capture.genericSelector).toContain('btn-title');
  });

  it('captures parent selector', () => {
    createDOM('<div id="parent"><span class="child">Child</span></div>');
    const el = document.querySelector('.child')!;
    const capture = captureElement(el);

    expect(capture.parentSelector).toContain('parent');
  });

  it('handles empty parent selector for top-level elements', () => {
    // Direct child of body - parentSelector should be for body
    createDOM('<div id="top-level">Hello</div>');
    const el = document.getElementById('top-level')!;
    const capture = captureElement(el);
    // Parent should be body
    expect(capture.parentSelector).toBeDefined();
  });

  it('truncates long text content to 200 chars', () => {
    const longText = 'x'.repeat(500);
    createDOM(`<div id="long">${longText}</div>`);
    const el = document.getElementById('long')!;
    const capture = captureElement(el);

    expect(capture.textContent.length).toBeLessThanOrEqual(200);
  });

  it('captures nearby text from siblings', () => {
    createDOM(`
      <div>
        <span>Before</span>
        <button id="target">Click</button>
        <span>After</span>
      </div>
    `);
    const el = document.getElementById('target')!;
    const capture = captureElement(el);

    expect(capture.nearbyText).toContain('Before');
    expect(capture.nearbyText).toContain('Click');
    expect(capture.nearbyText).toContain('After');
  });

  it('handles element with no siblings for nearby text', () => {
    createDOM('<div><button id="alone">Solo</button></div>');
    const el = document.getElementById('alone')!;
    const capture = captureElement(el);

    expect(capture.nearbyText).toContain('Solo');
  });

  it('captures element with no classes', () => {
    createDOM('<div id="no-class">Plain</div>');
    const el = document.getElementById('no-class')!;
    const capture = captureElement(el);

    expect(capture.cssClasses).toEqual([]);
    expect(capture.genericSelector).toBeDefined();
  });

  it('captures element with no attributes', () => {
    createDOM('<div><p>Simple paragraph</p></div>');
    const el = document.querySelector('p')!;
    const capture = captureElement(el);

    expect(Object.keys(capture.attributes)).toHaveLength(0);
  });
});
