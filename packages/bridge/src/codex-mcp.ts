import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { buildPrompt } from './prompt-builder';
import type { Annotation } from './types';
import { interpretCodexEventNotification } from './services/codex-event-interpreter';

export interface CodexMcpConfig {
  model: string;
  projectRoot: string;
  timeout: number;
}

export interface CodexResult {
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
  threadId?: string;
}

type ProgressCallback = (message: string) => void;
type ApprovalCallback = (command: string) => Promise<boolean>;

export class CodexMcp {
  private config: CodexMcpConfig;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private ready = false;
  private currentProgressCallback: ProgressCallback | null = null;
  private currentApprovalCallback: ApprovalCallback | null = null;
  private currentThreadId: string | null = null;
  // Approval decisions queued by exec_approval_request notifications.
  private pendingApprovalQueue: Array<Promise<boolean>> = [];
  // Backward-compatible manual approval path (used when no callback is supplied).
  private pendingApprovalResolvers: Array<(approved: boolean) => void> = [];

  constructor(config: Partial<CodexMcpConfig> & { projectRoot: string }) {
    this.config = {
      model: config.model || 'gpt-5.3-codex-spark',
      projectRoot: config.projectRoot,
      timeout: config.timeout || 600_000,
    };
  }

  /**
   * モデルを変更する
   */
  setModel(model: string) {
    this.config.model = model;
  }

  /**
   * 外部から approval を解決する（UI からの応答）
   */
  resolveApproval(approved: boolean) {
    const resolver = this.pendingApprovalResolvers.shift();
    if (resolver) resolver(approved);
  }

  async start(): Promise<void> {
    this.transport = new StdioClientTransport({
      command: 'codex',
      args: ['mcp-server'],
      env: { ...process.env } as Record<string, string>,
      stderr: 'pipe',
    });

    this.client = new Client(
      { name: 'spark-bridge', version: '0.1.0' },
      { capabilities: {} }
    );

    // codex/event 通知ハンドラ
    this.client.fallbackNotificationHandler = async (notification) => {
      interpretCodexEventNotification(notification, {
        setThreadId: (threadId) => {
          this.currentThreadId = threadId;
        },
        touchActivity: () => {
          this.currentProgressCallback?.('');
        },
        onProgress: (message) => {
          this.currentProgressCallback?.(message);
        },
        onApprovalRequest: (cmd) => {
          if (this.currentApprovalCallback) {
            this.pendingApprovalQueue.push(
              Promise.resolve(this.currentApprovalCallback(cmd))
                .then((approved) => Boolean(approved))
                .catch(() => false)
            );
          } else {
            this.pendingApprovalQueue.push(
              new Promise<boolean>((resolve) => {
                this.pendingApprovalResolvers.push(resolve);
              })
            );
          }
        },
      });
    };

    // codex からの JSON-RPC リクエスト（approval 等）をハンドル
    this.client.fallbackRequestHandler = async (request) => {
      console.log(`   [codex -> client] method: ${request.method}`);

      // approval 系のリクエストに対応: ユーザーの応答を待つ
      const pendingApproval = this.pendingApprovalQueue.shift();
      if (pendingApproval) {
        const approved = await pendingApproval;
        return { approved };
      }

      // デフォルト: 承認
      return { approved: true };
    };

    await this.client.connect(this.transport);

    // stderr
    const proc = (this.transport as unknown as { _process?: { stderr?: NodeJS.ReadableStream } })._process;
    if (proc?.stderr) {
      proc.stderr.on('data', (data: Buffer) => {
        for (const line of data.toString().trim().split('\n')) {
          if (line.trim()) {
            console.log(`   [codex stderr] ${line.trim().slice(0, 150)}`);
          }
        }
      });
    }

    const tools = await this.client.listTools();
    const toolNames = tools.tools.map((t) => t.name);
    console.log(`✓ Codex MCP server connected (tools: ${toolNames.join(', ')})`);
    this.ready = true;
  }

