import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../styles/colors";

export const MockFAB: React.FC<{
  state?: "connected" | "processing" | "done";
}> = ({ state = "connected" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  // Ring animation
  const ringScale = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [1, 1.25],
  );
  const ringOpacity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.6, 0.1],
  );

  const ringColor =
    state === "processing"
      ? COLORS.panelYellow
      : state === "done"
        ? COLORS.panelGreen
        : COLORS.panelGreen;

  // Bolt fill for processing
  const boltFillHeight =
    state === "processing"
      ? interpolate(
          frame % Math.round(2.8 * fps),
          [0, 0.22 * 2.8 * fps, 0.45 * 2.8 * fps, 2.8 * fps],
          [0, 100, 100, 0],
        )
      : state === "done"
        ? 100
        : 0;

  return (
    <div
      style={{
        position: "relative",
        width: 52,
        height: 52,
        transform: `scale(${entry})`,
      }}
    >
      {/* Status ring */}
      <div
        style={{
          position: "absolute",
          inset: -3,
          borderRadius: "50%",
          border: `2px solid ${ringColor}`,
          opacity: ringOpacity,
          transform: `scale(${ringScale})`,
        }}
      />
      {/* FAB body */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(30, 30, 30, 0.75)",
          backdropFilter: "blur(20px)",
          boxShadow:
            "0 2px 16px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={22}
          height={22}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            fill={COLORS.panelText}
            opacity={0.15}
          />
          {/* Yellow fill (animated) */}
          <clipPath id="fab-bolt-clip">
            <rect
              x="0"
              y={24 - (boltFillHeight / 100) * 24}
              width="24"
              height={(boltFillHeight / 100) * 24}
            />
          </clipPath>
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            fill={COLORS.bananaYellow}
            clipPath="url(#fab-bolt-clip)"
            opacity={boltFillHeight > 0 ? 1 : 0}
          />
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            stroke={COLORS.panelText}
            strokeWidth={1.8}
          />
        </svg>
      </div>
    </div>
  );
};
