import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../styles/colors";
import { Locale } from "../i18n";

const DESIGN_HTMLS = [
  // Modern Glass — dark, glass morphism
  `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a1a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden}
.bg{position:absolute;width:400px;height:400px;border-radius:50%;filter:blur(80px);opacity:0.3}
.bg1{background:#6366f1;top:-100px;left:-100px}
.bg2{background:#a855f7;bottom:-100px;right:-100px}
h1{font-size:32px;font-weight:800;margin-bottom:8px;text-align:center;position:relative;z-index:1}
p{font-size:14px;opacity:0.6;margin-bottom:20px;position:relative;z-index:1}
.btn{padding:12px 32px;background:rgba(99,102,241,0.8);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);border-radius:12px;color:#fff;font-weight:600;font-size:14px;position:relative;z-index:1}
.cards{display:flex;gap:12px;margin-top:24px;position:relative;z-index:1}
.card{background:rgba(255,255,255,0.06);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px 20px;text-align:center;min-width:100px}
.card .icon{font-size:20px;margin-bottom:4px}
.card .label{font-size:12px;opacity:0.7}
</style></head><body>
<div class="bg bg1"></div><div class="bg bg2"></div>
<h1>Build faster with<br>real-time feedback</h1>
<p>Ship products your users love</p>
<div class="btn">Get Started →</div>
<div class="cards"><div class="card"><div class="icon">⚡</div><div class="label">Fast</div></div><div class="card"><div class="icon">🔒</div><div class="label">Secure</div></div><div class="card"><div class="icon">🎨</div><div class="label">Beautiful</div></div></div>
</body></html>`,

  // Warm Sunset — gradient, warm tones
  `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(160deg,#ffecd2 0%,#fcb69f 50%,#f8a4c8 100%);color:#2d1810;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden}
h1{font-size:32px;font-weight:800;margin-bottom:8px;text-align:center}
p{font-size:14px;opacity:0.6;margin-bottom:20px}
.btn{padding:12px 32px;background:linear-gradient(135deg,#f5576c,#ff6b6b);border:none;border-radius:28px;color:#fff;font-weight:700;font-size:14px;box-shadow:0 8px 24px rgba(245,87,108,0.35)}
.cards{display:flex;gap:12px;margin-top:24px}
.card{background:rgba(255,255,255,0.5);backdrop-filter:blur(8px);border-radius:16px;padding:16px 20px;text-align:center;min-width:100px;border:1px solid rgba(255,255,255,0.6)}
.card .icon{font-size:20px;margin-bottom:4px}
.card .label{font-size:12px;color:#6b3a2a}
</style></head><body>
<h1>Build faster with<br>real-time feedback</h1>
<p>Ship products your users love</p>
<div class="btn">Get Started →</div>
<div class="cards"><div class="card"><div class="icon">⚡</div><div class="label">Fast</div></div><div class="card"><div class="icon">🔒</div><div class="label">Secure</div></div><div class="card"><div class="icon">🎨</div><div class="label">Beautiful</div></div></div>
</body></html>`,

  // Ocean Breeze — cool blue, clean
  `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(180deg,#e0f2fe 0%,#ffffff 60%,#f0fdfa 100%);color:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden}
h1{font-size:32px;font-weight:800;margin-bottom:8px;text-align:center;color:#1e3a5f}
p{font-size:14px;color:#64748b;margin-bottom:20px}
.btn{padding:12px 32px;background:linear-gradient(135deg,#38bdf8,#06b6d4);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:14px;box-shadow:0 4px 16px rgba(56,189,248,0.3)}
.cards{display:flex;gap:12px;margin-top:24px}
.card{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 20px;text-align:center;min-width:100px;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.card .icon{font-size:20px;margin-bottom:4px}
.card .label{font-size:12px;color:#475569}
</style></head><body>
<h1>Build faster with<br>real-time feedback</h1>
<p>Ship products your users love</p>
<div class="btn">Get Started →</div>
<div class="cards"><div class="card"><div class="icon">⚡</div><div class="label">Fast</div></div><div class="card"><div class="icon">🔒</div><div class="label">Secure</div></div><div class="card"><div class="icon">🎨</div><div class="label">Beautiful</div></div></div>
</body></html>`,
];

