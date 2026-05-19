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
  surface: "#ffffff",
  surfaceBorder: "#E2E8F0",
  surfaceTextPrimary: "#0F2937",
  surfaceTextSecondary: "#334155",
  surfaceTextMuted: "#64748B",
};

const darkTheme: ThemeColors = {
  background: "#0e0e0e",
  card: "#141821",
  border: "rgba(255,255,255,0.10)",
  textPrimary: "#f7f7f7",
  textSecondary: "rgba(247,247,247,0.78)",
  textMuted: "rgba(247,247,247,0.55)",
  headerBtnBg: "rgba(255,255,255,0.06)",
  actionBg: "#1b202c",
  actionBorder: "rgba(255,255,255,0.10)",
  deleteBorder: "#5a2a2a",
  surface: "#141821",
  surfaceBorder: "rgba(255,255,255,0.10)",
  surfaceTextPrimary: "#f7f7f7",
  surfaceTextSecondary: "rgba(247,247,247,0.78)",
  surfaceTextMuted: "rgba(247,247,247,0.55)",
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
