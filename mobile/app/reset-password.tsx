import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

// Landing screen for the "expensetracker://reset-password" deep link sent by
// the forgot-password email. Supabase's implicit recovery flow delivers the
// access_token / refresh_token in the URL *fragment* (#...), so we read the
// full incoming URL via Linking.useURL() and parse both the fragment and the
// query string. Requires the redirect URL to be on the Supabase allowlist
// (Authentication -> URL Configuration -> Redirect URLs) or the email link
// falls back to the Site URL. Verify on a real device — deep links can't be
// exercised in a headless sandbox.
//
// TODO(security): move to the PKCE recovery flow (exchangeCodeForSession with
// a `code` param) delivered over verified App/Universal Links rather than the
// guessable custom scheme; needs Supabase email-template + native config.
function parseAuthParams(url: string | null): {
  access_token?: string;
  refresh_token?: string;
  error?: string;
} {
  if (!url) return {};
  const out: Record<string, string> = {};
  const grab = (segment?: string) => {
    if (!segment) return;
    for (const pair of segment.split("&")) {
      const [k, v] = pair.split("=");
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  };
  const afterHash = url.split("#")[1];
  const afterQuery = url.split("?")[1]?.split("#")[0];
  grab(afterQuery);
  grab(afterHash);
  return {
    access_token: out.access_token,
    refresh_token: out.refresh_token,
    error: out.error_description || out.error,
  };
}

export default function ResetPasswordScreen() {
  // Tokens can arrive three ways depending on the flow and platform:
  //  - query params, which expo-router parses into route params
  //  - the URL fragment (#...), which expo-router drops — read from the raw URL
  // Cover both: route params first, then the raw initial/live deep-link URL.
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
    error?: string;
  }>();
  const liveUrl = Linking.useURL();
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  useEffect(() => {
    Linking.getInitialURL().then((u) => setInitialUrl(u ?? null));
  }, []);

  const authParams = useMemo(() => {
    const fromUrl = parseAuthParams(liveUrl ?? initialUrl);
    return {
      access_token:
        (typeof params.access_token === "string" ? params.access_token : undefined) ??
        fromUrl.access_token,
      refresh_token:
        (typeof params.refresh_token === "string" ? params.refresh_token : undefined) ??
        fromUrl.refresh_token,
      error:
        (typeof params.error_description === "string"
          ? params.error_description
          : typeof params.error === "string"
            ? params.error
            : undefined) ?? fromUrl.error,
    };
  }, [
    params.access_token,
    params.refresh_token,
    params.error_description,
    params.error,
    liveUrl,
    initialUrl,
  ]);

  const [ready, setReady] = useState(false);
  // Gates the password update: only true once a recovery session was freshly
  // established from this link's tokens. Never trust an ambient session.
  const [recoverySession, setRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const danger = useThemeColor({}, "danger");
  const dangerBg = useThemeColor({}, "dangerBg");

  useEffect(() => {
    let ignore = false;

    // Safety net: if no deep-link URL ever arrives (screen reached without a
    // recovery link), don't hang on a blank screen — bounce to login.
    const timer = setTimeout(() => {
      if (ignore || ready) return;
      setError("Invalid or expired reset link. Request a new one.");
      setReady(true);
      router.replace("/login");
    }, 4000);

    async function establishSession() {
      if (authParams.error) {
        await supabase.auth.signOut();
        if (ignore) return;
        setError(authParams.error);
        setReady(true);
        router.replace("/login");
        return;
      }
      if (authParams.access_token && authParams.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: authParams.access_token,
          refresh_token: authParams.refresh_token,
        });
        if (ignore) return;
        if (error) {
          await supabase.auth.signOut();
          if (ignore) return;
          setError(error.message);
          setReady(true);
          router.replace("/login");
          return;
        }
        setRecoverySession(true);
        setReady(true);
        return;
      }
      // A URL arrived but carried no tokens — invalid link. (params with no
      // route params either means nothing to work with.)
      if ((liveUrl ?? initialUrl) && !params.access_token) {
        if (ignore) return;
        setError("Invalid or expired reset link. Request a new one.");
        setReady(true);
        router.replace("/login");
      }
      // else: still waiting for the URL/params to resolve; the timer handles
      // the no-link case.
    }

    establishSession();
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authParams.access_token, authParams.refresh_token, authParams.error, liveUrl, initialUrl]);

  async function handleSubmit() {
    setError(null);
    if (!recoverySession) {
      setError("Invalid or expired reset link. Request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Password changed — sign out of the recovery session and have the user
    // sign in with their new password.
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!ready) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account</Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: dangerBg }]}>
            <Text style={{ color: danger }}>{error}</Text>
          </View>
        )}

        <Field
          label="New password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Minimum 6 characters"
        />
        <Field
          label="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Button
          title={loading ? "Saving..." : "Update password"}
          onPress={handleSubmit}
          loading={loading}
          disabled={password.length < 6 || !recoverySession}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 8,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
  },
});
