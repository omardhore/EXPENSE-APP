import type { NextRequest } from "next/server";
import { createClient as createBearerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { unauthorizedResponse } from "./response";

// Most routes are browser-only and rely on the cookie session. A couple of
// account-lifecycle routes (delete account, clear workspace data) are also
// callable from the mobile app, which has no cookies — it sends a Supabase
// access token as a Bearer header instead.
export async function getAuthenticatedUser(request?: NextRequest) {
  const authHeader = request?.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer (.+)$/i)?.[1];

  if (bearerToken) {
    const supabase = createBearerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearerToken);

    if (error || !user) {
      return { user: null, error: unauthorizedResponse() };
    }
    return { user, error: null };
  }

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
