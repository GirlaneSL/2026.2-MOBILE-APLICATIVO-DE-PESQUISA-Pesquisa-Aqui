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
import ScreenHeader from '@/components/ScreenHeader';
import Chip from '@/components/Chip';
import { Brand, TAB_BAR_CLEARANCE } from '@/constants/brand';
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
              (drafts > 0 ? `, ${plural(drafts, 'rascunho', 'rascunhos')}` : '');

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
            resultNote = { text: parts.join(', '), warning: lastRun.failed > 0 };
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Brand.green} />}
            ListHeaderComponent={
                <View>
                    <ScreenHeader
                        title="Envio de coletas"
                        subtitle={subtitle}
                        right={<Chip label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'dark' : 'clay'} />}
                        seed={5.3}
                    />
                    <View style={styles.headerBody}>
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
                            <WifiOff size={16} color={Brand.warn} />
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
                            <HardDrive size={18} color={Brand.greenDeep} strokeWidth={1.8} />
                            <Text style={styles.storageLabel}>Espaço ocupado pelas coletas pendentes</Text>
                        </View>
                        <Text style={styles.storageTotal}>{formatBytes(usage.totalBytes)}</Text>
                        <Text style={styles.storageDetail}>
                            Fotos {formatBytes(usage.photosBytes)}, áudio {formatBytes(usage.audioBytes)}
                            {usage.freeBytes !== null ? `. Livre no aparelho: ${formatBytes(usage.freeBytes)}` : ''}
                        </Text>
                        {drafts > 0 ? <Text style={styles.storageNote}>Inclui os rascunhos em andamento.</Text> : null}
                    </View>
                    </View>
                </View>
            }
            renderItem={({ item }) => (
                <View style={styles.row}>
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
                </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}><CloudUpload size={26} color={Brand.greenDeep} strokeWidth={1.7} /></View>
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
    container: { flex: 1, backgroundColor: Brand.paper },
    content: { paddingBottom: TAB_BAR_CLEARANCE },
    headerBody: { padding: 18, paddingBottom: 6 },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 50,
        borderRadius: 999,
        backgroundColor: Brand.ink,
        paddingHorizontal: 20,
    },
    sendButtonDisabled: { backgroundColor: '#9aa8a0' },
    sendButtonText: { fontSize: 15, fontWeight: '500', color: '#fff' },
    progressTrack: {
        height: 6,
        borderRadius: 99,
        backgroundColor: Brand.trackLight,
        overflow: 'hidden',
        marginTop: 12,
    },
    progressBar: { height: 6, borderRadius: 99, backgroundColor: Brand.green },
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        padding: 14,
        borderRadius: 18,
        backgroundColor: Brand.warnLight,
    },
    noteTextWarning: { flex: 1, fontSize: 13, lineHeight: 18, color: Brand.warn },
    resultNote: { fontSize: 13, color: Brand.muted, marginTop: 12 },
    resultNoteWarning: { color: Brand.clayInk },
    storageCard: {
        backgroundColor: Brand.card,
        borderWidth: 1,
        borderColor: Brand.line,
        borderRadius: 24,
        padding: 18,
        gap: 4,
        marginTop: 16,
        marginBottom: 12,
    },
    storageTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    storageLabel: { flex: 1, fontSize: 13.5, color: Brand.muted },
    storageTotal: { fontSize: 34, fontWeight: '300', letterSpacing: -1.5, color: Brand.ink, marginTop: 6 },
    storageDetail: { fontSize: 13, color: Brand.muted },
    storageNote: { fontSize: 12, color: Brand.muted, marginTop: 2 },
    row: { paddingHorizontal: 18 },
    separator: { height: 12 },
    emptyState: { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: Brand.chipLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: { fontSize: 14, color: Brand.muted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
