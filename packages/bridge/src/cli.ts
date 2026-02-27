#!/usr/bin/env node

import path from 'path';
import { BridgeServer } from './server';

async function main() {
  const args = process.argv.slice(2);

  // ヘルプ
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
⚡ spark-bridge — Bridge server for spark-banana

Usage:
  spark-bridge [options]

Options:
  --port <n>         WebSocket port (default: 3700)
  --project <path>   Project root directory (default: cwd)
  --model <name>     Codex model (default: gpt-5.3-codex-spark)
  --concurrency <n>  Max concurrent codex processes (default: 1)
  --banana-model <n> Nanobanana model for banana mode (default: gpt-5.3-codex)
  --dry-run          Mock mode: simulate Codex responses without CLI
  --help, -h         Show this help

Example:
  spark-bridge --project ./my-app
  spark-bridge --dry-run    # No Codex CLI needed
`);
    process.exit(0);
  }

  // 引数パース
  function getArg(flag: string, defaultVal: string): string {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
  }

  const port = parseInt(getArg('--port', '3700'), 10);
  const projectRoot = path.resolve(getArg('--project', process.cwd()));
  const model = getArg('--model', 'gpt-5.3-codex-spark');
  const concurrency = parseInt(getArg('--concurrency', '1'), 10);
  const bananaModel = getArg('--banana-model', '');
  const dryRun = args.includes('--dry-run');

  console.log('⚡ spark-bridge starting...\n');

  if (dryRun) {
    console.log('Mode: dry-run (Codex CLI not required)\n');
  } else {
    console.log('Mode: MCP (codex mcp-server)\n');
  }

  // サーバー起動
  const server = new BridgeServer({
    port,
    codex: { projectRoot, model },
    concurrency,
    dryRun,
    nanobanana: bananaModel ? { model: bananaModel } : undefined,
  });

  await server.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
