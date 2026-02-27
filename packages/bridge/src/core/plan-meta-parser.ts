import type { SparkPlanVariant } from '../types';

export function parseSparkPlanMeta(output: string): SparkPlanVariant[] {
  const match = output.match(/__SPARK_PLAN_META__\s*([\s\S]*?)\s*__SPARK_PLAN_META__/);
  if (!match) return [];

  let raw = match[1].trim();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SparkPlanVariant[];
  } catch {
    // no-op
  }

  raw = raw.replace(/""+/g, '"');
  raw = raw.replace(/\}\s*\{/g, '}, {');
  raw = raw.replace(/,\s*\]/g, ']');

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      console.log('   ⚠ __SPARK_PLAN_META__ required JSON repair');
      return parsed as SparkPlanVariant[];
    }
  } catch (err) {
    console.log(`   ⚠ Failed to parse __SPARK_PLAN_META__ even after repair: ${err instanceof Error ? err.message : err}`);
    console.log(`   ⚠ Raw: ${raw.slice(0, 300)}`);
  }

  const variants: SparkPlanVariant[] = [];
  const objRegex = /"index"\s*:\s*(\d+)\s*,\s*"title"\s*:\s*"([^"]*?)"\s*,\s*"description"\s*:\s*"([^"]*?)"/g;
  let m;
  while ((m = objRegex.exec(raw)) !== null) {
    variants.push({ index: parseInt(m[1], 10), title: m[2], description: m[3] });
  }

  if (variants.length > 0) {
    console.log(`   ⚠ __SPARK_PLAN_META__ extracted ${variants.length} variants via regex fallback`);
  } else {
    console.log('   ⚠ Failed to extract any variants from __SPARK_PLAN_META__');
  }
  return variants;
}
