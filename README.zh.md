# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | 中文 | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

用于本地开发的实时UI标注工具。你在浏览器中点击元素并输入修改说明后，`spark-bridge` 会将任务路由到 Codex MCP。

## 快速开始

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

默认端点：`ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite（`.env`）:

```bash
VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

Next.js（`.env.local`）:

```bash
NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

## 主要模式

- Spark：基于元素的修复请求
- Banana：基于截图生成方案并由 Codex 应用

## bridge 配置

```bash
npx spark-bridge [options]

Options:
  --port <n>
  --project <path>
  --allow-default-project-root
  --model <name>
  --concurrency <n>
  --banana-model <n>
  --dry-run
  --help, -h
```

默认情况下，如果未注册 `projectRoot`，`spark-bridge` 会拒绝请求。

## 开发

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## 许可证

MIT
