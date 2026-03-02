import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadSansJa } from "@remotion/google-fonts/ZenKakuGothicNew";
import { COLORS } from "../styles/colors";
import { Locale } from "../i18n";

const { fontFamily: serif } = loadSerif("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

const { fontFamily: sans } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const { fontFamily: sansJp } = loadSansJa("normal", {
  weights: ["400", "500", "700"],
});

// Single lightning strike path from top of screen to icon center.
// Zigzags naturally like real lightning. Coordinates in viewport space.
const STRIKE_POINTS: [number, number][] = [
  [960, -30],
  [938, 55],
  [972, 145],
  [932, 230],
  [968, 310],
  [942, 370],
  [960, 415],
];

// Small branch off the main bolt
const BRANCH_POINTS: [number, number][] = [
  [932, 230],
  [898, 272],
  [912, 310],
];

export const Opening: React.FC<{ locale: Locale }> = ({ locale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isJa = locale === "ja";
  const titleFont = isJa ? sansJp : serif;
  const subtitleFont = isJa ? sansJp : sans;
  const subtitle = isJa
    ? "ローカル開発のUI注釈をリアルタイムに"
    : "Real-time UI annotation for local development";
  const at = (framesAt30Fps: number) => (framesAt30Fps / 30) * fps;

  // Icon: fast punchy entrance with overshoot, 2-frame delay
  const iconEntry = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 13, mass: 0.2, stiffness: 320 },
  });

  const titleOpacity = interpolate(frame, [0.25 * fps, 0.55 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [0.4 * fps, 0.7 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out everything before crossfade to Demo (last 15 frames)
  const exitOpacity = interpolate(frame, [at(60), at(72)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Lightning strike: draws from top to icon in ~3 frames, then fades fast
  const strikeReveal = interpolate(frame, [at(1), at(4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strikeOpacity = interpolate(
    frame,
    [at(1), at(3), at(6), at(10)],
    [0, 1, 0.3, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Impact flash: bright burst when bolt reaches icon
  const flash = interpolate(frame, [at(2), at(3), at(5), at(9)], [0, 1, 0.15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Icon glow: electric cyan glow that fades
  const glow = interpolate(frame, [at(2), at(4), at(10), at(20)], [0, 1, 0.15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shockwave ring
  const ringExpand = interpolate(frame, [at(3), at(15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOp = interpolate(frame, [at(3), at(5), at(10), at(15)], [0, 0.45, 0.08, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Build visible polyline from reveal progress
  const buildPath = (points: [number, number][], reveal: number): string | null => {
    const totalSegs = points.length - 1;
    if (totalSegs < 1 || reveal <= 0) return null;
    const revealedSegs = Math.floor(reveal * totalSegs);
    const partial = reveal * totalSegs - revealedSegs;
    const pts: string[] = [];

    for (let j = 0; j <= totalSegs; j++) {
      if (j <= revealedSegs) {
        pts.push(`${points[j][0]},${points[j][1]}`);
      } else if (j === revealedSegs + 1 && partial > 0) {
        const prev = points[j - 1];
        const cur = points[j];
        pts.push(`${prev[0] + (cur[0] - prev[0]) * partial},${prev[1] + (cur[1] - prev[1]) * partial}`);
        break;
      }
    }
    return pts.length >= 2 ? pts.join(" ") : null;
  };

  const strikePath = buildPath(STRIKE_POINTS, strikeReveal);
  const branchReveal = interpolate(frame, [at(2), at(5)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const branchPath = buildPath(BRANCH_POINTS, branchReveal);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Impact flash — radial burst from icon center */}
      {flash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 60% 50% at 50% 39%, rgba(255,255,255,${flash * 0.85}) 0%, rgba(56,189,248,${flash * 0.12}) 40%, transparent 75%)`,
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}

      {/* Shockwave ring */}
      {ringOp > 0 && (
        <div
          style={{
            position: "absolute",
            left: 960 - (30 + ringExpand * 320),
            top: 415 - (30 + ringExpand * 320),
            width: (30 + ringExpand * 320) * 2,
            height: (30 + ringExpand * 320) * 2,
            borderRadius: "50%",
            border: `${Math.max(0.3, 1.2 - ringExpand)}px solid rgba(56,189,248,${ringOp})`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}

      {/* Lightning bolt — the strike */}
      {strikeOpacity > 0 && (
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            pointerEvents: "none",
            zIndex: 8,
          }}
          viewBox="0 0 1920 1080"
        >
          {/* Main bolt — glow layer */}
          {strikePath && (
            <polyline
              points={strikePath}
              fill="none"
              stroke="rgba(56,189,248,0.35)"
              strokeWidth={12}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={strikeOpacity}
            />
          )}
          {/* Main bolt — core */}
          {strikePath && (
            <polyline
              points={strikePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={strikeOpacity}
            />
          )}
          {/* Main bolt — bright center */}
          {strikePath && (
            <polyline
              points={strikePath}
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={strikeOpacity}
            />
          )}

          {/* Branch — glow */}
          {branchPath && (
            <polyline
              points={branchPath}
              fill="none"
              stroke="rgba(56,189,248,0.25)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={strikeOpacity * 0.7}
            />
          )}
          {/* Branch — core */}
          {branchPath && (
            <polyline
              points={branchPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={strikeOpacity * 0.7}
            />
          )}
          {/* Branch — bright center */}
          {branchPath && (
            <polyline
              points={branchPath}
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth={0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={strikeOpacity * 0.7}
            />
          )}
        </svg>
      )}

      <Img
        src={staticFile("spark-banana-icon.png")}
        style={{
          width: 160,
          height: 160,
          transform: `scale(${iconEntry})`,
          opacity: Math.min(1, iconEntry * 2.5) * exitOpacity,
          filter:
            glow > 0.05
              ? `drop-shadow(0 0 ${8 + glow * 22}px rgba(56,189,248,${glow * 0.7})) drop-shadow(0 0 ${glow * 45}px rgba(34,211,238,${glow * 0.3}))`
              : "none",
          zIndex: 2,
        }}
      />
      <div
        style={{
          opacity: titleOpacity * exitOpacity,
          fontFamily: titleFont,
          fontSize: 150,
          fontWeight: 900,
          color: COLORS.textPrimary,
          letterSpacing: "-0.02em",
          zIndex: 2,
        }}
      >
        spark-banana
      </div>
      <div
        style={{
          opacity: subtitleOpacity * exitOpacity,
          fontFamily: subtitleFont,
          fontSize: 42,
          color: COLORS.textDim,
          zIndex: 2,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
