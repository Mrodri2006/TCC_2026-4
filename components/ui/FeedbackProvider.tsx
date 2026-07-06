import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
type Tone = "success" | "error" | "info";
type Feedback = { show: (message: string, tone?: Tone) => void };
const Context = createContext<Feedback | null>(null);
export function FeedbackProvider({ children }: { children: ReactNode }) { const [notice, setNotice] = useState<{ message: string; tone: Tone } | null>(null); const show = useCallback((message: string, tone: Tone = "info") => { setNotice({ message, tone }); setTimeout(() => setNotice(null), 2800); }, []); const value = useMemo(() => ({ show }), [show]); return <Context.Provider value={value}><View style={styles.root}>{children}{notice && <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(150)} style={[styles.toast, notice.tone === "success" ? styles.success : notice.tone === "error" ? styles.error : styles.info]} accessibilityLiveRegion="polite"><Text style={styles.text}>{notice.message}</Text></Animated.View>}</View></Context.Provider>; }
export function useFeedback() { const value = useContext(Context); if (!value) throw new Error("useFeedback must be used within FeedbackProvider"); return value; }
const styles = StyleSheet.create({ root: { flex: 1 }, toast: { position: "absolute", left: 18, right: 18, bottom: 26, minHeight: 50, borderRadius: 15, paddingHorizontal: 16, justifyContent: "center", elevation: 10 }, success: { backgroundColor: "#15803D" }, error: { backgroundColor: "#B91C1C" }, info: { backgroundColor: "#E86F00" }, text: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", textAlign: "center" } });
