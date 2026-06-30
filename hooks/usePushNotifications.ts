import { useEffect } from "react";
import { auth } from "../firebase";
import { navigateFromNotification } from "../navigation/navigationRef";
import { getLastNotificationResponseData, registerPushToken, subscribeToNotificationResponse } from "../services/notificationService";

export function usePushNotifications() {
  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      registerPushToken().catch((error) => {
        if (__DEV__) console.warn("Não foi possível registrar notificações push", error);
      });
    });

    const responseSubscription = subscribeToNotificationResponse(navigateFromNotification);
    getLastNotificationResponseData().then((data) => {
      if (data) navigateFromNotification(data);
    }).catch((): void => undefined);

    return () => {
      authUnsubscribe();
      responseSubscription.remove();
    };
  }, []);
}
