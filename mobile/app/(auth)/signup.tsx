import { useState } from "react";
import { Link } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | "confirm" | "created">(null);
  const danger = useThemeColor({}, "danger");
  const dangerBg = useThemeColor({}, "dangerBg");
  const tint = useThemeColor({}, "tint");

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // Either way the user signs in explicitly next — "confirm" when email
    // confirmation is on, "created" when the account is ready right away.
    setDone(needsConfirmation ? "confirm" : "created");
  }

  if (done) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {done === "confirm" ? "Check your email" : "Account created"}
        </Text>
        <Text style={styles.subtitle}>
          {done === "confirm"
            ? `We've sent a confirmation link to ${email}. Click the link to activate your account, then sign in.`
            : "Your account is ready — sign in to get started."}
        </Text>
        <Link href="/login" asChild>
          <Button title="Go to sign in" onPress={() => {}} variant="outline" />
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
        <Text style={styles.title}>Create an account</Text>
        <Text style={styles.subtitle}>Enter your details to get started</Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: dangerBg }]}>
            <Text style={{ color: danger }}>{error}</Text>
          </View>
        )}

        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
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
          placeholder="Minimum 6 characters"
        />

        <Button
          title={loading ? "Creating account..." : "Create account"}
          onPress={handleSubmit}
          loading={loading}
          disabled={!email || password.length < 6}
        />

        <View style={styles.footer}>
          <Text>Already have an account? </Text>
          <Link href="/login" style={{ color: tint, fontWeight: "600" }}>
            Sign in
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
});
