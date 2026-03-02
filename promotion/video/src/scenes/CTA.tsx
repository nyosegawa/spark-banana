import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSansJa } from "@remotion/google-fonts/ZenKakuGothicNew";
import { COLORS } from "../styles/colors";
import { Locale } from "../i18n";

const { fontFamily: sans } = loadFont("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

const { fontFamily: serif } = loadSerif("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

const { fontFamily: sansJp } = loadSansJa("normal", {
  weights: ["500", "700"],
});

export const CTA: React.FC<{ locale: Locale }> = ({ locale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isJa = locale === "ja";
  const sansFont = isJa ? sansJp : sans;
  const serifFont = isJa ? sansJp : serif;
  const tagline = isJa
    ? "デザイン修正を瞬時に行うためのツール"
    : "Annotate UI. Apply fixes instantly.";

  // Icon entrance
  const iconEntry = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Install command typing
  const cmdText = "npm install -D spark-banana spark-bridge";
  const cmdStart = 1 * fps;
  const typedChars = Math.max(0, Math.floor((frame - cmdStart) * 1.0));
  const displayCmd = cmdText.slice(0, Math.min(typedChars, cmdText.length));
  const cmdDone = typedChars >= cmdText.length;

  // URL fade
  const urlOpacity = interpolate(
    frame,
    [2.5 * fps, 3 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Tagline
  const tagOpacity = interpolate(
    frame,
    [3.2 * fps, 3.8 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
      }}
    >
      {/* Icon */}
      <div
        style={{
          transform: `scale(${iconEntry})`,
          opacity: iconEntry,
        }}
      >
        <Img
          src={staticFile("spark-banana-icon.png")}
          style={{ width: 120, height: 120 }}
        />
      </div>

      {/* Install command */}
      <div
        style={{
          background: COLORS.bgCard,
          border: "1px solid #e0ddd5",
          borderRadius: 12,
          padding: "20px 36px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
            fontSize: 42,
            color: COLORS.textPrimary,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: COLORS.textDim }}>$</span>
          <span>{displayCmd}</span>
          {!cmdDone && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 33,
                background: COLORS.accent,
                opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
              }}
            />
          )}
        </div>
      </div>

      {/* GitHub URL */}
      <div
        style={{
          fontFamily: sansFont,
          fontSize: 36,
          color: COLORS.accent,
          fontWeight: 500,
          opacity: urlOpacity,
        }}
      >
        github.com/nyosegawa/spark-banana
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: serifFont,
          fontSize: isJa ? 56 : 66,
          fontWeight: 700,
          color: COLORS.feature,
          opacity: tagOpacity,
        }}
      >
        {tagline}
      </div>
    </AbsoluteFill>
  );
};
