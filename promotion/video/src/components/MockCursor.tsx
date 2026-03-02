import { useCurrentFrame, interpolate } from "remotion";

export const MockCursor: React.FC<{
  x: number;
  y: number;
  clicking?: boolean;
}> = ({ x, y, clicking = false }) => {
  const frame = useCurrentFrame();

  const scale = clicking
    ? interpolate(frame % 10, [0, 4, 8], [1, 0.8, 1], {
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale})`,
        pointerEvents: "none",
        zIndex: 100,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
      }}
    >
      <svg width={24} height={28} viewBox="0 0 24 28">
        <path
          d="M5 1L5 20L10 16L14 24L17 22.5L13 14.5L19 13.5L5 1Z"
          fill="white"
          stroke="black"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
