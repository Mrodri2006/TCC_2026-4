import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "pt-BR" | "en" | "es";

const messages = {
  "pt-BR": {
    settings: "Configurações", preferences: "Preferências", theme: "Tema", automatic: "Automático",
    light: "Claro", dark: "Escuro", language: "Idioma", notifications: "Notificações",
    darkMode: "Modo escuro", privacy: "Privacidade", visibleProfile: "Perfil visível", account: "Conta",
    security: "Segurança da conta", editProfile: "Editar perfil", logout: "Sair", deleteAccount: "Deletar Conta",
    payment: "Pagamento", exportBackup: "Exportar backup dos meus dados",
  },
  en: {
    settings: "Settings", preferences: "Preferences", theme: "Theme", automatic: "Automatic",
    light: "Light", dark: "Dark", language: "Language", notifications: "Notifications",
    darkMode: "Dark mode", privacy: "Privacy", visibleProfile: "Visible profile", account: "Account",
    security: "Account security", editProfile: "Edit profile", logout: "Log out", deleteAccount: "Delete Account",
    payment: "Payment", exportBackup: "Export my data backup",
  },
  es: {
    settings: "Configuración", preferences: "Preferencias", theme: "Tema", automatic: "Automático",
    light: "Claro", dark: "Oscuro", language: "Idioma", notifications: "Notificaciones",
    darkMode: "Modo oscuro", privacy: "Privacidad", visibleProfile: "Perfil visible", account: "Cuenta",
    security: "Seguridad de la cuenta", editProfile: "Editar perfil", logout: "Salir", deleteAccount: "Eliminar cuenta",
    payment: "Pago", exportBackup: "Exportar copia de mis datos",
  },
} as const;

type MessageKey = keyof typeof messages["pt-BR"];
type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  languageLabel: string;
  t: (key: MessageKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const labels: Record<AppLanguage, string> = { "pt-BR": "Português (BR)", en: "English", es: "Español" };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("pt-BR");

  useEffect(() => {
    AsyncStorage.getItem("app_language").then((value) => {
      if (value === "pt-BR" || value === "en" || value === "es") setLanguageState(value);
    }).catch((): void => {});
  }, []);

  const setLanguage = (value: AppLanguage) => {
    setLanguageState(value);
    AsyncStorage.setItem("app_language", value).catch((): void => {});
  };
  const value = useMemo(() => ({
    language,
    setLanguage,
    languageLabel: labels[language],
    t: (key: MessageKey) => messages[language][key],
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
