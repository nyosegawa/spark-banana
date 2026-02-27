# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | Português | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

Ferramenta de anotação de UI em tempo real para desenvolvimento local. Clique em um elemento no navegador, descreva a correção e o `spark-bridge` encaminha a tarefa para o Codex MCP.

## Início rápido

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

Endpoint padrão: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

## Modos

- Spark: correções baseadas em elemento
- Banana: sugestões por screenshot com aplicação via Codex

## Desenvolvimento

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## Licença

MIT
