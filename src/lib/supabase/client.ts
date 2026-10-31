"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { requireSupabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;
  const { url, anonKey } = requireSupabaseEnv();
  client = createBrowserClient<Database>(url, anonKey);
  return client;
}
