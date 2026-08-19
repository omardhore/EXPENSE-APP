import { supabase } from "@/lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Account-lifecycle operations (delete account, clear all data) need the
// server's service-role privileges, so — unlike everything else in this
// app, which talks to Supabase directly — these two call back into the
// Next.js web app's API over HTTPS with the user's Supabase access token
// as a Bearer header. See src/lib/api/auth.ts on the web side.
export async function callAccountApi(path: "/api/v1/account" | "/api/v1/data") {
  if (!API_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not configured. Set it in .env to the web app's URL.",
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? "Request failed");
  }
  return json.data;
}
