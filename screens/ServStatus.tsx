
import { useState, useRef, useCallback } from 'react';
import { FlatList, Text, ImageBackground, View, ActivityIndicator, StyleSheet } from 'react-native';
import { auth, firestore } from '../firebase';
import { useFocusEffect } from '@react-navigation/native';
import { Serv } from '../model/Serv';
import { useTheme } from '../theme/ThemeContext';

export default function ServStatus() {
    const { theme } = useTheme();
    const [servs, setServs] = useState<Serv[]>([]);
    const [loading, setLoading] = useState(true);
    const unsubscribeRef = useRef<any>(null);

    useFocusEffect(
        useCallback(() => {
            listar();
            return () => {
                if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                }
            };
        }, [])
    );

    const listar = () => {
        const usuarioId = auth.currentUser?.uid;
        if (!usuarioId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        unsubscribeRef.current = firestore
            .collection("ServicosClientes")
            .doc(usuarioId)
            .collection("ServicoStatus")
            .onSnapshot((snapshot) => {
                const servsDoCliente: Serv[] = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: doc.id,
                        status: data.status || 'a fazer',
                    } as Serv;
                });
                setServs(servsDoCliente);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar serviços:", error);
                setLoading(false);
            });
    };

    const getStatusColor = (status: string) => {
        if (status === 'realizado' || status === 'finalizado') return '#4CAF50';
        if (status === 'problema') return '#FFC107';
        if (status === 'a fazer' || status === 'aceito') return '#FF6B6B';
        return '#999';
    };

    const getStatusText = (status: string) => {
        if (status === 'realizado' || status === 'finalizado') return '✓ Finalizado';
        if (status === 'problema') return '⚠ Problema';
        if (status === 'a fazer' || status === 'aceito') return '⌛ Em Andamento';
        return status;
    };

    const servsFinalizados = servs
        .filter((serv) => serv.status === 'realizado' || serv.status === 'finalizado')
        .sort((a: any, b: any) => {
            const dateA = a.dataFinalizado?.toDate?.() || a.dataAtualizacao?.toDate?.() || a.dataSolicitacao?.toDate?.() || new Date(0);
            const dateB = b.dataFinalizado?.toDate?.() || b.dataAtualizacao?.toDate?.() || b.dataSolicitacao?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

    return (
        <ImageBackground resizeMode='stretch' style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.headerCard}>
                <Text style={styles.title}>Histórico de Serviços</Text>
                <Text style={styles.subtitle}>Acompanhe os serviços finalizados</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#005362" />
                    <Text style={styles.loadingText}>Carregando serviços...</Text>
                </View>
            ) : servsFinalizados.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum serviço finalizado</Text>
                </View>
            ) : (
                <FlatList
                    data={servsFinalizados}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardTopRow}>
                                <Text style={styles.cardTitle}>
                                    {item.estilo || item.tipo}
                                </Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(item.status) + '22' },
                                    ]}
                                >
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                        {getStatusText(item.status)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.infoText}>
                                Local: {item.local || "N?o informado"}
                            </Text>
                            <Text style={styles.infoText}>
                                Data: {item.data || "N?o informada"}
                            </Text>
                            <Text style={styles.infoText}>
                                Tipo: {item.tipo || "Servi?o"}
                            </Text>
                        </View>
                    )}
                    scrollEnabled={true}
                />
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
    },
    headerCard: {
        backgroundColor: "#E8F4FF",
        borderRadius: 24,
        padding: 18,
        marginBottom: 20,
        shadowColor: "#0F2937",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0F2937",
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },
    loadingContainer: {
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 12,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 15,
        color: "#64748B",
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
        shadowColor: "#0F2937",
        shadowOpacity: 0.05,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: "#2563EB",
    },
    cardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        gap: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F2937",
        flex: 1,
    },
    infoText: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 4,
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        fontWeight: "700",
        fontSize: 12,
    },
});
