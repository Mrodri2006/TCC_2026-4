import { Platform } from "react-native";

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "900" as const },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "900" as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "800" as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "600" as const },
};
export const shadow = Platform.select({
  ios: { shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: { boxShadow: "0 8px 24px rgba(15,23,42,0.08)" },
});
