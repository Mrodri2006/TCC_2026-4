import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";

type NotificationsModule = typeof import("expo-notifications");
let notificationsModule: NotificationsModule | null = null;

export const remoteNotificationsAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

function getNotificationsModule() {
  if (!remoteNotificationsAvailable) return null;
  if (!notificationsModule) {
    notificationsModule = require("expo-notifications") as NotificationsModule;
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return notificationsModule;
}

const tokenDocumentId = (token: string) => token.replace(/[^a-zA-Z0-9_-]/g, "_");

export async function registerPushToken() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Atualizações importantes",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: "#2563EB",
    });
  }

  const userSnapshot = await firestore.collection("Usuario").doc(uid).get();
  if (userSnapshot.data()?.notificacoesAtivas === false) return null;

  const currentPermission = await Notifications.getPermissionsAsync();
  const finalPermission = currentPermission.status === "granted"
    ? currentPermission
    : await Notifications.requestPermissionsAsync();
  if (finalPermission.status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("expo-project-id-not-found");

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await firestore
    .collection("Usuario")
    .doc(uid)
    .collection("PushTokens")
    .doc(tokenDocumentId(token))
    .set({
      token,
      platform: Platform.OS,
      enabled: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

  return token;
}

export async function setPushNotificationsEnabled(enabled: boolean) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await firestore.collection("Usuario").doc(uid).set({ notificacoesAtivas: enabled }, { merge: true });
  if (enabled) {
    await registerPushToken();
    return;
  }
  const tokens = await firestore.collection("Usuario").doc(uid).collection("PushTokens").get();
  const batch = firestore.batch();
  tokens.docs.forEach((document) => batch.set(document.ref, {
    enabled: false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
}

export function subscribeToNotificationResponse(
  callback: (data: Record<string, unknown>) => void
) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return { remove: (): void => undefined };
  return Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification.request.content.data as Record<string, unknown>);
  });
}

export async function getLastNotificationResponseData() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification.request.content.data as Record<string, unknown> | undefined;
}
