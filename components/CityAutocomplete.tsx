import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MapPin } from "lucide-react-native";

type City = { id: number; nome: string; uf: string };
type Props = { value: string; onChange: (value: string) => void };

let cityCache: City[] | null = null;
let cityRequest: Promise<City[]> | null = null;

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const getUf = (item: any) =>
  item?.microrregiao?.mesorregiao?.UF?.sigla ||
  item?.["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ||
  "";

async function loadCities() {
  if (cityCache) return cityCache;
  if (!cityRequest) {
    cityRequest = fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome")
      .then(async (response) => {
        if (!response.ok) throw new Error("Falha ao consultar municípios");
        const data = await response.json();
        cityCache = data.map((item: any) => ({ id: item.id, nome: item.nome, uf: getUf(item) }));
        return cityCache!;
      })
      .catch((error) => {
        cityRequest = null;
        throw error;
      });
  }
  return cityRequest;
}

export function CityAutocomplete({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [cities, setCities] = useState<City[]>(cityCache || []);
  const [loading, setLoading] = useState(!cityCache);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let active = true;
    loadCities()
      .then((items) => active && setCities(items))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const suggestions = useMemo(() => {
    const term = normalize(query);
    if (!focused || term.length < 2 || query === value) return [];
    const startsWith: City[] = [];
    const contains: City[] = [];
    for (const city of cities) {
      const name = normalize(city.nome);
      if (name.startsWith(term)) startsWith.push(city);
      else if (name.includes(term)) contains.push(city);
      if (startsWith.length >= 6) break;
    }
    return [...startsWith, ...contains].slice(0, 6);
  }, [cities, focused, query, value]);

  const selectCity = (city: City) => {
    const selected = `${city.nome} - ${city.uf}`;
    setQuery(selected);
    setFocused(false);
    onChange(selected);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <MapPin size={18} color="#FF9300" />
        <TextInput
          placeholder="Digite o nome da cidade"
          placeholderTextColor="#6B7280"
          value={query}
          onFocus={() => setFocused(true)}
          onChangeText={(text) => {
            setQuery(text);
            setFocused(true);
            onChange("");
          }}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />
        {loading && <ActivityIndicator size="small" color="#FF9300" />}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((city) => (
            <TouchableOpacity key={city.id} style={styles.option} onPress={() => selectCity(city)}>
              <MapPin size={15} color="#FF9300" />
              <Text style={styles.optionText}>{city.nome} - {city.uf}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {focused && query.length >= 2 && !loading && suggestions.length === 0 && query !== value && (
        <Text style={styles.helper}>{error ? "Sem conexão para consultar as cidades." : "Nenhuma cidade encontrada."}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", zIndex: 20 },
  inputWrap: { minHeight: 52, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, color: "#111827", fontSize: 15, paddingHorizontal: 10, paddingVertical: 13 },
  suggestions: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, backgroundColor: "#FFFFFF", marginTop: 4, overflow: "hidden", elevation: 6, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  option: { minHeight: 45, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  optionText: { color: "#1F2937", fontSize: 15, fontWeight: "600" },
  helper: { color: "#B45309", fontSize: 12, marginTop: 5, marginLeft: 4 },
});
