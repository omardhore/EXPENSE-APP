import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useThemeColor } from "@/components/Themed";

type Variant = "primary" | "outline" | "destructive" | "ghost";

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: Props) {
  const tint = useThemeColor({}, "tint");
  const danger = useThemeColor({}, "danger");
  const border = useThemeColor({}, "border");
  const text = useThemeColor({}, "text");

  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === "primary"
      ? tint
      : variant === "destructive"
        ? danger
        : "transparent";
  const textColor =
    variant === "primary" || variant === "destructive" ? "#fff" : text;
  const borderColor =
    variant === "outline" ? danger : variant === "ghost" ? "transparent" : border;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor: variant === "outline" || variant === "primary" ? border : borderColor,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
        variant === "outline" && { borderColor: danger, borderWidth: 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: variant === "outline" ? danger : textColor }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
});
