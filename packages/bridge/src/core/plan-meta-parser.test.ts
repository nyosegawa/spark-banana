import { describe, expect, it } from 'vitest';
import { parseSparkPlanMeta } from './plan-meta-parser';

describe('parseSparkPlanMeta', () => {
  it('parses valid JSON block', () => {
    const output = `before\n__SPARK_PLAN_META__\n[{"index":0,"title":"A","description":"desc"}]\n__SPARK_PLAN_META__\nafter`;
    expect(parseSparkPlanMeta(output)).toEqual([{ index: 0, title: 'A', description: 'desc' }]);
  });

  it('repairs common malformed JSON patterns', () => {
    const output = `__SPARK_PLAN_META__\n[{"index":0,"title":"A","description":"x",}{"index":1,"title":"B","description":"y"}]\n__SPARK_PLAN_META__`;
    const parsed = parseSparkPlanMeta(output);
    expect(parsed).toEqual([
      { index: 0, title: 'A', description: 'x' },
      { index: 1, title: 'B', description: 'y' },
    ]);
  });

  it('falls back to regex extraction when JSON parsing fails', () => {
    const output = `__SPARK_PLAN_META__\nBROKEN "index": 2, "title": "C", "description": "z"\n__SPARK_PLAN_META__`;
    expect(parseSparkPlanMeta(output)).toEqual([{ index: 2, title: 'C', description: 'z' }]);
  });

  it('returns empty when no block exists', () => {
    expect(parseSparkPlanMeta('no metadata')).toEqual([]);
  });
});
