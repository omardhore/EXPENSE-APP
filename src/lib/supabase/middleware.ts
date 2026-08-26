import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Mirrors the { success:false, error:{ code,message }, meta } shape from
// lib/api/response.ts so middleware-level API rejections match route errors.
function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
      meta: { timestamp: new Date().toISOString() },
    },
    { status },
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isApiPath = request.nextUrl.pathname.startsWith("/api/");

  // For API paths, enforce a basic CSRF defense and return structured JSON
  // instead of HTML redirects. State-changing methods must originate from a
  // same-origin request; cross-origin (or origin-less) mutations are rejected.
  if (isApiPath) {
    const method = request.method.toUpperCase();
    const isStateChanging =
      method === "POST" ||
      method === "PUT" ||
      method === "PATCH" ||
      method === "DELETE";

    if (isStateChanging) {
      const secFetchSite = request.headers.get("sec-fetch-site");
      let sameOrigin: boolean;
      if (secFetchSite) {
        // Modern browsers send this; "same-origin"/"none" are trusted.
        sameOrigin = secFetchSite === "same-origin" || secFetchSite === "none";
      } else {
        // Fall back to comparing the Origin header against the request origin.
        const origin = request.headers.get("origin");
        sameOrigin = origin === request.nextUrl.origin;
      }

      if (!sameOrigin) {
        return jsonError(
          "FORBIDDEN",
          "Cross-origin request rejected",
          403,
        );
      }
    }

    if (!user) {
      return jsonError("UNAUTHORIZED", "Authentication required", 401);
    }

    // Authenticated API requests bypass the page-redirect logic below.
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login (except for auth pages and PWA files)
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/forgot-password");

  // Reached via the emailed recovery link, which signs the user into a
  // temporary session — it must stay reachable even though `user` is set,
  // so it can't be lumped in with the "redirect signed-in users away" pages.
  const isPasswordRecoveryPage = request.nextUrl.pathname.startsWith(
    "/reset-password",
  );

  const isPublicFile =
    request.nextUrl.pathname.startsWith("/manifest.json") ||
    request.nextUrl.pathname.startsWith("/sw.js") ||
    request.nextUrl.pathname.startsWith("/workbox-") ||
    request.nextUrl.pathname.startsWith("/icon-") ||
    request.nextUrl.pathname.match(/\.(png|ico|svg|xml)$/);

  if (
    !user &&
    !isAuthPage &&
    !isPasswordRecoveryPage &&
    !isPublicFile
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
