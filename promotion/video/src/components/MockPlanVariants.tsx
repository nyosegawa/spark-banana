import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { Locale } from "../i18n";

export const MockPlanVariants: React.FC<{
  activeIndex: number;
  showApply?: boolean;
  locale: Locale;
}> = ({ activeIndex, showApply = false, locale }) => {
  const frame = useCurrentFrame();
  const isJa = locale === "ja";

  const variants = isJa
    ? [
        { title: "ミニマル", desc: "余白を活かしたクリーンなレイアウト" },
        { title: "ボールド", desc: "強いコントラストとグラデーション強調" },
        { title: "ラウンド", desc: "柔らかい角丸とパステルトーン" },
      ]
    : [
        { title: "Minimal", desc: "Clean layout with subtle shadows" },
        { title: "Bold", desc: "High contrast with gradient accents" },
        { title: "Rounded", desc: "Soft corners, pastel palette" },
      ];

  return (
    <div style={{ padding: "0 14px 14px" }}>
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 14,
          padding: "16px 20px",
          borderLeft: `4px solid ${COLORS.panelAccent}`,
        }}
      >
        {/* Tab row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {variants.map((v, i) => (
            <button
              key={i}
              style={{
                flex: 1,
                padding: "12px 10px",
                borderRadius: 10,
                border: "none",
                background: activeIndex === i ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
                color: activeIndex === i ? COLORS.panelAccentHover : COLORS.panelTextSecondary,
                fontSize: 27,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: activeIndex === i ? COLORS.panelAccent : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 21,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              {v.title}
            </button>
          ))}
        </div>

        {/* Description */}
        <div style={{ fontSize: 27, color: COLORS.panelTextSecondary, marginBottom: 12, lineHeight: 1.4 }}>
          {variants[activeIndex].desc}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 27,
              fontWeight: 600,
              color: COLORS.panelTextSecondary,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {isJa ? "キャンセル" : "Cancel"}
          </div>
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 27,
              fontWeight: 600,
              color: "#fff",
              background: showApply ? COLORS.panelGreen : COLORS.panelAccent,
              border: showApply ? `1px solid ${COLORS.panelGreen}` : "none",
            }}
          >
            {isJa ? `適用 #${activeIndex + 1}` : `Apply #${activeIndex + 1}`}
          </div>
        </div>
      </div>
    </div>
  );
};
