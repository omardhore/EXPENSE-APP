import { createClient } from "@/lib/supabase/server";
import { unauthorizedResponse } from "./response";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: unauthorizedResponse() };
  }

  return { user, error: null };
}
