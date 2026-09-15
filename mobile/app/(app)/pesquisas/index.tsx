import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import PesquisaCard from './_components/PesquisaCard';
import { getCachedResearches, syncResearches, type Research } from '@/lib/researchCache';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const STATUS_LABELS: Record<string, string> = {
    PUBLISHED: 'Publicada',
    IN_FIELD: 'Em Campo',
    CLOSED: 'Encerrada',
};

export default function Pesquisas() {
    const [pesquisas, setPesquisas] = useState<Research[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const isOnline = useNetworkStatus();

    const loadFromCache = useCallback(async () => {
        const cached = await getCachedResearches();
        // Garante que nenhum rascunho seja renderizado
        const visibleResearches = cached.filter((item) => item.status !== 'DRAFT');
        setPesquisas(visibleResearches);
    }, []);

    useFocusEffect(
        useCallback(() => {
            const run = async () => {
                if (isOnline) {
                    try {
                        await syncResearches();
                    } catch (error) {
                        console.log('Falha ao sincronizar pesquisas:', error);
                    }
                }
                await loadFromCache();
            };
            run();
        }, [isOnline, loadFromCache])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        if (isOnline) {
            try {
                await syncResearches();
            } catch (error) {
                console.log('Falha ao sincronizar pesquisas no refresh:', error);
            }
        }
        await loadFromCache();
        setRefreshing(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Minhas Pesquisas</Text>
                <Text style={styles.headerSubtitle}>
                    {isOnline ? 'Selecione um questionário para iniciar' : 'Offline — mostrando dados salvos'}
                </Text>
            </View>

            {pesquisas.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                        {isOnline
                            ? 'Nenhuma pesquisa disponível no momento.'
                            : 'Nenhuma pesquisa salva neste aparelho ainda.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={pesquisas}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <PesquisaCard
                            titulo={item.title}
                            status={STATUS_LABELS[item.status] ?? item.status}
                            targetAudience={item.targetAudience}
                        />
                    )}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fafafa' },
    header: { padding: 20, paddingBottom: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
    headerSubtitle: { fontSize: 16, color: '#71717a', marginTop: 4 },
    listContainer: { padding: 20, gap: 16 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 14, color: '#71717a', textAlign: 'center' },
});