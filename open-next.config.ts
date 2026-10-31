import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Default OpenNext Cloudflare configuration.
 *
 * Add an R2 incremental cache once you enable ISR/`revalidate` caching:
 *   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
 *   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
 */
export default defineCloudflareConfig({});
