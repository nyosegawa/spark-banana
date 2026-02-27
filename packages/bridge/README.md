# spark-bridge

Bridge server for `spark-banana`.

It connects browser annotations to Codex MCP and handles queueing, approvals, and progress streaming.

## Install

```bash
npm install -D spark-bridge
```

## Run

```bash
npx spark-bridge
```

Default WebSocket endpoint: `ws://localhost:3700`

## CLI Options

```bash
npx spark-bridge [options]

Options:
  --port <n>           WebSocket port (default: 3700)
  --project <path>     Project root directory (default: cwd)
  --model <name>       Codex model (default: gpt-5.3-codex-spark)
  --concurrency <n>    Max concurrent jobs (default: 1)
  --banana-model <n>   Gemini model for banana mode (optional)
  --dry-run            Mock mode (no Codex CLI)
```

## Full Docs

- Repository: https://github.com/nyosegawa/spark-banana
- Overlay package: https://www.npmjs.com/package/spark-banana
