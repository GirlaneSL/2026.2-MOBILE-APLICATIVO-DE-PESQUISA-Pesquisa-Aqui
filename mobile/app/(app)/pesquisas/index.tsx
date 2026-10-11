import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import PesquisaCard from './_components/PesquisaCard';
import DraftPickerModal from './_components/DraftPickerModal';
import { getCachedResearches, syncResearches, downloadResearchPackage, type Research } from '@/lib/researchCache';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { listCollections, type LocalCollection } from '@/lib/collectionStore';

export default function Pesquisas() {
    const [pesquisas, setPesquisas] = useState<Research[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [collections, setCollections] = useState<LocalCollection[]>([]);
    const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
    // Pesquisa cujos rascunhos o pesquisador está escolhendo (null = lista fechada)
    const [pickingResearch, setPickingResearch] = useState<Research | null>(null);
    const isOnline = useNetworkStatus();

    const loadFromCache = useCallback(async () => {
        const cached = await getCachedResearches();
        setPesquisas(cached);
        // Coletas e rascunhos ficam no aparelho: a contagem funciona sem internet
        setCollections(await listCollections());
    }, []);

    useFocusEffect(
        useCallback(() => {
            const run = async () => {
                if (isOnline) {
                    try { await syncResearches(); } 
                    catch (error) { console.log('Falha ao sincronizar pesquisas:', error); }
                }
                await loadFromCache();
            };
            run();
        }, [isOnline, loadFromCache])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        if (isOnline) {
            try { await syncResearches(); } 
            catch (error) { console.log('Falha ao sincronizar no refresh:', error); }
        }
        await loadFromCache();
        setRefreshing(false);
    };

    const handleDownload = async (id: number, title: string) => {
        if (!isOnline) {
            Alert.alert("Sem conexão", "Conecte-se à internet para baixar esta pesquisa.");
            return;
        }

        setDownloadingIds(prev => new Set(prev).add(id));
        try {
            await downloadResearchPackage(id);
            Alert.alert("Sucesso", `A pesquisa "${title}" foi baixada e está pronta para uso offline.`);
            await loadFromCache(); // Atualiza a lista para refletir o status
        } catch (error) {
            const reason = error instanceof Error ? error.message : "A conexão falhou ou ocorreu um erro.";
            Alert.alert("Erro", `${reason} A pesquisa não foi baixada.`);
        } finally {
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const startCollection = (researchId: number) => {
        router.push({ pathname: '/coleta/[researchId]', params: { researchId: String(researchId) } });
    };

    const openDraft = (researchId: number, clientId: string) => {
        router.push({
            pathname: '/coleta/[researchId]',
            params: { researchId: String(researchId), clientId },
        });
    };

    const draftsOf = (researchId: number) =>
        collections.filter((c) => c.researchId === researchId && c.status === 'IN_PROGRESS');

    // Um rascunho: retoma direto. Vários: o pesquisador escolhe qual continuar.
    const resumeDraft = (research: Research) => {
        const drafts = draftsOf(research.id);
        if (drafts.length === 0) return startCollection(research.id);
        if (drafts.length === 1) return openDraft(research.id, drafts[0].clientId);
        setPickingResearch(research);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Minhas Pesquisas</Text>
                <Text style={styles.headerSubtitle}>
                    {isOnline ? 'Baixe as pesquisas para coletar respostas no campo' : 'Offline — mostrando o que já está salvo no aparelho'}
                </Text>
            </View>

            {pesquisas.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                        {isOnline
                            ? 'Você não possui pesquisas atribuídas no momento.'
                            : 'Nenhuma pesquisa foi baixada neste aparelho ainda.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={pesquisas}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <PesquisaCard
                            titulo={item.title}
                            targetAudience={item.targetAudience}
                            startDate={item.startDate}
                            endDate={item.endDate}
                            isDownloaded={!!item.isDownloaded}
                            isOnline={isOnline}
                            isDownloading={downloadingIds.has(item.id)}
                            coletasCount={collections.filter((c) => c.researchId === item.id && c.status === 'FINISHED').length}
                            draftCount={collections.filter((c) => c.researchId === item.id && c.status === 'IN_PROGRESS').length}
                            onDownload={() => handleDownload(item.id, item.title)}
                            onStart={() => startCollection(item.id)}
                            onResume={() => resumeDraft(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            )}

            <DraftPickerModal
                visible={pickingResearch !== null}
                title={pickingResearch?.title ?? ''}
                drafts={pickingResearch ? draftsOf(pickingResearch.id) : []}
                onClose={() => setPickingResearch(null)}
                onSelect={(draft) => {
                    setPickingResearch(null);
                    openDraft(draft.researchId, draft.clientId);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fafafa' },
    header: { padding: 20, paddingBottom: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
    headerSubtitle: { fontSize: 14, color: '#71717a', marginTop: 4 },
    listContainer: { padding: 20, gap: 16 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 14, color: '#71717a', textAlign: 'center' },
});