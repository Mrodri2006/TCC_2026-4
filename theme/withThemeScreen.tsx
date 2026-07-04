import React from "react";
import { StatusBar, View } from "react-native";
import { useTheme } from "./ThemeContext";
import Animated, { FadeIn } from "react-native-reanimated";

export function withThemeScreen<P>(Component: React.ComponentType<P>) {
  return function ThemedScreen(props: P) {
    const { isDark, theme } = useTheme();
    return (
      <Animated.View entering={FadeIn.duration(180)} style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={theme.background}
        />
        <Component {...props} />
      </Animated.View>
    );
  };
}
