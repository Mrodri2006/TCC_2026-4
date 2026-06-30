import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<any>();

let pendingNavigation: { screen: string; params?: Record<string, unknown> } | null = null;

export function navigateFromNotification(data: Record<string, unknown> = {}) {
  const screen = typeof data.screen === "string" ? data.screen : "Notificacoes";
  const params = typeof data.params === "object" && data.params !== null
    ? (data.params as Record<string, unknown>)
    : undefined;

  if (navigationRef.isReady()) {
    navigationRef.navigate(screen, params);
  } else {
    pendingNavigation = { screen, params };
  }
}

export function flushPendingNavigation() {
  if (!pendingNavigation || !navigationRef.isReady()) return;
  const { screen, params } = pendingNavigation;
  pendingNavigation = null;
  navigationRef.navigate(screen, params);
}
