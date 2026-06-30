import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error("Falha inesperada no aplicativo", error, info.componentStack);
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <AlertTriangle size={30} color="#B45309" />
          </View>
          <Text style={styles.title}>Algo não saiu como esperado</Text>
          <Text style={styles.body}>
            Seus dados continuam seguros. Tente recarregar esta área do aplicativo.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.retry} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FB", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, padding: 24, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { color: "#0F172A", fontSize: 20, fontWeight: "800", textAlign: "center" },
  body: { color: "#64748B", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8, marginBottom: 22 },
  button: { width: "100%", minHeight: 48, borderRadius: 15, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
