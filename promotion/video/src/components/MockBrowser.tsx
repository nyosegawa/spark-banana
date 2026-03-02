import { COLORS } from "../styles/colors";

export const MockBrowser: React.FC<{
  children: React.ReactNode;
  url?: string;
  width?: number;
}> = ({ children, url = "localhost:3000", width = 680 }) => {
  return (
    <div
      style={{
        width,
        borderRadius: 12,
        overflow: "hidden",
        background: COLORS.bgCard,
        border: "1px solid #e0ddd5",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background: "#f2efe8",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid #e0ddd5",
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ff5f57",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#febc2e",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#28c840",
            }}
          />
        </div>
        {/* URL bar */}
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily:
              "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
            fontSize: 18,
            color: COLORS.textDim,
          }}
        >
          {url}
        </div>
      </div>
      {/* Content */}
      <div
        style={{
          padding: 24,
          minHeight: 600,
          position: "relative",
          background: "#ffffff",
        }}
      >
        {children}
      </div>
    </div>
  );
};