  async execute(
    annotation: Annotation,
    projectRoot?: string,
    onProgress?: ProgressCallback,
    onApproval?: ApprovalCallback,
    options?: { modelOverride?: string; promptOverride?: string },
  ): Promise<CodexResult> {
    if (!this.client || !this.ready) {
      return { success: false, output: '', error: 'Codex MCP server not connected', durationMs: 0 };
    }

    const cwd = projectRoot || this.config.projectRoot;
    const prompt = options?.promptOverride ?? buildPrompt(annotation);
    const start = Date.now();

    this.currentApprovalCallback = onApproval || null;
    this.currentProgressCallback = onProgress || null;
    this.currentThreadId = null;
    onProgress?.('Codex に送信中...');

    console.log(`   cwd: ${cwd}`);
    console.log(`   model: ${this.config.model}`);
    console.log(`   prompt: ${prompt.slice(0, 200)}...`);

    // Watchdog: 90秒無通信でタイムアウト
    const controller = new AbortController();
    let lastActivity = Date.now();

    const origProgress = this.currentProgressCallback;
    this.currentProgressCallback = (msg: string) => {
      lastActivity = Date.now();
      if (msg) origProgress?.(msg);
    };

    const watchdog = setInterval(() => {
      const idle = Date.now() - lastActivity;
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      if (idle > 180_000) {
        console.log(`   [timeout] ${(idle / 1000).toFixed(0)}s idle, aborting`);
        controller.abort();
      } else if (Number(elapsed) % 30 === 0 && Number(elapsed) > 0) {
        console.log(`   [${elapsed}s elapsed]`);
      }
    }, 5_000);

    try {
      const result = await this.client.callTool(
        {
          name: 'codex',
          arguments: {
            prompt,
            cwd,
            model: options?.modelOverride ?? this.config.model,
            sandbox: 'workspace-write',
            'approval-policy': 'on-request',
          },
        },
        undefined,
        { timeout: this.config.timeout, signal: controller.signal }
      );

      const durationMs = Date.now() - start;

      let output = '';
      if (result.content && Array.isArray(result.content)) {
        output = (result.content as Array<{ type: string; text?: string }>)
          .filter((c) => c.type === 'text')
          .map((c) => c.text || '')
          .join('\n');
      }

      // Extract threadId from output (codex returns it in the result)
      const threadId = this.currentThreadId || undefined;

      if (result.isError) {
        console.log(`\n   codex error: ${output.slice(0, 200)}`);
        return { success: false, output, error: output || 'Codex error', durationMs, threadId };
      }

      if (output.trim()) {
        console.log(`\n   codex output:\n${output.trim().split('\n').map((l) => `     ${l}`).join('\n')}`);
      }

      return { success: true, output, durationMs, threadId };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`\n   codex exception (${(durationMs / 1000).toFixed(1)}s): ${errorMsg}`);
      return { success: false, output: '', error: errorMsg, durationMs };
    } finally {
      clearInterval(watchdog);
      this.currentProgressCallback = null;
      this.currentApprovalCallback = null;
      this.pendingApprovalQueue = [];
      this.pendingApprovalResolvers = [];
    }
  }

  /**
   * Continue an existing Codex session using codex-reply tool.
   */
  async reply(
    threadId: string,
    prompt: string,
    onProgress?: ProgressCallback,
    onApproval?: ApprovalCallback,
  ): Promise<CodexResult> {
    if (!this.client || !this.ready) {
      return { success: false, output: '', error: 'Codex MCP server not connected', durationMs: 0 };
    }

    const start = Date.now();
    this.currentApprovalCallback = onApproval || null;
    this.currentProgressCallback = onProgress || null;
    this.currentThreadId = threadId;
    onProgress?.('Codex に送信中...');

    console.log(`   threadId: ${threadId}`);
    console.log(`   prompt: ${prompt.slice(0, 200)}...`);

    const controller = new AbortController();
    let lastActivity = Date.now();

    const origProgress = this.currentProgressCallback;
    this.currentProgressCallback = (msg: string) => {
      lastActivity = Date.now();
      if (msg) origProgress?.(msg);
    };

    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > 90_000) {
        console.log(`   [timeout] idle, aborting`);
        controller.abort();
      }
    }, 5_000);

    try {
      const result = await this.client.callTool(
        {
          name: 'codex-reply',
          arguments: { threadId, prompt },
        },
        undefined,
        { timeout: this.config.timeout, signal: controller.signal }
      );

      const durationMs = Date.now() - start;
      let output = '';
      if (result.content && Array.isArray(result.content)) {
        output = (result.content as Array<{ type: string; text?: string }>)
          .filter((c) => c.type === 'text')
          .map((c) => c.text || '')
          .join('\n');
      }

      if (result.isError) {
        console.log(`\n   codex-reply error: ${output.slice(0, 200)}`);
        return { success: false, output, error: output || 'Codex error', durationMs, threadId };
      }

      if (output.trim()) {
        console.log(`\n   codex-reply output:\n${output.trim().split('\n').map((l) => `     ${l}`).join('\n')}`);
      }

      return { success: true, output, durationMs, threadId };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`\n   codex-reply exception (${(durationMs / 1000).toFixed(1)}s): ${errorMsg}`);
      return { success: false, output: '', error: errorMsg, durationMs, threadId };
    } finally {
      clearInterval(watchdog);
      this.currentProgressCallback = null;
      this.currentApprovalCallback = null;
      this.pendingApprovalQueue = [];
      this.pendingApprovalResolvers = [];
    }
  }

  async restart(): Promise<void> {
    console.log('🔄 Restarting Codex MCP server...');
    await this.stop();
    await this.start();
    console.log('✓ Codex MCP server restarted');
  }

  async stop(): Promise<void> {
    this.ready = false;
    try { await this.client?.close(); } catch { /* */ }
    try { await this.transport?.close(); } catch { /* */ }
    this.client = null;
    this.transport = null;
  }
}
