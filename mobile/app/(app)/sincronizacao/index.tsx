// mobile/app/(app)/sincronizacao/index.tsx
import { useFocusEffect } from 'expo-router';
import { CloudUpload, HardDrive, WifiOff } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SyncCard, { type SyncCardStatus } from './_components/SyncCard';
import { listCollections, type LocalCollection } from '@/lib/collectionStore';
import { formatBytes, getStorageUsage, type StorageUsage } from '@/lib/photoStorage';
import { getCachedResearches } from '@/lib/researchCache';
import { syncQueue } from '@/lib/syncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncState } from '@/hooks/useSyncQueue';

const EMPTY_USAGE: StorageUsage = { photosBytes: 0, audioBytes: 0, totalBytes: 0, freeBytes: null };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function Sincronizacao() {
    const [collections, setCollections] = useState<LocalCollection[]>([]);
    const [titles, setTitles] = useState<Map<number, string>>(new Map());
    const [usage, setUsage] = useState<StorageUsage>(EMPTY_USAGE);
    const [refreshing, setRefreshing] = useState(false);
    const isOnline = useNetworkStatus();
    const sync = useSyncState();

    // Tudo vem do aparelho: a tela funciona sem internet
    const load = useCallback(async () => {
        const [stored, researches] = await Promise.all([listCollections(), getCachedResearches()]);
        setCollections(stored);
        setTitles(new Map(researches.map((research) => [research.id, research.title])));
        setUsage(getStorageUsage(stored));
    }, []);

    // Recarrega ao abrir a aba e a cada mudança do envio (coleta confirmada sai, falha ganha motivo),
    // para a lista acompanhar o envio em tempo real. Ao sair da aba, deixa de acompanhar.
    useFocusEffect(
        useCallback(() => {
            const reload = () => void load().catch((error) => console.log('Falha ao ler as coletas do aparelho:', error));
            reload();
            return syncQueue.subscribe(reload);
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

    const finished = collections
        .filter((c) => c.status === 'FINISHED')
        // a mais antiga primeiro: é a ordem em que o envio as leva
        .sort((a, b) => (a.finishedAt ?? a.startedAt).localeCompare(b.finishedAt ?? b.startedAt));
    const drafts = collections.length - finished.length;

    const subtitle =
        collections.length === 0
            ? 'Nenhuma coleta pendente'
            : `${plural(finished.length, 'coleta aguardando envio', 'coletas aguardando envio')}` +
              (drafts > 0 ? ` · ${plural(drafts, 'rascunho', 'rascunhos')}` : '');

    // ---------- Envio ----------

    const canSend = isOnline && !sync.running && finished.length > 0;
    const sendNow = () => void syncQueue.run({ trigger: 'manual' });

    const buttonLabel = sync.running
        ? `Enviando ${Math.min(sync.done + 1, sync.total)} de ${sync.total}…`
        : finished.length > 0
          ? `Enviar agora (${finished.length})`
          : 'Enviar agora';

    const lastRun = sync.lastRun;
    let resultNote: { text: string; warning: boolean } | null = null;
    if (!sync.running && lastRun) {
        if (lastRun.stopReason) {
            resultNote = { text: `Envio interrompido: ${lastRun.stopReason}`, warning: true };
        } else if (lastRun.confirmed > 0 || lastRun.failed > 0) {
            const parts: string[] = [];
            if (lastRun.confirmed > 0) parts.push(plural(lastRun.confirmed, 'coleta enviada', 'coletas enviadas'));
            if (lastRun.failed > 0) parts.push(plural(lastRun.failed, 'com falha', 'com falha'));
            resultNote = { text: parts.join(' · '), warning: lastRun.failed > 0 };
        }
    }

    const statusOf = (item: LocalCollection): SyncCardStatus => {
        const inRun = sync.items[item.clientId];
        if (inRun === 'sending') return 'enviando';
        if (inRun === 'waiting') return 'aguardando';
        return item.sendState?.lastFailure ? 'falha' : 'pendente';
    };

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

                    <TouchableOpacity
                        style={[styles.sendButton, !canSend && !sync.running && styles.sendButtonDisabled]}
                        onPress={sendNow}
                        disabled={!canSend}
                        accessibilityRole="button"
                        accessibilityLabel="Enviar agora as coletas finalizadas"
                        accessibilityState={{ disabled: !canSend, busy: sync.running }}
                    >
                        {sync.running ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <CloudUpload size={20} color="#fff" />
                        )}
                        <Text style={styles.sendButtonText}>{buttonLabel}</Text>
                    </TouchableOpacity>

                    {sync.running && sync.total > 0 ? (
                        <View
                            style={styles.progressTrack}
                            accessibilityRole="progressbar"
                            accessibilityValue={{ min: 0, max: sync.total, now: sync.done }}
                        >
                            <View style={[styles.progressBar, { width: `${(sync.done / sync.total) * 100}%` }]} />
                        </View>
                    ) : null}

                    {!isOnline && finished.length > 0 ? (
                        <View style={styles.note}>
                            <WifiOff size={16} color="#92400e" />
                            <Text style={styles.noteTextWarning}>
                                Sem conexão. O envio começa sozinho quando o sinal voltar.
                            </Text>
                        </View>
                    ) : resultNote ? (
                        <Text style={[styles.resultNote, resultNote.warning && styles.resultNoteWarning]}>
                            {resultNote.text}
                        </Text>
                    ) : null}

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
                    status={statusOf(item)}
                    motivo={item.sendState?.lastFailure?.reason}
                    tentativas={item.sendState?.attempts}
                    onRetry={() => void syncQueue.run({ trigger: 'manual', only: item.clientId })}
                    retryDisabled={!canSend}
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
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: '#447762',
        paddingHorizontal: 16,
    },
    sendButtonDisabled: { backgroundColor: '#a1b8ae' },
    sendButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#e4e4e7',
        overflow: 'hidden',
        marginTop: 10,
    },
    progressBar: { height: 6, borderRadius: 3, backgroundColor: '#447762' },
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fef3c7',
    },
    noteTextWarning: { flex: 1, fontSize: 13, color: '#92400e' },
    resultNote: { fontSize: 13, color: '#52525b', marginTop: 10 },
    resultNoteWarning: { color: '#92400e' },
    storageCard: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e4e4e7',
        borderRadius: 12,
        padding: 16,
        gap: 4,
        marginTop: 16,
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
