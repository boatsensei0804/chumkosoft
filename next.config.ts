import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained build at .next/standalone for small Docker images.
  // See node_modules/next/dist/docs/.../config/.../output.md
  output: "standalone",
  // @node-rs/bcrypt is a native (.node) addon — keep it external so Next traces
  // and copies the platform binary into the standalone output instead of trying
  // to bundle it (which would drop the native file and crash at runtime).
  serverExternalPackages: ["@node-rs/bcrypt"],
  // Keep the dev overlay indicator out of the bottom-left, where it overlaps
  // the sidebar profile card.
  devIndicators: { position: "bottom-right" },
  experimental: {
    // Face-dataset uploads send a client-resized JPEG (≤ ~500KB) per action call;
    // the default 1MB limit is too tight once multipart overhead is included.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
