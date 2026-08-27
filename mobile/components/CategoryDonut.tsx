import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Text, useThemeColor } from "@/components/Themed";
import type { CategoryTotal } from "@/hooks/useDashboard";

// Brand-derived palette used when a category has no colour of its own.
const PALETTE = [
  "#004161",
  "#99CC33",
  "#0b5b85",
  "#7fb129",
  "#2e6f8f",
  "#bfdc7f",
  "#1f5573",
  "#6ca020",
];

interface Props {
  data: CategoryTotal[];
  currency: string;
}

const SIZE = 190;
const STROKE = 30;

export function CategoryDonut({ data, currency }: Props) {
  const muted = useThemeColor({}, "muted");
  const border = useThemeColor({}, "border");

  const total = data.reduce((sum, d) => sum + d.total, 0);
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  const lengths = data.map((d) => (total > 0 ? (d.total / total) * circumference : 0));
  const segments = data.map((d, i) => ({
    color: d.color ?? PALETTE[i % PALETTE.length],
    length: lengths[i],
    // prefix sum of prior segment lengths (category counts are tiny)
    offset: lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <View style={styles.wrap}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} originX={SIZE / 2} originY={SIZE / 2}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              stroke={border}
              strokeWidth={STROKE}
              fill="none"
            />
            {segments.map((s, i) => (
              <Circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                stroke={s.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${s.length} ${circumference - s.length}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
              />
            ))}
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.centerLabel, { color: muted }]}>Total</Text>
          <Text style={styles.centerValue}>
            {currency} {total.toFixed(0)}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={d.categoryId ?? `cat-${i}`} style={styles.legendRow}>
            <View
              style={[styles.swatch, { backgroundColor: d.color ?? PALETTE[i % PALETTE.length] }]}
            />
            <Text style={styles.legendName} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={{ color: muted }}>
              {currency} {d.total.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 16,
  },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    fontSize: 12,
  },
  centerValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  legend: {
    alignSelf: "stretch",
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendName: {
    flex: 1,
  },
});
