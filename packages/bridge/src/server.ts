import { WebSocketServer, WebSocket } from 'ws';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CodexMcp, type CodexMcpConfig } from './codex-mcp';
import { Nanobanana } from './nanobanana';
import { buildBananaApplyPrompt, buildSparkPlanPrompt, buildSparkPlanApplyPrompt, buildSparkPlanCancelPrompt } from './prompt-builder';
import type { Annotation, BananaRequest, BananaSuggestion, ClientMessage } from './types';
import { ConnectionRegistry } from './services/connection-registry';
import { MessageRouter } from './services/message-router';
import { ApprovalCoordinator } from './services/approval-coordinator';
import { AnnotationQueue } from './services/annotation-queue';
import { parseSparkPlanMeta } from './core/plan-meta-parser';

export interface BridgeServerConfig {
  /** WebSocket port (default: 3700) */
  port: number;
  /** Codex config */
  codex: Partial<CodexMcpConfig> & { projectRoot: string };
  /** Max concurrent codex processes (default: 1) */
  concurrency: number;
  /** Dry-run mode: simulate Codex responses without actually calling CLI */
  dryRun?: boolean;
  /** Nanobanana (banana mode) config */
  nanobanana?: { model?: string; apiKey?: string };
}

interface QueueItem {
  annotation: Annotation;
  projectRoot: string;
  sender: WebSocket;
  plan?: boolean;
}

function isAddrInUse(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'EADDRINUSE'
  );
}

// ─── Server ────────────────────────────────────────────

