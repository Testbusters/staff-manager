import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Staff Manager — Portale interno";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const svgBuffer = readFileSync(join(process.cwd(), "app/icon.svg"));
  const svgBase64 = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#FE3200",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgBase64} width={180} height={180} alt="" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-1px",
            }}
          >
            Staff Manager
          </span>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 28 }}>
            Testbusters &amp; Peer4Med
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
