# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | हिन्दी

लोकल डेवलपमेंट के लिए रियल-टाइम UI annotation टूल। ब्राउज़र में किसी element पर क्लिक करें, बदलाव लिखें, और `spark-bridge` उस काम को Codex MCP तक भेज देता है।

## क्विक स्टार्ट

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

डिफ़ॉल्ट endpoint: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

## मोड

- Spark: element आधारित fix request
- Banana: screenshot आधारित सुझाव और Codex से apply

## डेवलपमेंट

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## लाइसेंस

MIT
