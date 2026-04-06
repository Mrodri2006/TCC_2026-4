import React from "react";
import { StatusBar, View } from "react-native";
import { useTheme } from "./ThemeContext";

export function withThemeScreen<P>(Component: React.ComponentType<P>) {
  return function ThemedScreen(props: P) {
    const { isDark, theme } = useTheme();
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={theme.background}
        />
        <Component {...props} />
      </View>
    );
  };
}