export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private codex: CodexMcp;
  private config: BridgeServerConfig;
  private connections: ConnectionRegistry;
  private messages = new MessageRouter();
  private approvals = new ApprovalCoordinator();
  private queue: AnnotationQueue<QueueItem>;
  /** Map annotationId → Codex threadId for session continuity */
  private threadMap = new Map<string, string>();
  private nanobanana: Nanobanana | null = null;
  private bananaRequests = new Map<string, BananaRequest>();
  private bananaApiKey: string | null = null;

  constructor(config: BridgeServerConfig) {
    this.config = config;
    this.codex = new CodexMcp(config.codex);
    this.connections = new ConnectionRegistry(config.codex.projectRoot);
    this.queue = new AnnotationQueue(config.concurrency, async (item) => {
      await this.processQueueItem(item);
    });

    if (config.nanobanana) {
      this.nanobanana = new Nanobanana(config.nanobanana);
    }
  }

  async start() {
    if (!this.config.dryRun) {
      console.log('Starting Codex MCP server...');
      await this.codex.start();
    }

    try {
      this.wss = new WebSocketServer({ port: this.config.port });
    } catch (err) {
      if (isAddrInUse(err)) {
        console.log(`⚡ spark-bridge already running on port ${this.config.port}, skipping.`);
        await this.codex.stop().catch(() => {});
        return;
      }
      throw err;
    }

    this.wss.on('error', async (err) => {
      if (isAddrInUse(err)) {
        console.log(`⚡ spark-bridge already running on port ${this.config.port}, skipping.`);
        await this.codex.stop().catch(() => {});
        return;
      }
      throw err;
    });

    this.wss.on('connection', (ws, req) => {
      this.connections.addClient(ws);

      const detected = this.connections.setProjectRootFromOrigin(ws, req.headers.origin);
      if (detected && req.headers.origin) {
        console.log(`📂 Auto-detected project: ${detected} (from ${req.headers.origin})`);
      }

      this.messages.send(ws, { type: 'connected' });

      ws.on('message', (data) => {
        try {
          const msg: ClientMessage = JSON.parse(data.toString());
          if (msg.type === 'banana_request') {
            console.log(`📩 ${msg.type} (${msg.payload.id})`);
          } else if (msg.type !== 'ping') {
            console.log(`📩 ${msg.type}`);
          }
          this.handleMessage(ws, msg);
        } catch {
          console.log(`⚠ Malformed message: ${String(data).slice(0, 100)}`);
        }
      });

      ws.on('close', () => {
        this.connections.removeClient(ws);
        this.messages.removeSocket(ws);
      });
    });

    console.log(`⚡ spark-bridge listening on ws://localhost:${this.config.port}`);
    console.log(`   Project: ${this.config.codex.projectRoot} (default)`);
    if (this.config.dryRun) {
      console.log('   Mode:    dry-run (mock responses)');
    } else {
      console.log('   Mode:    MCP (codex mcp-server)');
      console.log(`   Model:   ${this.config.codex.model || 'gpt-5.3-codex-spark'}`);
    }
    console.log('   Waiting for annotations...');
    console.log();
  }

  async stop() {
    await this.codex.stop();
    this.wss?.close();
    this.approvals.clearAll(false);
    this.connections.clear();
    this.messages.clear();
    this.queue.clear();
  }

  private getProjectRoot(ws: WebSocket): string {
    return this.connections.getProjectRoot(ws);
  }

  private handleMessage(ws: WebSocket, msg: ClientMessage) {
    switch (msg.type) {
      case 'register':
        this.connections.setProjectRoot(ws, msg.projectRoot);
        console.log(`📂 Client registered: ${msg.projectRoot}`);
        break;
      case 'annotation':
        this.enqueue(msg.payload, this.getProjectRoot(ws), ws, msg.plan);
        break;
      case 'approval_response':
        console.log(`   [approval] user ${msg.approved ? 'approved' : 'denied'}: ${msg.annotationId}`);
        this.resolveApproval(msg.annotationId, msg.approved);
        break;
      case 'ping':
        this.messages.send(ws, { type: 'pong' });
        break;
      case 'restart_codex':
        console.log('🔄 Received restart_codex request');
        this.restartCodex(ws);
        break;
      case 'set_model':
        console.log(`🧠 Model changed: ${msg.model}`);
        this.codex.setModel(msg.model);
        break;
      case 'banana_request': {
        const fast = msg.fast ?? false;
        console.log(`🍌 Received banana_request (apiKey: ${msg.apiKey ? 'yes' : 'no'}, model: ${msg.model || 'default'}, fast: ${fast})`);
        if (msg.apiKey) this.bananaApiKey = msg.apiKey;
        this.ensureNanobanana(msg.apiKey, msg.model);
        this.handleBananaRequest(msg.payload, this.getProjectRoot(ws), ws, fast);
        break;
      }
      case 'plan_apply':
        this.handlePlanApply(msg.annotationId, msg.approach, this.getProjectRoot(ws), ws);
        break;
      case 'banana_apply':
        this.handleBananaApply(msg.requestId, msg.suggestion, this.getProjectRoot(ws), ws);
        break;
    }
  }

  private async restartCodex(sender: WebSocket) {
    if (this.config.dryRun) {
      console.log('⚠ restart_codex ignored in dry-run mode');
      this.messages.send(sender, { type: 'restart_complete', success: false, error: 'dry-run mode' });
      return;
    }

    try {
      await this.codex.restart();
      this.messages.send(sender, { type: 'restart_complete', success: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ Codex restart failed: ${errorMsg}`);
      this.messages.send(sender, { type: 'restart_complete', success: false, error: errorMsg });
    }
  }

  private enqueue(annotation: Annotation, projectRoot: string, sender: WebSocket, plan?: boolean) {
    console.log(`📌 New annotation: ${annotation.element.selector}${plan ? ' [PLAN]' : ''}`);
    console.log(`   Comment: "${annotation.comment}"`);
    console.log(`   Project: ${projectRoot}`);

    this.messages.setRequestSender(annotation.id, sender);
    this.queue.enqueue({ annotation, projectRoot, sender, plan });
  }

  private async processQueueItem(item: QueueItem) {
    const { annotation, projectRoot, plan } = item;

    this.messages.sendToSender(annotation.id, {
      type: 'status',
      annotationId: annotation.id,
      status: 'processing',
    });

    console.log(`🔄 Processing: ${annotation.id}${plan ? ' [PLAN]' : ''}`);

    if (this.config.dryRun) {
      await this.processDryRun(annotation);
      return;
    }

    await this.processWithCodex(annotation, projectRoot, plan);
  }

  private async processWithCodex(annotation: Annotation, projectRoot: string, plan?: boolean) {
    const onProgress = (message: string) => {
      this.messages.sendToSender(annotation.id, { type: 'progress', annotationId: annotation.id, message });
    };
    const onApproval = (command: string) => this.requestApproval(annotation.id, command);

    try {
      const existingThreadId = this.threadMap.get(annotation.id);
      let result;

      if (existingThreadId) {
        console.log(`   ↩ Continuing thread ${existingThreadId}`);
        result = await this.codex.reply(existingThreadId, annotation.comment, onProgress, onApproval);
      } else {
        const options = plan ? { promptOverride: buildSparkPlanPrompt(annotation) } : undefined;
        result = await this.codex.execute(annotation, projectRoot, onProgress, onApproval, options);
      }

      if (result.threadId) {
        this.threadMap.set(annotation.id, result.threadId);
      }

      if (result.success) {
        console.log(`✅ Applied: ${annotation.id} (${(result.durationMs / 1000).toFixed(1)}s)`);

        if (plan) {
          const variants = parseSparkPlanMeta(result.output);
          if (variants.length > 0) {
            console.log(`   📋 Plan variants: ${variants.map((v) => v.title).join(', ')}`);
            this.messages.sendToSender(annotation.id, {
              type: 'plan_variants_ready',
              annotationId: annotation.id,
              variants,
            });
          }
        }

        this.messages.sendToSender(annotation.id, {
          type: 'status',
          annotationId: annotation.id,
          status: 'applied',
          response: result.output,
        });
      } else {
        console.log(`❌ Failed: ${annotation.id} — ${result.error?.slice(0, 80)}`);
        this.messages.sendToSender(annotation.id, {
          type: 'status',
          annotationId: annotation.id,
          status: 'failed',
          error: result.error,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ Error: ${annotation.id} — ${errorMsg}`);
      this.messages.sendToSender(annotation.id, {
        type: 'status',
        annotationId: annotation.id,
        status: 'failed',
        error: errorMsg,
      });
    } finally {
      this.approvals.clear(annotation.id);
    }
  }

  private requestApproval(annotationId: string, command: string): Promise<boolean> {
    return this.approvals.request(annotationId, () => {
      this.messages.sendToSender(annotationId, {
        type: 'approval_request',
        annotationId,
        command,
      });
    });
  }

  private resolveApproval(annotationId: string, approved: boolean) {
    const resolved = this.approvals.resolve(annotationId, approved);
    if (!resolved) {
      console.log(`   [approval] no pending resolver for: ${annotationId}`);
    }
  }

  private async handlePlanApply(annotationId: string, approach: string, _projectRoot: string, sender: WebSocket) {
    console.log(`📋 Plan apply: ${annotationId} → ${approach}`);
    this.messages.setRequestSender(annotationId, sender);

    const threadId = this.threadMap.get(annotationId);
    if (!threadId) {
      console.log(`❌ Plan apply failed: no thread for ${annotationId}`);
      this.messages.sendToSender(annotationId, {
        type: 'status',
        annotationId,
        status: 'failed',
        error: 'No Codex session found for this annotation.',
      });
      return;
    }

    this.messages.sendToSender(annotationId, {
      type: 'status',
      annotationId,
      status: 'processing',
    });

    const onProgress = (message: string) => {
      this.messages.sendToSender(annotationId, { type: 'progress', annotationId, message });
    };

    try {
      const prompt = approach === 'cancel'
        ? buildSparkPlanCancelPrompt()
        : buildSparkPlanApplyPrompt(parseInt(approach, 10));

      const result = await this.codex.reply(threadId, prompt, onProgress);

      if (result.success) {
        console.log(`✅ Plan ${approach === 'cancel' ? 'cancelled' : 'applied'}: ${annotationId}`);
        this.messages.sendToSender(annotationId, {
          type: 'status',
          annotationId,
          status: 'applied',
          response: result.output,
        });
      } else {
        console.log(`❌ Plan apply failed: ${annotationId} — ${result.error?.slice(0, 80)}`);
        this.messages.sendToSender(annotationId, {
          type: 'status',
          annotationId,
          status: 'failed',
          error: result.error,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ Plan apply error: ${annotationId} — ${errorMsg}`);
      this.messages.sendToSender(annotationId, {
        type: 'status',
        annotationId,
        status: 'failed',
        error: errorMsg,
      });
    }
  }

  private async processDryRun(annotation: Annotation) {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    this.messages.sendToSender(annotation.id, {
      type: 'progress',
      annotationId: annotation.id,
      message: '[dry-run] Codex に送信中...',
    });
    await delay(500);

    this.messages.sendToSender(annotation.id, {
      type: 'progress',
      annotationId: annotation.id,
      message: `[dry-run] セレクタ "${annotation.element.selector}" を解析中...`,
    });
    await delay(800);

    this.messages.sendToSender(annotation.id, {
      type: 'progress',
      annotationId: annotation.id,
      message: '[dry-run] コード変更を適用中...',
    });
    await delay(700);

    console.log(`✅ [dry-run] Applied: ${annotation.id} (2.0s)`);
    this.messages.sendToSender(annotation.id, {
      type: 'status',
      annotationId: annotation.id,
      status: 'applied',
    });
  }

  private ensureNanobanana(apiKey?: string, model?: string) {
    const key = apiKey || this.bananaApiKey || process.env.GEMINI_API_KEY;
    if (!key) return;

    if (!this.nanobanana || apiKey || model) {
      this.nanobanana = new Nanobanana({ apiKey: key, model });
      console.log(`   [banana] Nanobanana ready (model: ${model || 'default'})`);
    }
  }

  private async handleBananaRequest(request: BananaRequest, projectRoot: string, sender: WebSocket, fast: boolean = false) {
    const screenshotKB = Math.round(request.screenshot.length * 0.75 / 1024);
    console.log(`🍌 Banana request: ${request.id}${fast ? ' [FAST]' : ''}`);
    console.log(`   Instruction: "${request.instruction}"`);
    console.log(`   Screenshot: ${screenshotKB}KB, Region: ${request.region.width}x${request.region.height}`);

    this.messages.setRequestSender(request.id, sender);

    if (!this.nanobanana) {
      console.log('❌ [banana] No nanobanana instance — API key missing?');
      this.messages.send(sender, {
        type: 'banana_status',
        requestId: request.id,
        status: 'failed',
        error: 'No Gemini API key. Enter it in the overlay panel or set GEMINI_API_KEY.',
      });
      return;
    }

    console.log("   [banana] Sending 'analyzing' status to client...");
    this.messages.send(sender, {
      type: 'banana_status',
      requestId: request.id,
      status: 'analyzing',
    });

    const onProgress = (message: string) => {
      console.log(`   [banana] progress → ${message}`);
      this.messages.sendToSender(request.id, { type: 'banana_progress', requestId: request.id, message });
    };

    const startMs = Date.now();
    try {
      const count = fast ? 1 : 3;
      console.log(`   [banana] Calling nanobanana.analyze(count=${count})...`);
      const suggestions = await this.nanobanana.analyze(request.screenshot, request.instruction, onProgress, count);
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

      this.bananaRequests.set(request.id, request);

      console.log(`   [banana] Sending ${suggestions.length} suggestions to client...`);
      this.messages.sendToSender(request.id, {
        type: 'banana_suggestions',
        requestId: request.id,
        suggestions,
      });

      if (fast && suggestions.length > 0) {
        console.log('   [banana] Fast mode: auto-applying suggestion...');
        this.messages.sendToSender(request.id, {
          type: 'banana_status',
          requestId: request.id,
          status: 'applying',
        });
        this.handleBananaApply(request.id, suggestions[0], projectRoot, sender);
      } else {
        this.messages.sendToSender(request.id, {
          type: 'banana_status',
          requestId: request.id,
          status: 'suggestions_ready',
        });
      }

      console.log(`✅ Banana complete: ${request.id} — ${suggestions.length} images in ${elapsed}s`);
    } catch (err) {
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ Banana failed: ${request.id} (${elapsed}s) — ${errorMsg}`);
      this.messages.sendToSender(request.id, {
        type: 'banana_status',
        requestId: request.id,
        status: 'failed',
        error: errorMsg,
      });
    }
  }

  private async handleBananaApply(requestId: string, suggestion: BananaSuggestion, projectRoot: string, sender: WebSocket) {
    console.log(`🍌 Banana apply: ${requestId} → ${suggestion.title}`);

    this.messages.setRequestSender(requestId, sender);

    const request = this.bananaRequests.get(requestId);
    if (!request) {
      console.log(`❌ Banana apply failed: request ${requestId} not found`);
      this.messages.send(sender, {
        type: 'banana_status',
        requestId,
        status: 'failed',
        error: `Request ${requestId} not found. It may have expired.`,
      });
      return;
    }

    this.messages.send(sender, {
      type: 'banana_status',
      requestId,
      status: 'applying',
    });

    try {
      const onProgress = (message: string) => {
        this.messages.sendToSender(requestId, { type: 'banana_progress', requestId, message });
      };

      const imgDir = join(tmpdir(), 'spark-banana');
      mkdirSync(imgDir, { recursive: true });
      const ts = Date.now();

      const originalPath = join(imgDir, `${ts}-original.png`);
      const origData = request.screenshot.replace(/^data:image\/\w+;base64,/, '');
      writeFileSync(originalPath, Buffer.from(origData, 'base64'));

      const targetPath = join(imgDir, `${ts}-target.png`);
      const targetData = suggestion.image.replace(/^data:image\/\w+;base64,/, '');
      writeFileSync(targetPath, Buffer.from(targetData, 'base64'));

      console.log(`   [banana] Images saved: ${originalPath}, ${targetPath}`);

      const promptOverride = buildBananaApplyPrompt(suggestion, request.instruction, request.region, originalPath, targetPath, request.regionElements);

      const syntheticAnnotation: Annotation = {
        id: `banana-${requestId}`,
        timestamp: Date.now(),
        element: {
          selector: 'body',
          genericSelector: 'body',
          fullPath: 'html > body',
          tagName: 'body',
          textContent: '',
          cssClasses: [],
          attributes: {},
          boundingBox: request.region,
          parentSelector: 'html',
          nearbyText: '',
        },
        comment: request.instruction,
        type: 'click',
        status: 'processing',
      };

      const result = await this.codex.execute(
        syntheticAnnotation,
        projectRoot,
        onProgress,
        undefined,
        { modelOverride: 'gpt-5.3-codex', promptOverride },
      );

      if (result.success) {
        console.log(`✅ Banana applied: ${requestId} (${(result.durationMs / 1000).toFixed(1)}s)`);
        this.messages.sendToSender(requestId, {
          type: 'banana_status',
          requestId,
          status: 'applied',
          response: result.output,
        });
      } else {
        console.log(`❌ Banana apply failed: ${requestId} — ${result.error?.slice(0, 80)}`);
        this.messages.sendToSender(requestId, {
          type: 'banana_status',
          requestId,
          status: 'failed',
          error: result.error,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ Banana apply error: ${requestId} — ${errorMsg}`);
      this.messages.sendToSender(requestId, {
        type: 'banana_status',
        requestId,
        status: 'failed',
        error: errorMsg,
      });
    }
  }
}
