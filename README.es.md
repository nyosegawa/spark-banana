# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | Español | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

Herramienta de anotación UI en tiempo real para desarrollo local. Haz clic en un elemento del navegador, describe el cambio y `spark-bridge` envía la tarea a Codex MCP.

## Inicio rápido

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

Endpoint por defecto: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

## Modos

- Spark: solicitudes por elemento
- Banana: sugerencias por captura de pantalla y aplicación con Codex

## Desarrollo

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## Licencia

MIT
