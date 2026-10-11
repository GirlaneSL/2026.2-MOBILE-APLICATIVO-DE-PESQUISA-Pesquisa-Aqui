// mobile/app/(app)/sincronizacao/index.tsx
import { useFocusEffect } from 'expo-router';
import { CloudUpload, HardDrive } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import SyncCard from './_components/SyncCard';
import { listCollections, type LocalCollection } from '@/lib/collectionStore';
import { formatBytes, getStorageUsage, type StorageUsage } from '@/lib/photoStorage';
import { getCachedResearches } from '@/lib/researchCache';

const EMPTY_USAGE: StorageUsage = { photosBytes: 0, audioBytes: 0, totalBytes: 0, freeBytes: null };

export default function Sincronizacao() {
    const [collections, setCollections] = useState<LocalCollection[]>([]);
    const [titles, setTitles] = useState<Map<number, string>>(new Map());
    const [usage, setUsage] = useState<StorageUsage>(EMPTY_USAGE);
    const [refreshing, setRefreshing] = useState(false);

    // Tudo vem do aparelho: a tela funciona sem internet
    const load = useCallback(async () => {
        const [stored, researches] = await Promise.all([listCollections(), getCachedResearches()]);
        setCollections(stored);
        setTitles(new Map(researches.map((research) => [research.id, research.title])));
        setUsage(getStorageUsage(stored));
    }, []);

    useFocusEffect(
        useCallback(() => {
            void load().catch((error) => console.log('Falha ao ler as coletas do aparelho:', error));
        }, [load]),
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await load();
        } catch (error) {
            console.log('Falha ao atualizar a fila:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const finished = collections.filter((c) => c.status === 'FINISHED');
    const drafts = collections.length - finished.length;

    const subtitle =
        collections.length === 0
            ? 'Nenhuma coleta pendente'
            : `${finished.length} ${finished.length === 1 ? 'coleta finalizada' : 'coletas finalizadas'}` +
              (drafts > 0 ? ` · ${drafts} ${drafts === 1 ? 'rascunho' : 'rascunhos'}` : '');

    return (
        <FlatList
            style={styles.container}
            data={finished}
            keyExtractor={(item) => item.clientId}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListHeaderComponent={
                <View>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Fila de Sincronização</Text>
                        <Text style={styles.headerSubtitle}>{subtitle}</Text>
                    </View>

                    <View style={styles.storageCard} accessibilityRole="summary">
                        <View style={styles.storageTop}>
                            <HardDrive size={20} color="#447762" />
                            <Text style={styles.storageLabel}>Espaço ocupado pelas coletas pendentes</Text>
                        </View>
                        <Text style={styles.storageTotal}>{formatBytes(usage.totalBytes)}</Text>
                        <Text style={styles.storageDetail}>
                            Fotos {formatBytes(usage.photosBytes)} · Áudio {formatBytes(usage.audioBytes)}
                            {usage.freeBytes !== null ? ` · Livre no aparelho ${formatBytes(usage.freeBytes)}` : ''}
                        </Text>
                        {drafts > 0 ? <Text style={styles.storageNote}>Inclui os rascunhos em andamento.</Text> : null}
                    </View>
                </View>
            }
            renderItem={({ item }) => (
                <SyncCard
                    identificador={`Coleta ${item.clientId.slice(0, 8)}`}
                    pesquisa={titles.get(item.researchId) ?? `Pesquisa ${item.researchId}`}
                    data={new Date(item.finishedAt ?? item.startedAt).toLocaleString('pt-BR')}
                    status="pendente"
                />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <CloudUpload size={48} color="#d4d4d8" />
                    <Text style={styles.emptyText}>
                        {drafts > 0
                            ? 'As coletas finalizadas aparecem aqui até serem enviadas.'
                            : 'Nenhuma coleta finalizada aguardando envio.'}
                    </Text>
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fafafa' },
    content: { paddingHorizontal: 20, paddingBottom: 24 },
    header: { paddingTop: 20, paddingBottom: 12 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
    headerSubtitle: { fontSize: 15, color: '#71717a', marginTop: 4 },
    storageCard: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e4e4e7',
        borderRadius: 12,
        padding: 16,
        gap: 4,
        marginBottom: 16,
    },
    storageTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    storageLabel: { flex: 1, fontSize: 14, color: '#52525b' },
    storageTotal: { fontSize: 28, fontWeight: 'bold', color: '#18181b' },
    storageDetail: { fontSize: 13, color: '#71717a' },
    storageNote: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
    separator: { height: 12 },
    emptyState: { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
    emptyText: { fontSize: 14, color: '#71717a', textAlign: 'center' },
});
