import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface SessionContext {
  supabase: SupabaseServerClient;
  user: User;
  profile: Profile;
}

export function isSupabaseConfigured() {
  return getSupabaseEnv().configured;
}

/**
 * Resolves the signed-in user and their profile once per request.
 * Returns null when Supabase is unconfigured or the session is invalid.
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    if (!isSupabaseConfigured()) return null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("id, email, full_name, role, is_active, institution_id, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) return null;

    return { supabase, user, profile: profile as Profile };
  },
);
