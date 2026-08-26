import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Shared helpers over supabase.auth.getUser() so the hooks and data helpers
// don't each re-implement the "who is the current user" boilerplate. The user
// is always derived from the authenticated session here, never trusted from a
// caller-supplied id.

/** The current authenticated user, or null when signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The current user's id, or throws "Not authenticated". Use in mutations that
 * must attribute a row to the signed-in user.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}
