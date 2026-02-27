import type { ClientMessage, ServerMessage, Annotation, BananaRequest, BananaSuggestion, SparkPlanVariant } from './types';

type StatusHandler = (id: string, status: Annotation['status'], error?: string, response?: string) => void;
type ProgressHandler = (id: string, message: string) => void;
type ApprovalHandler = (id: string, command: string) => void;
type ConnectionHandler = (connected: boolean) => void;
type RestartHandler = (success: boolean, error?: string) => void;
type BananaSuggestionsHandler = (requestId: string, suggestions: BananaSuggestion[]) => void;
type BananaStatusHandler = (requestId: string, status: BananaRequest['status'], error?: string, response?: string) => void;
type BananaProgressHandler = (requestId: string, message: string) => void;
type PlanVariantsReadyHandler = (annotationId: string, variants: SparkPlanVariant[]) => void;

export class BridgeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private projectRoot: string | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private onStatus: StatusHandler = () => {};
  private onProgress: ProgressHandler = () => {};
  private onApproval: ApprovalHandler = () => {};
  private onConnection: ConnectionHandler = () => {};
  private onRestart: RestartHandler = () => {};
  private onBananaSuggestions: BananaSuggestionsHandler = () => {};
  private onBananaStatus: BananaStatusHandler = () => {};
  private onBananaProgress: BananaProgressHandler = () => {};
  private onPlanVariantsReady: PlanVariantsReadyHandler = () => {};

  constructor(url: string = 'ws://localhost:3700', projectRoot?: string) {
    this.url = url;
    this.projectRoot = projectRoot;
  }

  connect(handlers: {
    onStatus: StatusHandler;
    onProgress: ProgressHandler;
    onApproval: ApprovalHandler;
    onConnection: ConnectionHandler;
    onRestart?: RestartHandler;
    onBananaSuggestions?: BananaSuggestionsHandler;
    onBananaStatus?: BananaStatusHandler;
    onBananaProgress?: BananaProgressHandler;
    onPlanVariantsReady?: PlanVariantsReadyHandler;
  }) {
    this.onStatus = handlers.onStatus;
    this.onProgress = handlers.onProgress;
    this.onApproval = handlers.onApproval;
    this.onConnection = handlers.onConnection;
    this.onRestart = handlers.onRestart || (() => {});
    this.onBananaSuggestions = handlers.onBananaSuggestions || (() => {});
    this.onBananaStatus = handlers.onBananaStatus || (() => {});
    this.onBananaProgress = handlers.onBananaProgress || (() => {});
    this.onPlanVariantsReady = handlers.onPlanVariantsReady || (() => {});
    this.doConnect();
  }

  private doConnect() {
    if (this.disposed) return;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        if (this.disposed) { this.ws?.close(); return; }
        if (this.projectRoot && this.ws?.readyState === WebSocket.OPEN) {
          const msg: ClientMessage = { type: 'register', projectRoot: this.projectRoot };
          this.ws.send(JSON.stringify(msg));
        }
        this.onConnection(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        if (this.disposed) return;
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          switch (msg.type) {
            case 'status':
              this.onStatus(msg.annotationId, msg.status, msg.error, msg.response);
              break;
            case 'progress':
              this.onProgress(msg.annotationId, msg.message);
              break;
            case 'approval_request':
              this.onApproval(msg.annotationId, msg.command);
              break;
            case 'connected':
              break;
            case 'restart_complete':
              this.onRestart(msg.success, msg.error);
              break;
            case 'banana_suggestions':
              this.onBananaSuggestions(msg.requestId, msg.suggestions);
              break;
            case 'banana_status':
              this.onBananaStatus(msg.requestId, msg.status, msg.error, msg.response);
              break;
            case 'banana_progress':
              this.onBananaProgress(msg.requestId, msg.message);
              break;
            case 'plan_variants_ready':
              this.onPlanVariantsReady(msg.annotationId, msg.variants);
              break;
          }
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        if (this.disposed) return;
        this.onConnection(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.disposed) return;
        this.onConnection(false);
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.doConnect();
      }, 3000);
    }
  }

  sendAnnotation(annotation: Annotation, plan?: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'annotation', payload: annotation, plan };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendPlanApply(annotationId: string, approach: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'plan_apply', annotationId, approach };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendRestartCodex() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'restart_codex' };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendSetModel(model: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'set_model', model };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendApprovalResponse(annotationId: string, approved: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'approval_response', annotationId, approved };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendBananaRequest(request: BananaRequest, apiKey?: string, model?: string, fast?: boolean) {
    console.log(`[spark-banana] sendBananaRequest: ws=${this.ws?.readyState === WebSocket.OPEN ? 'OPEN' : this.ws?.readyState ?? 'null'}, apiKey=${apiKey ? 'yes' : 'no'}, model=${model || 'default'}, fast=${fast ?? false}`);
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'banana_request', payload: request, apiKey, model, fast };
      const size = JSON.stringify(msg).length;
      console.log(`[spark-banana] Sending banana_request (${Math.round(size / 1024)}KB)`);
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn(`[spark-banana] Cannot send banana_request: WebSocket not open`);
    }
  }

  sendBananaApply(requestId: string, suggestion: BananaSuggestion) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'banana_apply', requestId, suggestion };
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
