"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown in the root layout itself, so it
 * must render its own <html>/<body> and cannot rely on the app theme/styles.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactNode {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          backgroundColor: "#f4f6fb",
          color: "#22262f",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>เกิดข้อผิดพลาดร้ายแรง</h1>
          <p style={{ fontSize: 14, color: "#5c6675", margin: "0 0 20px", lineHeight: 1.6 }}>
            ระบบไม่สามารถทำงานได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง
          </p>
          <button
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "#2f57d9",
              color: "#fbfcff",
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
