# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | Français | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

Outil d’annotation UI en temps réel pour le développement local. Cliquez un élément dans le navigateur, décrivez la correction, puis `spark-bridge` envoie la tâche vers Codex MCP.

## Démarrage rapide

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

Endpoint par défaut : `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`) : `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`) : `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

`projectRoot` est requis en tant que prop (généralement via env, par ex. `import.meta.env.VITE_SPARK_PROJECT_ROOT`).

## Modes

- Spark : correction basée sur un élément
- Banana : suggestion basée sur capture d’écran puis application via Codex

## Configuration bridge

```bash
npx spark-bridge [options]
```

Par défaut, les clients sans `projectRoot` enregistré sont refusés.

## Développement

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## Licence

MIT
