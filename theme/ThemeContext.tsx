import React, { createContext, useContext, useMemo, useState } from "react";

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
  surface: string;
  surfaceBorder: string;
  surfaceTextPrimary: string;
  surfaceTextSecondary: string;
  surfaceTextMuted: string;
};

type ThemeContextValue = {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  theme: ThemeColors;
};

const lightTheme: ThemeColors = {
  background: "#F4F7F8",
  card: "#FFFFFF",
  border: "#DCE7EA",
  textPrimary: "#102A32",
  textSecondary: "#334155",
  textMuted: "#64748B",
  headerBtnBg: "#E7F3F5",
  actionBg: "#FFFFFF",
  actionBorder: "#DCE7EA",
  deleteBorder: "#F2B8B5",
  surface: "#FFFFFF",
  surfaceBorder: "#DCE7EA",
  surfaceTextPrimary: "#102A32",
  surfaceTextSecondary: "#334155",
  surfaceTextMuted: "#64748B",
};

const darkTheme: ThemeColors = {
  background: "#071316",
  card: "#101D22",
  border: "rgba(255,255,255,0.10)",
  textPrimary: "#F2FAFA",
  textSecondary: "rgba(242,250,250,0.78)",
  textMuted: "rgba(242,250,250,0.58)",
  headerBtnBg: "rgba(255,255,255,0.06)",
  actionBg: "#13262C",
  actionBorder: "rgba(255,255,255,0.10)",
  deleteBorder: "#6F2D2D",
  surface: "#101D22",
  surfaceBorder: "rgba(255,255,255,0.10)",
  surfaceTextPrimary: "#F2FAFA",
  surfaceTextSecondary: "rgba(242,250,250,0.78)",
  surfaceTextMuted: "rgba(242,250,250,0.58)",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

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