const DESIGN_TITLES = ["Modern Glass", "Warm Sunset", "Ocean Breeze"];

const localizeDesignHtml = (html: string, isJa: boolean): string => {
  if (!isJa) {
    return html;
  }

  return html
    .replaceAll(
      "Build faster with<br>real-time feedback",
      "リアルタイムフィードバックで<br>開発を加速",
    )
    .replaceAll("Ship products your users love", "ユーザーに愛されるプロダクトへ")
    .replaceAll("Get Started →", "はじめる →")
    .replaceAll(">Fast<", ">高速<")
    .replaceAll(">Secure<", ">安全<")
    .replaceAll(">Beautiful<", ">美しい<");
};

export const MockBananaModal: React.FC<{
  selectedIndex: number | null;
  showApply?: boolean;
  locale: Locale;
}> = ({ selectedIndex, showApply = false, locale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isJa = locale === "ja";
  const designTitles = isJa
    ? ["モダンガラス", "ウォームサンセット", "オーシャンブリーズ"]
    : DESIGN_TITLES;
  const designHtmls = DESIGN_HTMLS.map((html) => localizeDesignHtml(html, isJa));

  const entry = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });
  const scale = interpolate(entry, [0, 1], [0.9, 1]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        zIndex: 50,
        opacity: entry,
      }}
    >
      <div
        style={{
          width: 1180,
          background: COLORS.panelBg,
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          transform: `scale(${scale})`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${COLORS.panelBorder}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke={COLORS.bananaYellow} strokeWidth={1.8}>
            <path d="M4 20c2-4 6-14 14-16-2 6-4 10-8 14-2 2-4 2.5-6 2z" />
          </svg>
          <span style={{ fontSize: 39, fontWeight: 600, color: COLORS.panelText }}>
            {isJa ? "デザインを選択" : "Choose a design"}
          </span>
        </div>

        {/* Instruction */}
        <div style={{ padding: "14px 28px 0", fontSize: 30, color: COLORS.panelTextSecondary }}>
          {isJa
            ? "ヒーローセクションをもっとモダンで鮮やかに"
            : "Make the hero section more modern and vibrant"}
        </div>

        {/* Design cards with iframes */}
        <div style={{ display: "flex", gap: 16, padding: "16px 24px" }}>
          {designHtmls.map((html, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: 12,
                overflow: "hidden",
                border: selectedIndex === i
                  ? `2px solid ${COLORS.panelAccent}`
                  : "2px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {/* iframe design preview */}
              <div
                style={{
                  width: "100%",
                  height: 220,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <iframe
                  srcDoc={html}
                  style={{
                    width: 800,
                    height: 600,
                    border: "none",
                    transform: "scale(0.45)",
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                  scrolling="no"
                />
              </div>
              <div
                style={{
                  padding: "12px 10px",
                  textAlign: "center",
                  fontSize: 30,
                  fontWeight: 600,
                  color: selectedIndex === i ? COLORS.panelAccent : COLORS.panelText,
                  background: "rgba(255,255,255,0.04)",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {designTitles[i]}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px 18px",
            borderTop: `1px solid ${COLORS.panelBorder}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              fontSize: 33,
              fontWeight: 600,
              color: COLORS.panelTextSecondary,
              background: "rgba(255,255,255,0.08)",
            }}
          >
            {isJa ? "スキップ" : "Skip"}
          </div>
          <div
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              fontSize: 33,
              fontWeight: 600,
              color: "#fff",
              background: selectedIndex !== null ? COLORS.panelAccent : "rgba(99,102,241,0.35)",
              opacity: selectedIndex !== null ? 1 : 0.6,
            }}
          >
            {isJa ? "適用" : "Apply"}
          </div>
        </div>
      </div>
    </div>
  );
};
