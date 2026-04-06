import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Text, TextInput } from "react-native";

type ThemeColors = {
  background: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  headerBtnBg: string;
  actionBg: string;
  actionBorder: string;
  deleteBorder: string;
};

type ThemeContextValue = {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  theme: ThemeColors;
};

const lightTheme: ThemeColors = {
  background: "#ffffff",
  card: "#f7f7f7",
  border: "#e6e6e6",
  textPrimary: "#000000",
  textSecondary: "#333333",
  textMuted: "#666666",
  headerBtnBg: "#f1f1f1",
  actionBg: "#ffffff",
  actionBorder: "#E0E0E0",
  deleteBorder: "#f1c0c0",
};

const darkTheme: ThemeColors = {
  background: "#0e0e0e",
  card: "#1a1a1a",
  border: "#2f2f2f",
  textPrimary: "#f7f7f7",
  textSecondary: "#e0e0e0",
  textMuted: "#b0b0b0",
  headerBtnBg: "#2a2a2a",
  actionBg: "#1c1c1c",
  actionBorder: "#3a3a3a",
  deleteBorder: "#5a2a2a",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  useEffect(() => {
    Text.defaultProps = Text.defaultProps || {};
    const existingStyle = Text.defaultProps.style;
    Text.defaultProps.style = [
      { color: theme.textPrimary },
      existingStyle,
    ].filter(Boolean);

    TextInput.defaultProps = TextInput.defaultProps || {};
    const existingInputStyle = TextInput.defaultProps.style;
    TextInput.defaultProps.style = [
      { color: theme.textPrimary },
      existingInputStyle,
    ].filter(Boolean);
    TextInput.defaultProps.placeholderTextColor =
      theme.textMuted;
  }, [theme.textPrimary, theme.textMuted]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
