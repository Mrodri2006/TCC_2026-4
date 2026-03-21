
import { useState, useRef, useCallback } from 'react';
import { FlatList, Text, ImageBackground, View, ActivityIndicator, StyleSheet } from 'react-native';
import { auth, firestore } from '../firebase';
import { useFocusEffect } from '@react-navigation/native';
import { Serv } from '../model/Serv';

export default function ServStatus() {
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
        <ImageBackground resizeMode='stretch' style={styles.container}>
            <Text style={styles.title}>Histórico de Serviços</Text>

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
                            <Text style={styles.cardTitle}>
                                {item.estilo || item.tipo}
                            </Text>
                            <Text style={styles.infoText}>
                                📍 Local: {item.local}
                            </Text>
                            <Text style={styles.infoText}>
                                📅 Data: {item.data}
                            </Text>
                            <Text style={styles.infoText}>
                                Tipo: {item.tipo}
                            </Text>

                            <View style={styles.statusContainer}>
                                <Text style={[
                                    styles.statusText,
                                    {
                                        color: getStatusColor(item.status),
                                        backgroundColor: getStatusColor(item.status) + '20',
                                    }
                                ]}>
                                    {getStatusText(item.status)}
                                </Text>
                            </View>
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
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginBottom: 12,
        marginTop: 10,
    },
    loadingContainer: {
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 14,
        color: "#666",
        marginTop: 12,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#999",
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#f9f9f9",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#005362",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
        marginBottom: 6,
    },
    infoText: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
    },
    statusContainer: {
        marginTop: 10,
    },
    statusText: {
        fontWeight: "700",
        fontSize: 16,
        padding: 8,
        borderRadius: 5,
        textAlign: "center",
    },
});
