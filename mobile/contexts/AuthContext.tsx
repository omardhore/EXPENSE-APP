import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // During signup we immediately sign the auto-created session back out (see
  // signUp). Ignore those transient auth events so the app never navigates
  // into the dashboard on a half-settled session and then bounces back.
  const signingUpRef = useRef(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((error) => {
        // Never leave the app stuck on a blank loading screen if session
        // restore fails (e.g. storage/network error) — fall through to the
        // signed-out state so the login screen renders.
        console.error("Failed to restore auth session:", error);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      if (signingUpRef.current) return;
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, name: string) {
    signingUpRef.current = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        const already = /already registered|already exists|user_already/i.test(error.message);
        return {
          error: already
            ? "This email is already registered. Please sign in instead."
            : error.message,
          needsConfirmation: false,
        };
      }
      // With email confirmation on, Supabase obfuscates an existing address as
      // a user with no identities (and no session) to avoid leaking which
      // emails are registered. Treat that as "already registered" too.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        return {
          error: "This email is already registered. Please sign in instead.",
          needsConfirmation: false,
        };
      }
      if (data.session) {
        // Email confirmation is off, so signUp auto-signed the user in. Sign
        // that session back out so the user logs in explicitly. This avoids
        // landing on the dashboard on a session that's still settling — which
        // made the first data load error until a manual refresh.
        await supabase.auth.signOut();
        return { error: null, needsConfirmation: false };
      }
      // Confirmation is on: no session yet, the user must confirm via email.
      return { error: null, needsConfirmation: true };
    } finally {
      signingUpRef.current = false;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
