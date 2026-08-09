import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Sito").slice(0, 80);
  const subtitle = (searchParams.get("subtitle") || "Learn from verified practitioners").slice(0, 120);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #020617 0%, #0f172a 50%, #082f49 100%)",
          padding: "56px 64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", color: "#38bdf8", fontSize: 28, fontWeight: 700 }}>Sito</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ color: "#f8fafc", fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
          <div style={{ color: "#94a3b8", fontSize: 28, lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", color: "#64748b", fontSize: 20 }}>sito.club</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
