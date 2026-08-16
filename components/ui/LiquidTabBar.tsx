import * as React from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeContext";
import { radius, typography } from "../../theme/tokens";

const BAR_HEIGHT = 68;
const BAR_PADDING = 6;
const ACTIVE_COLOR = "#FF8700";

function getTabLabel(
  label: BottomTabBarProps["descriptors"][string]["options"]["tabBarLabel"],
  title: string | undefined,
  routeName: string,
) {
  if (typeof label === "string") return label;
  return title ?? routeName;
}

export function LiquidTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const [barWidth, setBarWidth] = React.useState(0);
  const routeCount = Math.max(state.routes.length, 1);
  const itemWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / routeCount : 0;
  const bubbleWidth = itemWidth > 0 ? Math.max(44, Math.min(74, itemWidth - 8)) : 0;
  const focusedOptions = descriptors[state.routes[state.index]?.key]?.options;
  const activeTintColor = focusedOptions?.tabBarActiveTintColor ?? ACTIVE_COLOR;
  const activeIndex = useSharedValue(state.index);
  const liquid = useSharedValue(0);
  const direction = useSharedValue(1);
  const previousIndex = React.useRef(state.index);

  React.useEffect(() => {
    direction.value = state.index >= previousIndex.current ? 1 : -1;
    activeIndex.value = withSpring(state.index, { damping: 16, stiffness: 180, mass: 0.75 });
    liquid.value = withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 260 }));
    previousIndex.current = state.index;
  }, [activeIndex, direction, liquid, state.index]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: BAR_PADDING + activeIndex.value * itemWidth + (itemWidth - bubbleWidth) / 2 },
      { scaleX: 1 + liquid.value * 0.18 },
      { scaleY: 1 - liquid.value * 0.04 },
    ] as const,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(liquid.value, [0, 1], [0.2, 0.34]),
    transform: [
      { translateX: BAR_PADDING + activeIndex.value * itemWidth + (itemWidth - bubbleWidth) / 2 },
      { scaleX: 1 + liquid.value * 0.34 },
    ] as const,
  }));

  const tailStyle = useAnimatedStyle(() => ({
    opacity: interpolate(liquid.value, [0, 1], [0.08, 0.5]),
    transform: [{ translateX: direction.value * -10 * liquid.value }, { scale: 0.78 + liquid.value * 0.18 }] as const,
  }));

  const headStyle = useAnimatedStyle(() => ({
    opacity: interpolate(liquid.value, [0, 1], [0.08, 0.42]),
    transform: [{ translateX: direction.value * 10 * liquid.value }, { scale: 0.72 + liquid.value * 0.16 }] as const,
  }));

  const onBarLayout = React.useCallback((event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, 10) }]}>
      <View
        onLayout={onBarLayout}
        style={[
          styles.bar,
          {
            backgroundColor: isDark ? "rgba(7,26,51,0.96)" : "rgba(255,255,255,0.96)",
            borderColor: theme.border,
          },
        ]}
      >
        {bubbleWidth > 0 ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.glow, { width: bubbleWidth, backgroundColor: activeTintColor }, glowStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.bubble, { width: bubbleWidth, backgroundColor: activeTintColor }, bubbleStyle]}
            >
              <Animated.View style={[styles.drop, styles.dropStart, { backgroundColor: activeTintColor }, tailStyle]} />
              <Animated.View style={[styles.drop, styles.dropEnd, { backgroundColor: activeTintColor }, headStyle]} />
            </Animated.View>
          </>
        ) : null}

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const activeColor = options.tabBarActiveTintColor ?? ACTIVE_COLOR;
            const inactiveColor = options.tabBarInactiveTintColor ?? theme.textMuted;
            const iconColor = focused ? "#FFFFFF" : inactiveColor;
            const labelColor = focused ? "#FFFFFF" : inactiveColor;
            const label = getTabLabel(options.tabBarLabel, options.title, route.name);
            const showLabel = options.tabBarShowLabel !== false;
            const badge = options.tabBarBadge;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [
                  styles.item,
                  { width: itemWidth || undefined },
                  pressed && styles.itemPressed,
                ]}
              >
                <View style={styles.iconWrap}>
                  {options.tabBarIcon?.({
                    focused,
                    color: focused ? "#FFFFFF" : inactiveColor,
                    size: focused ? 23 : 21,
                  })}
                  {typeof badge === "number" || typeof badge === "string" ? (
                    <View style={[styles.badge, { borderColor: focused ? activeColor : theme.card }]}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  ) : null}
                </View>
                {showLabel ? (
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={[styles.label, { color: labelColor }, focused && styles.labelActive]}
                  >
                    {label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 14,
    right: 14,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: BAR_PADDING,
  },
  bubble: {
    position: "absolute",
    top: BAR_PADDING,
    height: BAR_HEIGHT - BAR_PADDING * 2,
    borderRadius: radius.pill,
    shadowColor: ACTIVE_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 4,
  },
  glow: {
    position: "absolute",
    top: BAR_PADDING + 5,
    height: BAR_HEIGHT - BAR_PADDING * 2 - 10,
    borderRadius: radius.pill,
  },
  drop: {
    position: "absolute",
    top: 15,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dropStart: {
    left: -7,
  },
  dropEnd: {
    right: -7,
  },
  item: {
    height: BAR_HEIGHT - BAR_PADDING * 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    gap: 2,
    zIndex: 1,
  },
  itemPressed: {
    opacity: 0.78,
  },
  iconWrap: {
    minHeight: 24,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.caption,
    maxWidth: "92%",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  labelActive: {
    fontWeight: "900",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
  },
});
