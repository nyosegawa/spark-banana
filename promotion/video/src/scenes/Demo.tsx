import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSansJa } from "@remotion/google-fonts/ZenKakuGothicNew";
import { MockBrowser } from "../components/MockBrowser";
import { MockFAB } from "../components/MockFAB";
import { MockPanel } from "../components/MockPanel";
import { MockCursor } from "../components/MockCursor";
import { MockPlanVariants } from "../components/MockPlanVariants";
import { MockBananaModal } from "../components/MockBananaModal";
import { COLORS } from "../styles/colors";
import { Locale } from "../i18n";

const { fontFamily: sans } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: serif } = loadSerif("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

const { fontFamily: sansJp } = loadSansJa("normal", {
  weights: ["400", "500", "700"],
});

/*
 * Demo scene — 630 frames = 21s at 30fps
 *
 * Phase 1: Spark Fast Mode (0-8s)
 *   0-1.2s:    Spark overlay + browser slides in
 *   0.5-1s:    FAB appears
 *   1.2-2.2s:  Cursor → button, hover → click
 *   2.5-5s:    Panel + type instruction (speed 0.8)
 *   5.2-6.2s:  Processing
 *   6.2-7s:    Done + button transform + shimmer
 *   7-8s:      Hold
 *
 * [8-10.5s: SPARK PLAN OVERLAY — 2.5s breathing room]
 *
 * Phase 2: Spark Plan Mode (10.5-15s)
 *   10.5-11.8s: Panel appears + processing
 *   11.8-14.5s: Plan variants (3 tabs, relaxed switching)
 *   14.3-15s:   Apply + done
 *
 * [15-16.5s: BANANA OVERLAY — 1.5s breathing room]
 *
 * Phase 3: Banana Mode (16.5-19.5s)
 *   16.5-16.8s: Region selection
 *   16.8-17.5s: Input + processing
 *   17.5-19.5s: Banana modal (appear + select, extended)
 *
 * Finale (19.5-21s)
 *   19.5-20.5s: "Click. Describe. Done."
 *   20.5-21s:   Fade out
 */

// Layout constants
const BROWSER_LEFT = 50;
const BROWSER_WIDTH = 1430;
const BROWSER_CENTER_Y = 460;
const BROWSER_HEIGHT_APPROX = 880;
const BROWSER_TOP = BROWSER_CENTER_Y - BROWSER_HEIGHT_APPROX / 2;

// Plan variant visual styles for the browser content
const PLAN_VARIANTS = [
  {
    // Minimal: clean, subtle
    contentBg: "#ffffff",
    titleColor: "#1a1a2e",
    subtitleColor: "#666",
    btnBg: "#6366f1",
    btnRadius: 8,
    cardBg: "#f8f8fa",
    cardBorder: "1px solid #eee",
    cardText: "#666",
  },
  {
    // Bold: dark, dramatic
    contentBg: "#0f0f2e",
    titleColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.6)",
    btnBg: "linear-gradient(135deg, #f43f5e, #ec4899)",
    btnRadius: 24,
    cardBg: "rgba(255,255,255,0.08)",
    cardBorder: "1px solid rgba(255,255,255,0.1)",
    cardText: "rgba(255,255,255,0.7)",
  },
  {
    // Rounded: warm, pastel
    contentBg: "#fef7ed",
    titleColor: "#78350f",
    subtitleColor: "#a16207",
    btnBg: "#f59e0b",
    btnRadius: 24,
    cardBg: "#fffbf0",
    cardBorder: "1px solid #fde68a",
    cardText: "#a16207",
  },
];

// Phase timing anchors (seconds) — adjust these to shift entire phases
const P1 = 2;       // Phase 1 actions start (after Spark overlay fades)
const P2O = 8;      // Plan overlay starts (breathing room)
const P2 = 10.5;    // Phase 2 actions start (after Plan overlay)
const P3O = 15;     // Banana overlay starts (breathing room)
const P3 = 16.5;    // Phase 3 actions start (after Banana overlay)
const FIN = 19.5;   // Finale starts
const END = 21;     // Scene end

