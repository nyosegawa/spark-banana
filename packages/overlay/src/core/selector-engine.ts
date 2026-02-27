import type { ElementCapture } from './types';

/**
 * DOM要素から最短の一意CSSセレクタを生成する
 */
export function getUniqueSelector(el: Element): string {
  // 1. id があればそれを使用
  if (el.id) {
    const sel = `#${CSS.escape(el.id)}`;
    if (isUnique(sel)) return sel;
  }

  // 2. data-testid があれば使用
  const testId = el.getAttribute('data-testid');
  if (testId) {
    const sel = `[data-testid="${CSS.escape(testId)}"]`;
    if (isUnique(sel)) return sel;
  }

  // 3. ユニークなクラス組み合わせを探索
  const classes = Array.from(el.classList).filter(
    (c) => !c.startsWith('__') && !c.match(/^[a-z]{5,}$/) // CSS-in-JS hash除外
  );
  if (classes.length > 0) {
    const tag = el.tagName.toLowerCase();
    for (const cls of classes) {
      const sel = `${tag}.${CSS.escape(cls)}`;
      if (isUnique(sel)) return sel;
    }
    // 親コンテキスト付き
    const parent = el.parentElement;
    if (parent) {
      const parentSel = getSimpleSelector(parent);
      for (const cls of classes) {
        const sel = `${parentSel} > ${tag}.${CSS.escape(cls)}`;
        if (isUnique(sel)) return sel;
      }
    }
  }

  // 4. nth-child で一意にする
  return buildNthChildPath(el);
}

/**
 * 要素の全情報をキャプチャ
 */
export function captureElement(el: Element): ElementCapture {
  const rect = el.getBoundingClientRect();
  const parent = el.parentElement;

  // 周辺テキストを取得
  const nearbyText = getNearbyText(el);

  // 主要な属性を収集
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (['class', 'id', 'style'].includes(attr.name)) continue;
    attributes[attr.name] = attr.value;
  }

  const uniqueSelector = getUniqueSelector(el);

  const capture: ElementCapture = {
    selector: uniqueSelector,
    genericSelector: buildGenericSelector(el),
    fullPath: getFullPath(el),
    tagName: el.tagName.toLowerCase(),
    textContent: (el.textContent || '').trim().slice(0, 200),
    cssClasses: Array.from(el.classList),
    attributes,
    boundingBox: {
      x: Math.round(rect.x),
      y: Math.round(rect.y + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    parentSelector: parent ? getUniqueSelector(parent) : '',
    nearbyText,
  };

  // React Component Tree
  const reactTree = getReactComponentTree(el as HTMLElement);
  if (reactTree) capture.reactComponents = reactTree;

  // Computed Styles
  const styles = getRelevantComputedStyles(el);
  if (styles) capture.computedStyles = styles;

  // Accessibility info
  const a11y = getAccessibilityInfo(el);
  if (a11y) capture.accessibility = a11y;

  return capture;
}

/**
 * 指定矩形内にある主要なDOM要素のサマリーを返す。
 * Codexが対象コンポーネントを特定するのに使う。
 */
export function captureElementsInRegion(
  region: { x: number; y: number; width: number; height: number },
): string {
  const rx = region.x;
  const ry = region.y;
  const rr = rx + region.width;
  const rb = ry + region.height;

  const seen = new Set<Element>();
  const items: string[] = [];

  // Sample points in a grid to find elements
  const stepX = Math.max(20, region.width / 8);
  const stepY = Math.max(20, region.height / 8);
  for (let x = rx + 5; x < rr; x += stepX) {
    for (let y = ry + 5; y < rb; y += stepY) {
      const el = document.elementFromPoint(x, y);
      if (!el || seen.has(el) || el.closest('.sa-overlay')) continue;
      seen.add(el);
    }
  }

  // Also add elements whose bounding box overlaps the region
  const allElements = document.body.querySelectorAll('*');
  for (const el of allElements) {
    if (seen.has(el) || el.closest('.sa-overlay')) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const overlaps = rect.left < rr && rect.right > rx && rect.top < rb && rect.bottom > ry;
    if (overlaps) seen.add(el);
  }

  // Filter to meaningful elements (skip generic wrappers)
  for (const el of seen) {
    const tag = el.tagName.toLowerCase();
    if (['html', 'body', 'head', 'script', 'style', 'link', 'meta'].includes(tag)) continue;

    const id = el.id ? `#${el.id}` : '';
    const cls = Array.from(el.classList).filter(c => !c.startsWith('sa-')).slice(0, 3).join('.');
    const selector = id || (cls ? `${tag}.${cls}` : tag);
    const react = getReactComponentTree(el as HTMLElement);
    const text = (el.textContent || '').trim().slice(0, 40);

    let line = `- ${selector}`;
    if (react) line += ` [${react}]`;
    if (text) line += ` "${text}"`;
    items.push(line);
  }

  // Deduplicate and limit
  const unique = [...new Set(items)].slice(0, 30);
  return unique.join('\n');
}

// --- ヘルパー ---

function isUnique(selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function getSimpleSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tag = el.tagName.toLowerCase();
  const cls = el.classList[0];
  return cls ? `${tag}.${CSS.escape(cls)}` : tag;
}

function buildNthChildPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && parts.length < 5) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }

    const siblings = Array.from(parent.children).filter(
      (c: Element) => c.tagName === current!.tagName
    );

    if (siblings.length === 1) {
      parts.unshift(tag);
    } else {
      const idx = siblings.indexOf(current) + 1;
      parts.unshift(`${tag}:nth-child(${idx})`);
    }

    // 一意性チェック
    const candidate = parts.join(' > ');
    if (isUnique(candidate)) return candidate;

    current = parent;
  }

  return parts.join(' > ');
}

function getFullPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase();
    const cls = current.classList[0];
    parts.unshift(cls ? `${tag}.${CSS.escape(cls)}` : tag);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

/**
 * 位置情報（nth-child等）を除去した汎用セレクタを生成する
 * 同種の要素すべてにマッチするセレクタ（クラスベース）
 */
function buildGenericSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).filter(
    (c) => !c.startsWith('__') && !c.match(/^[a-z]{5,}$/)
  );

  // クラスがあればタグ+クラスで返す
  if (classes.length > 0) {
    const clsPart = classes.map((c) => `.${CSS.escape(c)}`).join('');
    // 親コンテキストも付ける（クラスベースで）
    const parent = el.parentElement;
    if (parent) {
      const parentTag = parent.tagName.toLowerCase();
      const parentCls = Array.from(parent.classList).filter(
        (c) => !c.startsWith('__') && !c.match(/^[a-z]{5,}$/)
      );
      if (parentCls.length > 0) {
        return `${parentTag}.${CSS.escape(parentCls[0])} > ${tag}${clsPart}`;
      }
      return `${parentTag} > ${tag}${clsPart}`;
    }
    return `${tag}${clsPart}`;
  }

  // クラスがなければタグのみ（親付き）
  const parent = el.parentElement;
  if (parent) {
    const parentSimple = getSimpleSelector(parent);
    return `${parentSimple} > ${tag}`;
  }
  return tag;
}

function getNearbyText(el: Element): string {
  const prev = el.previousElementSibling;
  const next = el.nextElementSibling;
  const parts: string[] = [];

  if (prev?.textContent) {
    parts.push(prev.textContent.trim().slice(-50));
  }
  parts.push(`[${el.textContent?.trim().slice(0, 50) || ''}]`);
  if (next?.textContent) {
    parts.push(next.textContent.trim().slice(0, 50));
  }

  return parts.join(' ... ');
}

/**
 * React Fiber からコンポーネント階層を取得する
 */
function getReactComponentTree(el: HTMLElement): string {
  try {
    const fiberKey = Object.keys(el).find(
      (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    );
    if (!fiberKey) return '';

    let fiber = (el as unknown as Record<string, unknown>)[fiberKey] as {
      return?: unknown;
      type?: { name?: string; displayName?: string } | string;
    } | null;

    const names: string[] = [];
    const seen = new Set<unknown>();
    while (fiber && names.length < 15) {
      if (seen.has(fiber)) break;
      seen.add(fiber);

      if (fiber.type && typeof fiber.type !== 'string') {
        const name = fiber.type.displayName || fiber.type.name;
        if (
          name &&
          name.length > 1 &&
          !['Fragment', 'Suspense', 'StrictMode', 'Profiler', 'Provider', 'Consumer'].includes(name)
        ) {
          names.push(name);
        }
      }

      fiber = fiber.return as typeof fiber;
    }

    return names.reverse().join(' > ');
  } catch {
    return '';
  }
}

/**
 * 重要な Computed Styles を抽出する
 */
const STYLE_PROPS = [
  'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily',
  'padding', 'margin', 'display', 'position', 'borderRadius',
  'border', 'opacity', 'gap', 'flexDirection', 'justifyContent', 'alignItems',
] as const;

const STYLE_DEFAULTS = new Set([
  '0px', '0', 'rgba(0, 0, 0, 0)', 'none', 'normal', 'auto', 'static',
  'visible', 'stretch', 'start', 'baseline', 'row',
]);

const STYLE_ALIASES: Record<string, string> = {
  backgroundColor: 'bg',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontFamily: 'font-family',
  borderRadius: 'border-radius',
  flexDirection: 'flex-direction',
  justifyContent: 'justify-content',
  alignItems: 'align-items',
};

function getRelevantComputedStyles(el: Element): string {
  try {
    const computed = window.getComputedStyle(el);
    const parts: string[] = [];

    for (const prop of STYLE_PROPS) {
      const val = computed.getPropertyValue(
        prop.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
      );
      if (!val || STYLE_DEFAULTS.has(val)) continue;
      // fontFamily: 最初のフォントだけ
      const display = prop === 'fontFamily'
        ? val.split(',')[0].trim().replace(/"/g, '')
        : val;
      const label = STYLE_ALIASES[prop] || prop;
      parts.push(`${label}: ${display}`);
    }

    return parts.join(', ');
  } catch {
    return '';
  }
}

/**
 * アクセシビリティ / ARIA 情報を抽出する
 */
const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DETAILS', 'SUMMARY']);

function getAccessibilityInfo(el: Element): string {
  const parts: string[] = [];

  const role = el.getAttribute('role');
  if (role) parts.push(`role="${role}"`);

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) parts.push(`aria-label="${ariaLabel}"`);

  const ariaDescribedby = el.getAttribute('aria-describedby');
  if (ariaDescribedby) parts.push(`aria-describedby="${ariaDescribedby}"`);

  const ariaExpanded = el.getAttribute('aria-expanded');
  if (ariaExpanded) parts.push(`aria-expanded="${ariaExpanded}"`);

  const ariaHidden = el.getAttribute('aria-hidden');
  if (ariaHidden) parts.push(`aria-hidden="${ariaHidden}"`);

  const tabindex = el.getAttribute('tabindex');
  if (tabindex) parts.push(`tabindex=${tabindex}`);

  if (INTERACTIVE_TAGS.has(el.tagName)) {
    parts.push('interactive');
  }

  return parts.join(', ');
}
