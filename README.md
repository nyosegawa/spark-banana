# spark-banana

![spark-banana header](.github/assets/spark-banana-header.jpeg)

Real-time UI annotation for local development. Click an element in the browser, describe the fix, and `spark-bridge` routes the task to Codex MCP.

```
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

<SparkAnnotation />
```

Next.js example:

```tsx
'use client';
import { SparkAnnotation } from 'spark-banana';

export default function Spark() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <SparkAnnotation />;
}
```

### 4. Annotate

1. Enable the floating button.
2. Select an element (Spark mode) or capture a region (Banana mode).
3. Enter instruction and submit.
4. Track progress/logs in the panel.

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
  projectRoot="/path/to/project"
  position="bottom-right" // or "bottom-left"
/>
```

### Project root resolution order

1. `projectRoot` prop
2. `<meta name="spark-project-root" content="...">`
3. `SPARK_PROJECT_ROOT` env var
4. auto-detected from request origin + process cwd lookup
5. bridge `--project` / bridge process cwd

## Main Features

- WebSocket bridge with per-client routing
- Approval flow for executable commands
- Plan mode (variant generation + selective apply)
- Follow-up annotation workflow
- Region capture and image-based suggestion flow
- i18n (12 locales)
- Local persistence for theme/model/locale/mode

## Architecture (latest)

### Workspace packages

- `packages/overlay` (`spark-banana`): React UI overlay
- `packages/bridge` (`spark-bridge`): WebSocket server + Codex MCP bridge

### Bridge modules

- `src/server.ts`: orchestration entry (WS handlers, queue integration)
- `src/services/connection-registry.ts`: client/projectRoot registry
- `src/services/message-router.ts`: sender-aware message delivery
- `src/services/approval-coordinator.ts`: pending approval lifecycle
- `src/services/annotation-queue.ts`: concurrency-safe processing queue
- `src/services/project-root-detector.ts`: origin-based project root detection
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
