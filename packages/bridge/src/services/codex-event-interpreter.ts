export interface CodexEventMsg {
  type: string;
  [key: string]: unknown;
}

export interface CodexEventParams {
  _meta?: { requestId?: number; threadId?: string };
  id?: string;
  msg?: CodexEventMsg;
  [key: string]: unknown;
}

interface CodexNotification {
  method: string;
  params?: unknown;
}

interface CodexEventInterpreterContext {
  setThreadId: (threadId: string) => void;
  touchActivity: () => void;
  onProgress?: (message: string) => void;
  onApprovalRequest?: (command: string) => void;
}

const SILENT_EVENTS = new Set([
  'agent_message_content_delta', 'agent_message_delta',
  'reasoning_content_delta', 'agent_reasoning_delta',
  'agent_reasoning_section_break',
  'item_started', 'item_completed',
  'mcp_startup_update', 'mcp_startup_complete',
]);

function normalizeCommand(rawCommand: string) {
  return rawCommand.replace(/^\/bin\/(?:ba)?sh\s+-lc\s+/, '');
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function interpretCodexEventNotification(
  notification: CodexNotification,
  context: CodexEventInterpreterContext,
) {
  const params = notification.params as CodexEventParams | undefined;
  if (notification.method !== 'codex/event' || !params?.msg) return;

  const msg = params.msg;
  const threadId = params._meta?.threadId;
  if (threadId) context.setThreadId(threadId);

  context.touchActivity();

  if (SILENT_EVENTS.has(msg.type)) return;

  switch (msg.type) {
    case 'session_configured':
      console.log(`   [codex] session: model=${msg.model}, sandbox=${msg.sandbox_policy}`);
      break;

    case 'task_started':
      console.log('   [codex] --- task started ---');
      context.onProgress?.('[status] 処理開始');
      break;

    case 'task_complete':
      console.log('   [codex] --- task complete ---');
      context.onProgress?.('[status] 処理完了');
      break;

    case 'agent_message': {
      const text = (msg.message as string) || '';
      if (text.trim()) {
        console.log(`   [codex] ${text.slice(0, 200)}`);
        context.onProgress?.(`[agent] ${text.slice(0, 200)}`);
      }
      break;
    }

    case 'exec_command_begin': {
      const rawCmd = asStringArray(msg.command).join(' ');
      const cmd = normalizeCommand(rawCmd);
      console.log(`   [codex] $ ${cmd.slice(0, 150)}`);
      context.onProgress?.(`[cmd] ${cmd.slice(0, 120)}`);
      break;
    }

    case 'exec_command_end': {
      const code = msg.exit_code;
      console.log(`   [codex]   -> exit ${code}`);
      if (code !== 0) {
        context.onProgress?.(`[cmd-err] exit ${code}`);
      }
      break;
    }

    case 'exec_approval_request': {
      const rawCmd = asStringArray(msg.command).join(' ');
      const cmd = normalizeCommand(rawCmd);
      console.log(`   [codex] ⚠ approval: ${cmd}`);
      context.onApprovalRequest?.(cmd);
      break;
    }

    case 'user_message':
      console.log('   [codex] > prompt sent');
      context.onProgress?.('[status] プロンプト送信');
      break;

    case 'patch_apply_begin':
      console.log('   [codex] patch applying...');
      context.onProgress?.('[status] パッチ適用中...');
      break;

    case 'patch_apply_end':
      console.log('   [codex] patch applied');
      context.onProgress?.('[status] パッチ適用完了');
      break;

    case 'agent_reasoning': {
      const text = (msg.message as string) || '';
      if (text.trim()) {
        console.log(`   [codex] thinking: ${text.slice(0, 150)}`);
        context.onProgress?.(`[agent] ${text.slice(0, 150)}`);
      }
      break;
    }

    case 'raw_response_item': {
      const item = msg.item as Record<string, unknown> | undefined;
      if (item?.type === 'reasoning') {
        const summary = item.summary as Array<{ text?: string }> | undefined;
        if (summary?.[0]?.text) {
          console.log(`   [codex] thinking: ${summary[0].text.slice(0, 150)}`);
          context.onProgress?.(`[agent] ${summary[0].text.slice(0, 150)}`);
        }
      }
      break;
    }

    case 'token_count': {
      const info = msg.info as Record<string, unknown> | undefined;
      const usage = info?.total_token_usage as Record<string, number> | undefined;
      if (usage) {
        console.log(`   [codex] tokens: in=${usage.input_tokens} out=${usage.output_tokens}`);
        context.onProgress?.(`[status] tokens: in=${usage.input_tokens} out=${usage.output_tokens}`);
      }
      break;
    }

    case 'turn_diff':
      console.log('   [codex] turn_diff');
      context.onProgress?.('[status] diff applied');
      break;

    default:
      console.log(`   [codex] ${msg.type}`);
  }
}
