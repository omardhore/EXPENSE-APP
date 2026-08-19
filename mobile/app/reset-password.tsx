import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

// Landing screen for the "expensetracker://reset-password" deep link sent
// by the forgot-password email. Supabase's mobile recovery flow delivers
// access_token/refresh_token as query params, which we exchange for a
// session before letting the user set a new password. Needs verification
// on a real device/simulator — deep links can't be exercised in this
// sandbox.
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
  }>();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const danger = useThemeColor({}, "danger");
  const dangerBg = useThemeColor({}, "dangerBg");

  useEffect(() => {
    async function establishSession() {
      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) setError(error.message);
      } else {
        setError("Invalid or expired reset link. Request a new one.");
      }
      setReady(true);
    }
    establishSession();
  }, [params.access_token, params.refresh_token]);

  async function handleSubmit() {
    setError(null);
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
    router.replace("/(tabs)");
  }

  if (!ready) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          Choose a new password for your account
        </Text>

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
          disabled={password.length < 6}
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
