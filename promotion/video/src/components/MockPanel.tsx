import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../styles/colors";
import { Locale } from "../i18n";

export const MockPanel: React.FC<{
  selector: string;
  inputText: string;
  showCursor: boolean;
  isProcessing: boolean;
  isDone: boolean;
  planMode?: boolean;
  locale: Locale;
}> = ({
  selector,
  inputText,
  showCursor,
  isProcessing,
  isDone,
  planMode = false,
  locale,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isJa = locale === "ja";
  const placeholder = isJa ? "修正内容を入力..." : "Describe the fix...";
  const fixLabel = isJa ? "修正" : "Fix";
  const panelText = planMode
    ? isJa
      ? "このページのデザイン案を3パターン作って"
      : "Try 3 different design themes for this page"
    : isJa
      ? "ボタンを大きくしてグラデーションを追加"
      : "Make the button bigger and add a gradient";
  const processingText = isJa ? "スタイルを更新中..." : "Updating styles...";
  const appliedText = isJa ? "適用済み" : "Applied";

  const entry = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const translateY = interpolate(entry, [0, 1], [8, 0]);
  const spinnerRotation = (frame * 12) % 360;

  return (
    <div
      style={{
        width: 700,
        background: COLORS.panelBg,
        border: `1px solid ${COLORS.panelBorder}`,
        borderRadius: 20,
        boxShadow:
          "0 12px 48px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.06)",
        overflow: "hidden",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
        opacity: entry,
        transform: `translateY(${translateY}px) scale(${interpolate(entry, [0, 1], [0.96, 1])})`,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 16px 24px",
          borderBottom: `1px solid ${COLORS.panelBorder}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.panelText,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: COLORS.panelGreen,
            }}
          />
          spark-banana
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(99, 102, 241, 0.15)" }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={COLORS.panelAccent} strokeWidth={1.8}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: planMode ? "rgba(99, 102, 241, 0.25)" : "transparent" }}>
            {planMode ? (
              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={COLORS.panelAccent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={COLORS.panelTextDim} strokeWidth={1.8}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Input area */}
      <div
        style={{
          padding: 20,
          borderBottom: `1px solid ${COLORS.panelBorder}`,
        }}
      >
        <div
          style={{
            fontSize: 27,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: COLORS.panelAccentHover,
            marginBottom: 12,
          }}
        >
          {selector}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              flex: 1,
              background: COLORS.panelInput,
              border: `1px solid ${inputText ? COLORS.panelAccent : COLORS.panelBorder}`,
              borderRadius: 14,
              padding: "14px 18px",
              fontSize: 33,
              color: COLORS.panelText,
              minHeight: 52,
            }}
          >
            {inputText}
            {showCursor && (
              <span style={{ color: COLORS.panelAccent, opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }}>|</span>
            )}
            {!inputText && !showCursor && (
              <span style={{ color: "#555", fontSize: 20 }}>{placeholder}</span>
            )}
          </div>
          <div
            style={{
              background: inputText && !isProcessing ? COLORS.panelAccent : "rgba(99,102,241,0.35)",
              borderRadius: 14,
              color: "#fff",
              padding: "14px 28px",
              fontSize: 33,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
            }}
          >
            {fixLabel}
          </div>
        </div>
      </div>

      {/* Annotation item */}
      {(isProcessing || isDone) && (
        <div style={{ padding: 14 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 14,
              padding: "16px 20px",
              borderLeft: `4px solid ${isDone ? COLORS.panelGreen : COLORS.panelBlue}`,
            }}
          >
            <div
              style={{
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: 26,
                color: COLORS.panelAccentHover,
                marginBottom: 8,
              }}
            >
              {selector}
            </div>
            <div
              style={{
                color: COLORS.panelText,
                marginBottom: 10,
                lineHeight: 1.4,
                fontSize: 30,
              }}
            >
              {panelText}
            </div>

            {isProcessing && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 27,
                  color: COLORS.panelBlue,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(96,165,250,0.3)",
                    borderTopColor: COLORS.panelBlue,
                    borderRadius: "50%",
                    transform: `rotate(${spinnerRotation}deg)`,
                    flexShrink: 0,
                  }}
                />
                {processingText}
              </div>
            )}

            {isDone && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 27,
                  color: COLORS.panelGreen,
                }}
              >
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={COLORS.panelGreen} strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {appliedText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
