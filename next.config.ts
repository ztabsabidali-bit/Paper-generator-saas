import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cloudflare image optimisation needs an `images` binding. Keep `next/image`
  // working out of the box by serving the original files instead.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      // CSV imports accept files up to 2 MB. The rows travel as JSON, where
      // quoting and escaping can roughly double the payload, so leave headroom
      // above the file cap instead of failing at Next's 1 MB default.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;

// Note: this app talks to Supabase over HTTPS and uses no Cloudflare bindings
// (no R2, KV, D1 or Images), so `initOpenNextCloudflareForDev()` is not called.
// That helper boots a Miniflare/workerd instance at config load, which is
// unnecessary here and crashes `next build` and `next dev` on hosts with an
// incompatible workerd binary (an access violation in the runtime).
//
// When you do add a binding, wire it up like this:
//
//   if (process.env.NODE_ENV === "development") {
//     void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) =>
//       initOpenNextCloudflareForDev(),
//     );
//   }
//
// `opennextjs-cloudflare build` supplies bindings for the deployed worker and
// never needs this helper.
