import { useState } from "react";
import { Link } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

// The reset link opens the app via the "expensetracker://reset-password"
// deep link (see app/reset-password.tsx). This must be verified on a real
// device/simulator — it can't be exercised in this sandbox.
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const danger = useThemeColor({}, "danger");
  const dangerBg = useThemeColor({}, "dangerBg");

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "expensetracker://reset-password",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          If an account exists for {email}, we&apos;ve sent a link to reset
          your password.
        </Text>
        <Link href="/login" asChild>
          <Button title="Back to sign in" onPress={() => {}} variant="outline" />
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset link
        </Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: dangerBg }]}>
            <Text style={{ color: danger }}>{error}</Text>
          </View>
        )}

        <Field
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
        />

        <Button
          title={loading ? "Sending..." : "Send reset link"}
          onPress={handleSubmit}
          loading={loading}
          disabled={!email}
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
