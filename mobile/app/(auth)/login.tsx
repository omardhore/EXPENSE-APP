import { useState } from "react";
import { Link } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/components/Themed";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const danger = useThemeColor({}, "danger");
  const dangerBg = useThemeColor({}, "dangerBg");
  const tint = useThemeColor({}, "tint");

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Enter your credentials to access your account
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
        <Field
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title={loading ? "Signing in..." : "Sign in"}
          onPress={handleSubmit}
          loading={loading}
          disabled={!email || !password}
        />

        <Link href="/forgot-password" style={[styles.link, { color: tint }]}>
          Forgot password?
        </Link>

        <View style={styles.footer}>
          <Text>Don&apos;t have an account? </Text>
          <Link href="/signup" style={{ color: tint, fontWeight: "600" }}>
            Sign up
          </Link>
        </View>
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
  link: {
    textAlign: "center",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
});
