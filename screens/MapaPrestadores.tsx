import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Callout, Marker, type Region } from "react-native-maps";
import * as Location from "expo-location";
import firebase from "firebase/compat/app";
import { ArrowLeft, Filter, LocateFixed, MapPin, Navigation, Search, UserRound, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { distanceInKm, type ProviderPresence } from "../services/locationPresenceService";
import { getProviderRating } from "../services/reviewService";

type MapProvider = ProviderPresence & {
  nome: string;
  profissao: string;
  avaliacao?: number;
  distancia?: number;
  precoMedio?: number;
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
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState("Todos");
  const [maxDistance, setMaxDistance] = useState(25);
  const [minimumRating, setMinimumRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    return firestore.collection("Usuario").doc(uid).collection("Bloqueados").onSnapshot((snapshot) => {
      setBlockedIds(new Set(snapshot.docs.map((document) => document.id)));
    }, (): void => undefined);
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
                if (!userSnapshot.exists || user?.tipo !== "prestador" || user?.contaAtiva === false || user?.assinaturaAtiva === false || user?.perfilVisivel === false) return null;
                const rating = await getProviderRating(presence.prestadorId, user);
                return {
                  ...presence,
                  nome: user?.nome || "Profissional",
                  profissao: user?.profissao || "Serviços gerais",
                  ...rating,
                  precoMedio: Number(user?.precoMedio || user?.valorMedio || 0),
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
    .filter((provider) => !blockedIds.has(provider.prestadorId))
    .filter((provider) => (provider.expiresAt?.toMillis?.() || 0) > clock)
    .map((provider) => ({
      ...provider,
      distancia: userPosition ? distanceInKm(userPosition, provider) : undefined,
    }))
    .sort((a, b) => (a.distancia ?? Number.MAX_VALUE) - (b.distancia ?? Number.MAX_VALUE));
  const jobs = ["Todos", ...Array.from(new Set(visibleProviders.map((provider) => provider.profissao))).sort()];
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredProviders = visibleProviders.filter((provider) =>
    (selectedJob === "Todos" || provider.profissao === selectedJob)
    && (provider.distancia === undefined || provider.distancia <= maxDistance)
    && Number(provider.avaliacao || 0) >= minimumRating
    && (!maxPrice || !provider.precoMedio || provider.precoMedio <= maxPrice)
    && (!normalizedSearch || `${provider.nome} ${provider.profissao}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch))
  );
  const clusters = Object.values(filteredProviders.reduce<Record<string, MapProvider[]>>((groups, provider) => { const key = `${Math.round(provider.latitude * 50)}_${Math.round(provider.longitude * 50)}`; (groups[key] ||= []).push(provider); return groups; }, {}));

  useEffect(() => {
    if (!mapRef.current) return;
    const coordinates = filteredProviders.map(({ latitude, longitude }) => ({ latitude, longitude }));
    if (userPosition) coordinates.push(userPosition);
    if (coordinates.length > 1) {
      mapRef.current.fitToCoordinates(coordinates, { animated: true, edgePadding: { top: 100, right: 55, bottom: 210, left: 55 } });
    } else if (coordinates.length === 1) {
      mapRef.current.animateToRegion({ ...coordinates[0], latitudeDelta: 0.06, longitudeDelta: 0.06 }, 500);
    }
  }, [filteredProviders.length, selectedJob, search, userPosition?.latitude, userPosition?.longitude]);

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
            {filteredProviders.length} {filteredProviders.length === 1 ? "disponível" : "disponíveis"} agora
          </Text>
        </View>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => setFiltersVisible(true)} accessibilityLabel="Abrir filtros">
          <Filter size={21} color="#FF8700" />
        </TouchableOpacity>
      </View>

      <Modal visible={filtersVisible} transparent animationType="slide" onRequestClose={() => setFiltersVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFiltersVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View><Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filtrar profissionais</Text><Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>{filteredProviders.length} resultado(s) no mapa</Text></View>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.actionBg }]} onPress={() => setFiltersVisible(false)}><X size={20} color={theme.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={[styles.filterLabel, { color: theme.textPrimary }]}>Buscar</Text>
              <View style={[styles.searchBox, { backgroundColor: theme.actionBg, borderColor: theme.border }]}><Search size={18} color={theme.textMuted} /><TextInput style={[styles.searchInput, { color: theme.textPrimary }]} value={search} onChangeText={setSearch} placeholder="Nome ou profissão" placeholderTextColor={theme.textMuted} /></View>
              <Text style={[styles.filterLabel, { color: theme.textPrimary }]}>Profissão</Text>
              <View style={styles.chipGrid}>{jobs.map((job) => <TouchableOpacity key={job} style={[styles.chip, { borderColor: selectedJob === job ? "#FF8700" : theme.border, backgroundColor: selectedJob === job ? "#FFF7ED" : theme.card }]} onPress={() => setSelectedJob(job)}><Text style={[styles.chipText, { color: selectedJob === job ? "#E86F00" : theme.textSecondary }]}>{job}</Text></TouchableOpacity>)}</View>
              <Text style={[styles.filterLabel, { color: theme.textPrimary }]}>Distância máxima</Text>
              <View style={styles.chipGrid}>{[5, 10, 25, 50].map((distance) => <TouchableOpacity key={distance} style={[styles.chip, { borderColor: maxDistance === distance ? "#16A34A" : theme.border }]} onPress={() => setMaxDistance(distance)}><Text style={[styles.chipText, { color: maxDistance === distance ? "#15803D" : theme.textSecondary }]}>{distance} km</Text></TouchableOpacity>)}</View>
              <Text style={[styles.filterLabel, { color: theme.textPrimary }]}>Avaliação mínima</Text>
              <View style={styles.chipGrid}>{[0, 4, 4.5].map((rating) => <TouchableOpacity key={rating} style={[styles.chip, { borderColor: minimumRating === rating ? "#F59E0B" : theme.border }]} onPress={() => setMinimumRating(rating)}><Text style={[styles.chipText, { color: minimumRating === rating ? "#B45309" : theme.textSecondary }]}>{rating ? `★ ${rating}+` : "Todas as notas"}</Text></TouchableOpacity>)}</View>
              <Text style={[styles.filterLabel, { color: theme.textPrimary }]}>Preço médio</Text>
              <View style={styles.chipGrid}>{[0, 100, 250, 500].map((price) => <TouchableOpacity key={`price-${price}`} style={[styles.chip, { borderColor: maxPrice === price ? "#7C3AED" : theme.border }]} onPress={() => setMaxPrice(price)}><Text style={[styles.chipText, { color: maxPrice === price ? "#6D28D9" : theme.textSecondary }]}>{price ? `Até R$ ${price}` : "Qualquer preço"}</Text></TouchableOpacity>)}</View>
            </ScrollView>
            <View style={[styles.modalActions, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={styles.clearButton} onPress={() => { setSearch(""); setSelectedJob("Todos"); setMaxDistance(25); setMinimumRating(0); setMaxPrice(0); }}><Text style={styles.clearText}>Limpar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setFiltersVisible(false)}><Text style={styles.applyText}>Ver resultados</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MapView ref={mapRef} style={styles.map} initialRegion={DEFAULT_REGION} showsCompass showsMyLocationButton={false}>
        {userPosition && (
          <Marker coordinate={userPosition} title="Sua localização" pinColor="#FF8700">
            <View style={styles.userMarker}><Navigation size={17} color="#FFFFFF" /></View>
          </Marker>
        )}
        {clusters.map((cluster) => cluster.length > 1 ? <Marker key={`cluster-${cluster.map((item) => item.id).join("-")}`} coordinate={{ latitude: cluster.reduce((sum, item) => sum + item.latitude, 0) / cluster.length, longitude: cluster.reduce((sum, item) => sum + item.longitude, 0) / cluster.length }} onPress={() => mapRef.current?.fitToCoordinates(cluster.map(({ latitude, longitude }) => ({ latitude, longitude })), { animated: true, edgePadding: { top: 100, right: 60, bottom: 180, left: 60 } })}><View style={styles.clusterMarker}><Text style={styles.clusterText}>{cluster.length}</Text></View></Marker> : (() => { const provider = cluster[0]; return (
          <Marker key={provider.id} coordinate={{ latitude: provider.latitude, longitude: provider.longitude }} onCalloutPress={() => openProvider(provider)}>
            <View style={styles.providerMarker}><UserRound size={20} color="#FFFFFF" /></View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutName} numberOfLines={1}>{provider.nome}</Text>
                <Text style={styles.calloutJob} numberOfLines={1}>{provider.profissao}</Text>
                {provider.distancia !== undefined && <Text style={styles.calloutDistance}>{provider.distancia.toFixed(1)} km de você</Text>}
                {provider.distancia !== undefined && <Text style={styles.calloutDistance}>Cerca de {Math.max(1, Math.round(provider.distancia / 0.5))} min</Text>}
                {!!provider.precoMedio && <Text style={styles.calloutJob}>Média R$ {provider.precoMedio.toFixed(2).replace(".", ",")}</Text>}
                <Text style={styles.calloutAction}>Ver perfil</Text>
              </View>
            </Callout>
          </Marker>); })())}
      </MapView>

      {userPosition && (
        <TouchableOpacity style={styles.locationButton} onPress={centerOnUser} accessibilityLabel="Centralizar na minha localização">
          <LocateFixed size={22} color="#FF8700" />
        </TouchableOpacity>
      )}

      {(loading || error || filteredProviders.length === 0) && (
        <View style={[styles.bottomCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {loading ? (
            <><ActivityIndicator color="#FF8700" /><Text style={[styles.stateText, { color: theme.textMuted }]}>Buscando profissionais próximos...</Text></>
          ) : error ? (
            <><MapPin size={24} color="#DC2626" /><Text style={[styles.stateText, { color: theme.textPrimary }]}>{error}</Text></>
          ) : (
            <><MapPin size={24} color="#FF8700" /><Text style={[styles.stateText, { color: theme.textPrimary }]}>Nenhum prestador está compartilhando a localização agora.</Text></>
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
  filters: { paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { height: 42, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  chips: { gap: 7, paddingTop: 9 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  map: { flex: 1 },
  providerMarker: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#16A34A", borderWidth: 3, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 5 },
  clusterMarker: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#7C3AED", borderWidth: 3, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 6 },
  clusterText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  userMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FF8700", borderWidth: 3, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  callout: { width: 190, backgroundColor: "#FFFFFF", padding: 14, borderRadius: 16, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 12, elevation: 6 },
  calloutName: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  calloutJob: { color: "#475569", fontSize: 12, marginTop: 3 },
  calloutDistance: { color: "#15803D", fontSize: 11, fontWeight: "700", marginTop: 6 },
  calloutAction: { color: "#FF8700", fontSize: 11, fontWeight: "800", marginTop: 8 },
  locationButton: { position: "absolute", right: 18, bottom: 28, width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 10 },
  bottomCard: { position: "absolute", left: 16, right: 80, bottom: 24, minHeight: 58, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 11, elevation: 5, shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 12 },
  stateText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "86%", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, elevation: 12 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 12 },
  modalHeader: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalContent: { paddingHorizontal: 20, paddingBottom: 20 },
  filterLabel: { fontSize: 14, fontWeight: "800", marginTop: 16, marginBottom: 9 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActions: { borderTopWidth: StyleSheet.hairlineWidth, padding: 16, flexDirection: "row", gap: 12 },
  clearButton: { minHeight: 48, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  clearText: { color: "#64748B", fontSize: 14, fontWeight: "800" },
  applyButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#FF8700", alignItems: "center", justifyContent: "center" },
  applyText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