export const Demo: React.FC<{ locale: Locale }> = ({ locale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isJa = locale === "ja";
  const sansFont = isJa ? sansJp : sans;
  const serifFont = isJa ? sansJp : serif;
  const text = isJa
    ? {
        nav: ["機能", "料金", "ドキュメント"],
        heroTitle1: "リアルタイムフィードバックで",
        heroTitle2: "開発を加速",
        heroSubtitle: "素早い反復で、ユーザーに愛されるプロダクトへ。",
        cta: "はじめる",
        featureCards: [
          { emoji: "⚡", label: "高速" },
          { emoji: "🔒", label: "安全" },
          { emoji: "🎨", label: "美しい" },
        ],
        planPrompt: "このページのデザイン案を3パターン作って",
        bananaPrompt: "もっとモダンで鮮やかなデザインにして",
        bananaGenerating: "nanobananaでデザイン生成中...",
        fixButton: "修正",
        sparkOverlay: "要素をクリックして即修正",
        planOverlay: "3つのデザイン案を即プレビュー",
        bananaOverlay: "デザインを選ぶと Codex が適用",
        step1: ["修正したい要素をクリックします", ""],
        step2: ["修正内容を書きます", ""],
        step3: ["Codexが適用します", ""],
        finale1: "デザインを選択するだけで完了",
        finale2: "",
      }
    : {
        nav: ["Features", "Pricing", "Docs"],
        heroTitle1: "Build faster with",
        heroTitle2: "real-time feedback",
        heroSubtitle: "Ship products your users love with instant iteration.",
        cta: "Get Started",
        featureCards: [
          { emoji: "⚡", label: "Fast" },
          { emoji: "🔒", label: "Secure" },
          { emoji: "🎨", label: "Beautiful" },
        ],
        planPrompt: "Try 3 different design themes for this page",
        bananaPrompt: "Make it more modern and vibrant",
        bananaGenerating: "Generating designs with nanobanana...",
        fixButton: "Fix",
        sparkOverlay: "Click any element — describe the fix",
        planOverlay: "3 design variants — instant preview",
        bananaOverlay: "Pick a design — Codex applies it",
        step1: ["Click any", "element."],
        step2: ["Describe the", "change."],
        step3: ["AI applies", "the fix."],
        finale1: "Just pick a design option.",
        finale2: "",
      };

  // --- Helpers ---
  const sec = (s: number) => Math.round(s * fps);

  // --- Scene-end fadeout ---
  const sceneEndOpacity = interpolate(frame, [sec(END - 0.5), sec(END)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Browser entry ---
  const browserEntry = spring({ frame, fps, config: { damping: 200 } });
  const browserTranslateY = interpolate(browserEntry, [0, 1], [50, 0]);

  // ============================
  // PHASE 1: Spark Fast Mode
  // ============================

  // Spark Fast mode overlay (0 to P1)
  const sparkFastOverlay = interpolate(frame, [sec(P1 - 0.5), sec(P1)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sparkFastOverlayScale = interpolate(sparkFastOverlay, [0, 1], [0.92, 1]);

  // Bottom-center text
  const p1Text = interpolate(frame, [sec(P1), sec(P1 + 0.3), sec(P1 + 1), sec(P1 + 1.3)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p2Text = interpolate(frame, [sec(P1 + 1.6), sec(P1 + 1.9), sec(P1 + 3.6), sec(P1 + 3.9)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p3Text = interpolate(frame, [sec(P1 + 4), sec(P1 + 4.3), sec(P1 + 5.5), sec(P1 + 5.8)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cursor
  const cursorSpring = spring({
    frame: Math.max(0, frame - sec(P1 + 0.2)),
    fps,
    config: { damping: 28, mass: 0.4, stiffness: 120 },
  });
  const cursorProgress = frame < sec(P1 + 0.2) ? 0 : cursorSpring;
  const cursorX = interpolate(cursorProgress, [0, 1], [400, 715]);
  const cursorY = interpolate(cursorProgress, [0, 1], [250, 520]);
  const showCursor = frame >= sec(P1 + 0.2) && frame < sec(P1 + 5.5);
  const isClicking = frame >= sec(P1 + 1) && frame < sec(P1 + 1.2);

  // Highlights
  const showHover = frame >= sec(P1 + 0.6) && frame < sec(P1 + 1);
  const showSelected = frame >= sec(P1 + 1) && frame < sec(P2O);

  // Panel (phase 1)
  const showPanel1 = frame >= sec(P1 + 1.3) && frame < sec(P2O);

  // Typing
  const typingText = isJa
    ? "ボタンを大きくしてグラデーションを追加"
    : "Make the button bigger and add a gradient";
  const typedChars = Math.max(0, Math.floor((frame - sec(P1 + 1.8)) * 0.8));
  const displayedText1 = typingText.slice(0, Math.min(typedChars, typingText.length));
  const typingDone1 = typedChars >= typingText.length;

  // Processing / Done
  const isProcessing1 = frame >= sec(P1 + 4) && frame < sec(P1 + 5);
  const isDone1 = frame >= sec(P1 + 5);

  // Button transformation
  const buttonGradient = interpolate(frame, [sec(P1 + 4.8), sec(P1 + 5.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const buttonScale = interpolate(frame, [sec(P1 + 4.8), sec(P1 + 5.3)], [1, 1.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ============================
  // PHASE 2: Spark Plan Mode
  // ============================

  // Plan mode transition overlay (P2O to P2)
  const planOverlayOpacity = interpolate(frame, [sec(P2O), sec(P2O + 0.4), sec(P2 - 0.5), sec(P2)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const planOverlayScale = interpolate(planOverlayOpacity, [0, 1], [0.92, 1]);

  const showPanel2 = frame >= sec(P2) && frame < sec(P3O);
  const isPlanMode = frame >= sec(P2);

  // Plan processing
  const isPlanProcessing = frame >= sec(P2 + 0.3) && frame < sec(P2 + 1.3);
  const isPlanDone = frame >= sec(P2 + 1.3) && frame < sec(P3O);

  // Plan variant switching (relaxed)
  const showPlanVariants = frame >= sec(P2 + 1.3) && frame < sec(P2 + 4);
  const planActiveIndex = frame < sec(P2 + 2.3) ? 0 : frame < sec(P2 + 3.1) ? 1 : frame < sec(P2 + 3.6) ? 2 : 1;
  const planShowApply = frame >= sec(P2 + 3.8);

  // ============================
  // PHASE 3: Banana Mode
  // ============================

  // Banana mode transition overlay (P3O to P3)
  const bananaOverlayOpacity = interpolate(frame, [sec(P3O), sec(P3O + 0.4), sec(P3 - 0.5), sec(P3)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bananaOverlayScale = interpolate(bananaOverlayOpacity, [0, 1], [0.92, 1]);

  const isBananaMode = frame >= sec(P3);
  const showPanel3 = frame >= sec(P3) && frame < sec(FIN);

  // Banana crosshair region
  const showBananaRegion = frame >= sec(P3) && frame < sec(FIN);
  const bananaRegionProgress = interpolate(frame, [sec(P3), sec(P3 + 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const regionX = 0;
  const regionY = 0;
  const regionW = interpolate(bananaRegionProgress, [0, 1], [0, 1500]);
  const regionH = interpolate(bananaRegionProgress, [0, 1], [0, 900]);

  // Banana modal
  const showBananaModal = frame >= sec(P3 + 1.0) && frame < sec(FIN);
  const bananaSelectedIndex = frame < sec(P3 + 2.0) ? null : 1;

  // ============================
  // FINALE
  // ============================

  const finaleOpacity = interpolate(frame, [sec(FIN), sec(FIN + 0.3), sec(END - 0.5), sec(END)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Determine FAB state ---
  const fabState = isBananaMode
    ? "done"
    : isPlanProcessing || isProcessing1
      ? "processing"
      : isDone1 || isPlanDone
        ? "done"
        : "connected";

  // --- Determine which panel to show ---
  const activePanel = showPanel3 ? "banana" : showPanel2 ? "plan" : showPanel1 ? "fast" : null;

  // --- Current hero style (changes during plan variant switching) ---
  const heroStyle = showPlanVariants
    ? PLAN_VARIANTS[planActiveIndex]
    : {
        contentBg: "#ffffff",
        titleColor: COLORS.textPrimary,
        subtitleColor: COLORS.textDim,
        btnBg: buttonGradient > 0 ? "linear-gradient(135deg, #6366f1, #a855f7)" : "#6366f1",
        btnRadius: 10,
        cardBg: "#f8f8fa",
        cardBorder: "1px solid #eee",
        cardText: COLORS.textSecondary,
      };

  // Bottom-center text block helper
  const BottomText: React.FC<{
    line1: string;
    line2: string;
    opacity: number;
    fontSize?: number;
  }> = ({ line1, line2, opacity, fontSize = 78 }) => (
    <div
      style={{
        position: "absolute",
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: opacity * sceneEndOpacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: serifFont,
          fontSize,
          fontWeight: 700,
          color: COLORS.textPrimary,
          lineHeight: 1.15,
        }}
      >
        {line1}
      </div>
      <div
        style={{
          fontFamily: serifFont,
          fontSize,
          fontWeight: 700,
          color: COLORS.feature,
          lineHeight: 1.15,
        }}
      >
        {line2}
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      {/* ---- BROWSER GROUP ---- */}
      <div
        style={{
          position: "absolute",
          left: BROWSER_LEFT,
          top: BROWSER_TOP,
          opacity: browserEntry * sceneEndOpacity,
          transform: `translateY(${browserTranslateY}px)`,
        }}
      >
        <MockBrowser url="localhost:3000" width={BROWSER_WIDTH}>
          <div
            style={{
              fontFamily: sansFont,
              padding: 28,
              position: "relative",
              background: heroStyle.contentBg,
              minHeight: 740,
            }}
          >
            {/* Nav */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 48,
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 700, color: heroStyle.titleColor }}>
                MyApp
              </div>
              <div style={{ display: "flex", gap: 36 }}>
                {text.nav.map((s) => (
                  <span key={s} style={{ fontSize: 24, color: heroStyle.subtitleColor, fontWeight: 500 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero */}
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  fontSize: 63,
                  fontWeight: 700,
                  color: heroStyle.titleColor,
                  marginBottom: 16,
                  lineHeight: 1.2,
                }}
              >
                {text.heroTitle1}
                <br />
                {text.heroTitle2}
              </div>
              <div
                style={{
                  fontSize: 27,
                  color: heroStyle.subtitleColor,
                  marginBottom: 32,
                  maxWidth: 560,
                  marginLeft: "auto",
                  marginRight: "auto",
                  lineHeight: 1.5,
                }}
              >
                {text.heroSubtitle}
              </div>

              {/* THE BUTTON */}
              <div style={{ position: "relative", display: "inline-block" }}>
                {showHover && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -4,
                      border: "2px solid #6366f1",
                      borderRadius: 12,
                      background: "rgba(99, 102, 241, 0.06)",
                    }}
                  />
                )}
                {showSelected && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -4,
                      border: "2px solid #fbbf24",
                      borderRadius: heroStyle.btnRadius + 4,
                      background: "rgba(251, 191, 36, 0.08)",
                    }}
                  />
                )}
                {(showHover || showSelected) && frame < sec(P2O) && (
                  <div
                    style={{
                      position: "absolute",
                      top: -22,
                      left: -1,
                      background: showSelected ? "#d97706" : "#6366f1",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 500,
                      padding: "2px 6px",
                      borderRadius: 3,
                      whiteSpace: "nowrap",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}
                  >
                    button.cta-primary
                  </div>
                )}
                <div
                  style={{
                    display: "inline-block",
                    padding: showPlanVariants ? "16px 40px" : buttonGradient > 0 ? "16px 40px" : "14px 36px",
                    borderRadius: heroStyle.btnRadius,
                    background: heroStyle.btnBg,
                    color: "white",
                    fontSize: showPlanVariants ? 29 : buttonGradient > 0 ? 29 : 26,
                    fontWeight: 600,
                    transform: showPlanVariants ? "none" : `scale(${buttonScale})`,
                    boxShadow: showPlanVariants && planActiveIndex === 1
                      ? "0 4px 20px rgba(244,63,94,0.4)"
                      : "none",
                  }}
                >
                  {text.cta}
                </div>
              </div>
            </div>

            {/* Feature cards */}
            <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
              {text.featureCards.map((c) => (
                <div
                  key={c.label}
                  style={{
                    flex: 1,
                    padding: "24px 16px",
                    background: heroStyle.cardBg,
                    borderRadius: showPlanVariants && planActiveIndex === 2 ? 16 : 10,
                    textAlign: "center",
                    border: heroStyle.cardBorder,
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 4 }}>{c.emoji}</div>
                  <div style={{ fontSize: 21, fontWeight: 600, color: heroStyle.cardText }}>
                    {c.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Banana region selection overlay */}
            {showBananaRegion && bananaRegionProgress > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: regionX,
                  top: regionY,
                  width: regionW,
                  height: regionH,
                  border: "2px dashed #facc15",
                  background: "rgba(250, 204, 21, 0.08)",
                  borderRadius: 4,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {/* Shimmer on done */}
          {isDone1 && frame < sec(P2O) && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: interpolate(frame - sec(P1 + 5), [0, sec(0.8)], [-200, 1500], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                width: 200,
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                pointerEvents: "none",
              }}
            />
          )}
        </MockBrowser>

        {/* FAB */}
        <Sequence
          from={sec(0.5)}
          premountFor={fps}
          width={BROWSER_WIDTH}
          height={BROWSER_HEIGHT_APPROX}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", bottom: -10, right: -10, zIndex: 10 }}>
              <MockFAB state={fabState} />
            </div>
          </div>
        </Sequence>

        {/* Panel — Phase 1: Spark Fast */}
        {activePanel === "fast" && (
          <div style={{ position: "absolute", top: 40, left: BROWSER_WIDTH - 300, zIndex: 20 }}>
            <MockPanel
              selector="button.cta-primary"
              inputText={displayedText1}
              showCursor={!typingDone1}
              isProcessing={isProcessing1}
              isDone={isDone1}
              locale={locale}
            />
          </div>
        )}

        {/* Panel — Phase 2: Spark Plan */}
        {activePanel === "plan" && (
          <div style={{ position: "absolute", top: 40, left: BROWSER_WIDTH - 300, zIndex: 20 }}>
            <MockPanel
              selector="div.page-root"
              inputText={text.planPrompt}
              showCursor={false}
              isProcessing={isPlanProcessing}
              isDone={isPlanDone}
              planMode
              locale={locale}
            />
            {showPlanVariants && (
              <div style={{ position: "absolute", top: "100%", left: 0, width: 700, marginTop: -8 }}>
                <div style={{
                  background: COLORS.panelBg,
                  border: `1px solid ${COLORS.panelBorder}`,
                  borderRadius: "0 0 16px 16px",
                  overflow: "hidden",
                }}>
                  <MockPlanVariants
                    activeIndex={planActiveIndex}
                    showApply={planShowApply}
                    locale={locale}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel — Phase 3: Banana */}
        {activePanel === "banana" && (
          <div style={{ position: "absolute", top: 40, left: BROWSER_WIDTH - 300, zIndex: 20 }}>
            <div
              style={{
                width: 700,
                background: COLORS.panelBg,
                border: `1px solid ${COLORS.panelBorder}`,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 12px 48px rgba(0,0,0,0.45)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px 16px 24px",
                  borderBottom: `1px solid ${COLORS.panelBorder}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 36, fontWeight: 600, color: COLORS.panelText }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: COLORS.panelGreen }} />
                  banana
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(250,204,21,0.15)" }}>
                    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={COLORS.bananaYellow} strokeWidth={1.8}>
                      <path d="M4 20c2-4 6-14 14-16-2 6-4 10-8 14-2 2-4 2.5-6 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Screenshot preview */}
              {bananaRegionProgress >= 1 && (
                <div style={{ padding: 18 }}>
                  <div style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <Img
                      src={staticFile("browser-capture.png")}
                      style={{
                        width: "100%",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Input */}
              {bananaRegionProgress >= 1 && (
                <div style={{ padding: "0 18px 18px" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{
                      flex: 1,
                      background: COLORS.panelInput,
                      border: `1px solid ${COLORS.panelAccent}`,
                      borderRadius: 14,
                      padding: "14px 18px",
                      fontSize: 33,
                      color: COLORS.panelText,
                    }}>
                      {frame >= sec(P3 + 0.5) ? text.bananaPrompt : ""}
                      {frame < sec(P3 + 0.5) && frame >= sec(P3 + 0.3) && (
                        <span style={{ color: COLORS.panelAccent, opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }}>|</span>
                      )}
                    </div>
                    <div style={{
                      background: frame >= sec(P3 + 0.5) ? COLORS.panelAccent : "rgba(99,102,241,0.35)",
                      borderRadius: 14,
                      color: "#fff",
                      padding: "14px 28px",
                      fontSize: 33,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                    }}>
                      {text.fixButton}
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              {frame >= sec(P3 + 0.5) && frame < sec(P3 + 1.0) && (
                <div style={{ padding: "0 18px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 27, color: COLORS.panelBlue }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      border: "1.5px solid rgba(96,165,250,0.3)",
                      borderTopColor: COLORS.panelBlue,
                      borderRadius: "50%",
                      transform: `rotate(${(frame * 12) % 360}deg)`,
                    }} />
                    {text.bananaGenerating}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cursor */}
        {showCursor && (
          <MockCursor x={cursorX} y={cursorY} clicking={isClicking} />
        )}

        {/* Banana crosshair cursor */}
        {showBananaRegion && frame < sec(P3 + 0.3) && (
          <div
            style={{
              position: "absolute",
              left: regionX + regionW,
              top: regionY + regionH,
              pointerEvents: "none",
              zIndex: 100,
            }}
          >
            <svg width={20} height={20} viewBox="0 0 20 20">
              <line x1="10" y1="0" x2="10" y2="20" stroke="white" strokeWidth={1.5} />
              <line x1="0" y1="10" x2="20" y2="10" stroke="white" strokeWidth={1.5} />
              <line x1="10" y1="0" x2="10" y2="20" stroke="black" strokeWidth={0.5} />
              <line x1="0" y1="10" x2="20" y2="10" stroke="black" strokeWidth={0.5} />
            </svg>
          </div>
        )}
      </div>

      {/* Banana modal overlay */}
      {showBananaModal && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, opacity: sceneEndOpacity }}>
          <MockBananaModal selectedIndex={bananaSelectedIndex} locale={locale} />
        </div>
      )}

      {/* ---- MODE TRANSITION OVERLAYS ---- */}

      {/* Spark Fast — intro overlay */}
      {sparkFastOverlay > 0 && (
        <div
          style={{
            position: "absolute",
            inset: -1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `rgba(10, 10, 25, ${0.8 * sparkFastOverlay})`,
            zIndex: 300,
            pointerEvents: "none",
          }}
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            transform: `scale(${sparkFastOverlayScale})`,
            opacity: sparkFastOverlay,
          }}>
            <svg viewBox="0 0 24 24" width={64} height={64} fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={COLORS.accent} />
            </svg>
            <div style={{
              fontFamily: serifFont,
              fontSize: 120,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}>
              Spark
            </div>
            <div style={{ fontFamily: sansFont, fontSize: 72, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              {text.sparkOverlay}
            </div>
          </div>
        </div>
      )}

      {/* Spark Plan — transition overlay */}
      {planOverlayOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: -1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `rgba(10, 10, 25, ${0.8 * planOverlayOpacity})`,
            zIndex: 300,
            pointerEvents: "none",
          }}
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            transform: `scale(${planOverlayScale})`,
            opacity: planOverlayOpacity,
          }}>
            <svg viewBox="0 0 24 24" width={56} height={56} fill="none" stroke="#818cf8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <div style={{ fontFamily: serifFont, fontSize: 120, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
              Spark Plan
            </div>
            <div style={{ fontFamily: sansFont, fontSize: 72, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              {text.planOverlay}
            </div>
          </div>
        </div>
      )}

      {/* Banana — transition overlay */}
      {bananaOverlayOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: -1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `rgba(10, 10, 25, ${0.8 * bananaOverlayOpacity})`,
            zIndex: 300,
            pointerEvents: "none",
          }}
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            transform: `scale(${bananaOverlayScale})`,
            opacity: bananaOverlayOpacity,
          }}>
            <svg viewBox="0 0 24 24" width={56} height={56} fill="none" stroke={COLORS.bananaYellow} strokeWidth={1.5}>
              <path d="M4 20c2-4 6-14 14-16-2 6-4 10-8 14-2 2-4 2.5-6 2z" />
            </svg>
            <div style={{ fontFamily: serifFont, fontSize: 120, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
              Banana
            </div>
            <div style={{ fontFamily: sansFont, fontSize: 72, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              {text.bananaOverlay}
            </div>
          </div>
        </div>
      )}

      {/* ---- BOTTOM CENTER TEXT (step captions during Phase 1) ---- */}
      <BottomText line1={text.step1[0]} line2={text.step1[1]} opacity={p1Text} />
      <BottomText line1={text.step2[0]} line2={text.step2[1]} opacity={p2Text} />
      <BottomText line1={text.step3[0]} line2={text.step3[1]} opacity={p3Text} />

      {/* Finale: "Click. Describe. Done." */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: finaleOpacity,
        }}
      >
        <div
          style={{
            fontFamily: serifFont,
            fontSize: isJa ? 84 : 108,
            fontWeight: 700,
            color: COLORS.textPrimary,
            lineHeight: 1.15,
          }}
        >
          {text.finale1}
        </div>
        {text.finale2 ? (
          <div style={{ fontFamily: serifFont, fontSize: 108, fontWeight: 700, color: COLORS.feature, lineHeight: 1.15 }}>
            {text.finale2}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
