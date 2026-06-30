import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Callout, Marker, type Region } from "react-native-maps";
import * as Location from "expo-location";
import firebase from "firebase/compat/app";
import { ArrowLeft, LocateFixed, MapPin, Navigation, UserRound } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { distanceInKm, type ProviderPresence } from "../services/locationPresenceService";

type MapProvider = ProviderPresence & {
  nome: string;
  profissao: string;
  avaliacao?: number;
  distancia?: number;
};

const DEFAULT_REGION: Region = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

export default function MapaPrestadores() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let generation = 0;

    const loadUserPosition = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        setUserPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      } catch {
        // O mapa continua funcional sem a posição do contratante.
      }
    };

    loadUserPosition();
    const minimumExpiration = firebase.firestore.Timestamp.fromMillis(Date.now() + 60_000);
    const unsubscribe = firestore
      .collection("LocalizacoesPrestadores")
      .where("expiresAt", ">", minimumExpiration)
      .onSnapshot(
        async (snapshot) => {
          const currentGeneration = ++generation;
          try {
            const items = await Promise.all(
              snapshot.docs.map(async (document) => {
                const presence = { id: document.id, ...document.data() } as ProviderPresence;
                const userSnapshot = await firestore.collection("Usuario").doc(presence.prestadorId).get();
                const user = userSnapshot.data();
                if (!userSnapshot.exists || user?.tipo !== "prestador" || user?.contaAtiva === false || user?.assinaturaAtiva === false) return null;
                return {
                  ...presence,
                  nome: user?.nome || "Profissional",
                  profissao: user?.profissao || "Serviços gerais",
                  avaliacao: Number(user?.avaliacao || 0),
                } as MapProvider;
              })
            );
            if (!active || currentGeneration !== generation) return;
            setProviders(items.filter((item): item is MapProvider => item !== null));
            setError("");
          } catch {
            if (active) setError("Não foi possível carregar os profissionais agora.");
          } finally {
            if (active) setLoading(false);
          }
        },
        () => {
          if (!active) return;
          setError("Não foi possível acessar o mapa de profissionais.");
          setLoading(false);
        }
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const visibleProviders = providers
    .filter((provider) => (provider.expiresAt?.toMillis?.() || 0) > clock)
    .map((provider) => ({
      ...provider,
      distancia: userPosition ? distanceInKm(userPosition, provider) : undefined,
    }))
    .sort((a, b) => (a.distancia ?? Number.MAX_VALUE) - (b.distancia ?? Number.MAX_VALUE));

  useEffect(() => {
    if (!mapRef.current) return;
    const coordinates = visibleProviders.map(({ latitude, longitude }) => ({ latitude, longitude }));
    if (userPosition) coordinates.push(userPosition);
    if (coordinates.length > 1) {
      mapRef.current.fitToCoordinates(coordinates, { animated: true, edgePadding: { top: 100, right: 55, bottom: 210, left: 55 } });
    } else if (coordinates.length === 1) {
      mapRef.current.animateToRegion({ ...coordinates[0], latitudeDelta: 0.06, longitudeDelta: 0.06 }, 500);
    }
  }, [providers.length, userPosition?.latitude, userPosition?.longitude]);

  const openProvider = (provider: MapProvider) => {
    navigation.navigate("DetalheProfissional", {
      profissional: {
        id: provider.prestadorId,
        nome: provider.nome,
        profissao: provider.profissao,
        tipo: provider.profissao,
        avaliacao: provider.avaliacao,
        distancia: provider.distancia ? `${provider.distancia.toFixed(1)} km` : "Próximo de você",
      },
    });
  };

  const centerOnUser = () => {
    if (userPosition) {
      mapRef.current?.animateToRegion({ ...userPosition, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 450);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => navigation.goBack()} accessibilityLabel="Voltar">
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Profissionais no mapa</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {visibleProviders.length} {visibleProviders.length === 1 ? "disponível" : "disponíveis"} agora
          </Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <MapView ref={mapRef} style={styles.map} initialRegion={DEFAULT_REGION} showsCompass showsMyLocationButton={false}>
        {userPosition && (
          <Marker coordinate={userPosition} title="Sua localização" pinColor="#2563EB">
            <View style={styles.userMarker}><Navigation size={17} color="#FFFFFF" /></View>
          </Marker>
        )}
        {visibleProviders.map((provider) => (
          <Marker key={provider.id} coordinate={{ latitude: provider.latitude, longitude: provider.longitude }} onCalloutPress={() => openProvider(provider)}>
            <View style={styles.providerMarker}><UserRound size={20} color="#FFFFFF" /></View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutName} numberOfLines={1}>{provider.nome}</Text>
                <Text style={styles.calloutJob} numberOfLines={1}>{provider.profissao}</Text>
                {provider.distancia !== undefined && <Text style={styles.calloutDistance}>{provider.distancia.toFixed(1)} km de você</Text>}
                <Text style={styles.calloutAction}>Ver perfil</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {userPosition && (
        <TouchableOpacity style={styles.locationButton} onPress={centerOnUser} accessibilityLabel="Centralizar na minha localização">
          <LocateFixed size={22} color="#2563EB" />
        </TouchableOpacity>
      )}

      {(loading || error || visibleProviders.length === 0) && (
        <View style={[styles.bottomCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {loading ? (
            <><ActivityIndicator color="#2563EB" /><Text style={[styles.stateText, { color: theme.textMuted }]}>Buscando profissionais próximos...</Text></>
          ) : error ? (
            <><MapPin size={24} color="#DC2626" /><Text style={[styles.stateText, { color: theme.textPrimary }]}>{error}</Text></>
          ) : (
            <><MapPin size={24} color="#2563EB" /><Text style={[styles.stateText, { color: theme.textPrimary }]}>Nenhum prestador está compartilhando a localização agora.</Text></>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 2 },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center" },
  headerPlaceholder: { width: 44 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  map: { flex: 1 },
  providerMarker: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#16A34A", borderWidth: 3, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 5 },
  userMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2563EB", borderWidth: 3, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  callout: { width: 190, backgroundColor: "#FFFFFF", padding: 14, borderRadius: 16, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 12, elevation: 6 },
  calloutName: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  calloutJob: { color: "#475569", fontSize: 12, marginTop: 3 },
  calloutDistance: { color: "#15803D", fontSize: 11, fontWeight: "700", marginTop: 6 },
  calloutAction: { color: "#2563EB", fontSize: 11, fontWeight: "800", marginTop: 8 },
  locationButton: { position: "absolute", right: 18, bottom: 28, width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 10 },
  bottomCard: { position: "absolute", left: 16, right: 80, bottom: 24, minHeight: 58, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 11, elevation: 5, shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 12 },
  stateText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
});
