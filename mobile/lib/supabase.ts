import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.",
  );
}

// The mobile app talks directly to Supabase (same project/schema/RLS
// policies as the web app) instead of the Next.js /api/v1 routes, which
// are cookie-session-based and not designed for non-browser clients.
// Row Level Security is the shared enforcement boundary for both platforms.
// TODO(security): migrate token storage to expo-secure-store (chunked).
// AsyncStorage persists the access/refresh tokens in plaintext. SecureStore
// (Keychain/Keystore) is encrypted but rejects values above ~2KB on iOS, and
// Supabase sessions can exceed that, so a chunking storage adapter (split the
// JSON across multiple SecureStore keys) is required. Deferred because it
// needs on-device verification that persistence/refresh still work end-to-end.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
