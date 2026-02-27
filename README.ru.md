# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | Русский | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

Инструмент для аннотирования UI в реальном времени при локальной разработке. Нажмите элемент в браузере, опишите исправление, и `spark-bridge` отправит задачу в Codex MCP.

## Быстрый старт

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

Эндпоинт по умолчанию: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

## Режимы

- Spark: исправления по выбранному элементу
- Banana: предложения по скриншоту и применение через Codex

## Разработка

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## Лицензия

MIT
