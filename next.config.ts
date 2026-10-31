import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cloudflare image optimisation needs an `images` binding. Keep `next/image`
  // working out of the box by serving the original files instead.
  images: { unoptimized: true },
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
