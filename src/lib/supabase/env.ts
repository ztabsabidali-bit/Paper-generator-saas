export interface SupabaseEnv {
  url: string;
  anonKey: string;
  configured: boolean;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, anonKey, configured: Boolean(url && anonKey) };
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const { url, anonKey, configured } = getSupabaseEnv();
  if (!configured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (or .dev.vars for the Workers runtime).",
    );
  }
  return { url, anonKey };
}
