# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | Italiano | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

Strumento di annotazione UI in tempo reale per lo sviluppo locale. Clicca un elemento nel browser, descrivi la modifica e `spark-bridge` instrada la richiesta verso Codex MCP.

## Avvio rapido

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

Endpoint predefinito: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

`projectRoot` è obbligatorio come prop (di solito da env, ad es. `import.meta.env.VITE_SPARK_PROJECT_ROOT`).

## Modalità

- Spark: richieste di fix basate su elemento
- Banana: suggerimenti da screenshot e applicazione con Codex

## Sviluppo

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## Licenza

MIT
