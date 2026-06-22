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
  background: "#F6F8FB",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",
  headerBtnBg: "#EEF2FF",
  actionBg: "#FFFFFF",
  actionBorder: "#E2E8F0",
  deleteBorder: "#FECACA",
  surface: "#FFFFFF",
  surfaceBorder: "#E2E8F0",
  surfaceTextPrimary: "#0F172A",
  surfaceTextSecondary: "#334155",
  surfaceTextMuted: "#64748B",
};

const darkTheme: ThemeColors = {
  background: "#090E1A",
  card: "#111827",
  border: "rgba(255,255,255,0.09)",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  headerBtnBg: "rgba(96,165,250,0.12)",
  actionBg: "#111827",
  actionBorder: "rgba(255,255,255,0.09)",
  deleteBorder: "#7F1D1D",
  surface: "#111827",
  surfaceBorder: "rgba(255,255,255,0.09)",
  surfaceTextPrimary: "#F8FAFC",
  surfaceTextSecondary: "#CBD5E1",
  surfaceTextMuted: "#94A3B8",
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
