# spark-banana

English | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

![spark-banana header](.github/assets/spark-banana-header.jpeg)

Real-time UI annotation for local development. Click an element in the browser, describe the fix, and `spark-bridge` routes the task to Codex MCP.

```text
Browser (overlay)            Bridge server                  Your codebase
┌───────────────────────┐    ┌────────────────────────┐     ┌───────────────┐
│ Select element/region │───▶│ Prompt + queue + MCP   │────▶│ Files updated │
│ Add instruction       │◀───│ Status/progress over WS│     │ (HMR refresh) │
└───────────────────────┘    └────────────────────────┘     └───────────────┘
```

## Quick Start

### 1. Install

```bash
npm install -D spark-banana spark-bridge
```

### 2. Start bridge server

```bash
npx spark-bridge
```

Default endpoint: `ws://localhost:3700`

### 3. Add overlay to your app

```tsx
import { SparkAnnotation } from 'spark-banana';

<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`):

```bash
VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

Next.js (`.env.local`):

```bash
NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

If your CSP blocks inline style tags, add:

```tsx
import 'spark-banana/styles.css';
```

Next.js example:

```tsx
'use client';
import { SparkAnnotation } from 'spark-banana';

export default function Spark() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <SparkAnnotation projectRoot={process.env.NEXT_PUBLIC_SPARK_PROJECT_ROOT} />;
}
```

### 4. Annotate

1. Enable the floating button.
2. Select an element (Spark mode) or capture a region (Banana mode).
3. Enter instruction and submit.
4. Track progress and logs in the panel.

## Prerequisites

- Codex CLI installed and authenticated

```bash
npm install -g @openai/codex
codex
```

- React 18+
- Local dev server with HMR
- Git repository

## Modes

- Spark mode: element-based fix requests.
- Banana mode: screenshot-based suggestions via Gemini, then apply selected approach with Codex.

## Configuration

### `spark-bridge` CLI

```bash
npx spark-bridge [options]

Options:
  --port <n>           WebSocket port (default: 3700)
  --project <path>     Project root directory (default: cwd)
  --allow-default-project-root  Allow unregistered clients to use --project/cwd fallback (legacy)
  --model <name>       Codex model (default: gpt-5.3-codex-spark)
  --concurrency <n>    Max concurrent jobs (default: 1)
  --banana-model <n>   Gemini model for banana mode (optional)
  --dry-run            Mock mode (no Codex CLI)
  --help, -h           Show help
```

### `SparkAnnotation` props

```tsx
<SparkAnnotation
  bridgeUrl="ws://localhost:3700"
  projectRoot="/absolute/path/to/your/project"
  position="bottom-right" // or "bottom-left"
/>
```

`projectRoot` is required as a prop (typically from env, e.g. `import.meta.env.VITE_SPARK_PROJECT_ROOT`).
By default, `spark-bridge` rejects unregistered clients unless `--allow-default-project-root` is passed.

## Main Features

- WebSocket bridge with per-client routing
- Reconnection-safe in-flight message routing (logs/plan updates survive client reconnect)
- Approval flow for executable commands
- Plan mode (variant generation + selective apply)
- Follow-up annotation workflow
- Region capture and image-based suggestion flow
- i18n (12 locales)
- Local persistence for theme/model/locale/mode

## Architecture

### Workspace packages

- `packages/overlay` (`spark-banana`): React UI overlay
- `packages/bridge` (`spark-bridge`): WebSocket server + Codex MCP bridge

### Bridge modules

- `src/server.ts`: orchestration entry (WS handlers, queue integration)
- `src/services/connection-registry.ts`: client/projectRoot registry
- `src/services/message-router.ts`: sender-aware message delivery and reconnect fallback
- `src/services/approval-coordinator.ts`: pending approval lifecycle
- `src/services/annotation-queue.ts`: concurrency-safe processing queue
- `src/services/codex-event-interpreter.ts`: Codex notification normalization
- `src/core/plan-meta-parser.ts`: robust plan metadata parsing/fallback

### Overlay modules

- `src/components/SparkAnnotation.tsx`: top-level UI orchestration
- `src/components/annotation-items.tsx`: annotation/banana list item UI
- `src/components/log-utils.tsx`: progress/log rendering helpers
- `src/components/hooks/useSparkSelection.ts`: hover/select state machine
- `src/components/hooks/useBridge.ts`: bridge connection + message handling
- `src/components/hooks/useBanana.ts`: banana capture/request/apply flow

## Development

```bash
git clone git@github.com:nyosegawa/spark-banana.git
cd spark-banana
npm install
```

Run example apps:

```bash
npm run dev        # Vite example
npm run dev:next   # Next.js example
```

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

## License

MIT
