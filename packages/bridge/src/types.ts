/** DOM要素から抽出した構造情報 */
export interface ElementCapture {
  selector: string;
  /** 位置情報を除去した汎用セレクタ（同種の要素すべてにマッチ） */
  genericSelector: string;
  fullPath: string;
  tagName: string;
  textContent: string;
  cssClasses: string[];
  attributes: Record<string, string>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  parentSelector: string;
  nearbyText: string;
  /** React コンポーネント階層 (例: "App > Header > NavButton") */
  reactComponents?: string;
  /** 主要な Computed Styles (例: "bg: rgb(255,0,0), font-size: 14px") */
  computedStyles?: string;
  /** アクセシビリティ情報 (role, aria-label 等) */
  accessibility?: string;
}

/** ユーザーが作成したアノテーション */
export interface Annotation {
  id: string;
  timestamp: number;
  element: ElementCapture;
  comment: string;
  type: 'click' | 'text-select';
  selectedText?: string;
  status: 'pending' | 'processing' | 'applied' | 'failed';
  error?: string;
  response?: string;
}

/** Banana mode: region-based screenshot request */
export interface BananaRequest {
  id: string;
  timestamp: number;
  screenshot: string;
  region: { x: number; y: number; width: number; height: number };
  instruction: string;
  /** DOM elements found within the selected region (for Codex context) */
  regionElements?: string;
  status: 'pending' | 'analyzing' | 'suggestions_ready' | 'applying' | 'applied' | 'failed';
  error?: string;
  response?: string;
}

export interface BananaSuggestion {
  id: string;
  title: string;
  description: string;
  /** Base64 data-URI of the generated UI image (e.g. "data:image/png;base64,...") */
  image: string;
}

/** Plan mode で生成されるバリアント情報 */
export interface SparkPlanVariant {
  index: number;
  title: string;
  description: string;
}

/** ブラウザ→Bridge メッセージ */
export type ClientMessage =
  | { type: 'register'; projectRoot: string }
  | { type: 'annotation'; payload: Annotation; plan?: boolean }
  | { type: 'approval_response'; annotationId: string; approved: boolean }
  | { type: 'plan_apply'; annotationId: string; approach: string }
  | { type: 'ping' }
  | { type: 'restart_codex' }
  | { type: 'set_model'; model: string }
  | { type: 'banana_request'; payload: BananaRequest; apiKey?: string; model?: string; fast?: boolean }
  | { type: 'banana_apply'; requestId: string; suggestion: BananaSuggestion };

/** Bridge→ブラウザ メッセージ */
export type ServerMessage =
  | { type: 'status'; annotationId: string; status: Annotation['status']; error?: string; response?: string }
  | { type: 'progress'; annotationId: string; message: string }
  | { type: 'approval_request'; annotationId: string; command: string }
  | { type: 'plan_variants_ready'; annotationId: string; variants: SparkPlanVariant[] }
  | { type: 'connected' }
  | { type: 'pong' }
  | { type: 'restart_complete'; success: boolean; error?: string }
  | { type: 'banana_suggestions'; requestId: string; suggestions: BananaSuggestion[] }
  | { type: 'banana_status'; requestId: string; status: BananaRequest['status']; error?: string; response?: string }
  | { type: 'banana_progress'; requestId: string; message: string };
