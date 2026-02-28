# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | Deutsch | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

Echtzeit-UI-Annotation für lokale Entwicklung. Klicken Sie ein Element im Browser an, beschreiben Sie den Fix, und `spark-bridge` leitet den Auftrag an Codex MCP weiter.

## Schnellstart

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

Standard-Endpoint: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

`projectRoot` ist als Prop erforderlich (typisch aus env, z. B. `import.meta.env.VITE_SPARK_PROJECT_ROOT`).

## Modi

- Spark: elementbasierte Fix-Anfragen
- Banana: screenshotbasierte Vorschläge, anschließend Anwendung mit Codex

## Entwicklung

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## Lizenz

MIT
