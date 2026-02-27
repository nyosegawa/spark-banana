# spark-banana

Real-time UI annotation overlay for React apps.

Use this package with `spark-bridge`.

## Install

```bash
npm install spark-banana
```

Peer dependencies:
- `react >= 18`
- `react-dom >= 18`

## Quick Start

```tsx
import { SparkAnnotation } from 'spark-banana';

export default function App() {
  return <SparkAnnotation />;
}
```

By default, it connects to `ws://localhost:3700`.

Set project root via env.

Vite (`.env`):

```bash
VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

Next.js (`.env.local`):

```bash
NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

Styles are injected automatically when you import `SparkAnnotation`.
If your CSP blocks inline `<style>` tags, import the stylesheet explicitly:

```tsx
import 'spark-banana/styles.css';
```

## Props

```tsx
<SparkAnnotation
  bridgeUrl="ws://localhost:3700"
  projectRoot="/absolute/path/to/your/project"
  position="bottom-right" // or "bottom-left"
/>
```

## Full Docs

- Repository: https://github.com/nyosegawa/spark-banana
- Bridge package: https://www.npmjs.com/package/spark-bridge
