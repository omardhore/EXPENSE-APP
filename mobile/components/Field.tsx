import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { Text, View, useThemeColor } from "@/components/Themed";

interface Props extends TextInputProps {
  label: string;
}

export function Field({ label, style, ...inputProps }: Props) {
  const border = useThemeColor({}, "border");
  const card = useThemeColor({}, "card");
  const text = useThemeColor({}, "text");
  const muted = useThemeColor({}, "muted");

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={muted}
        style={[
          styles.input,
          { borderColor: border, backgroundColor: card, color: text },
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
