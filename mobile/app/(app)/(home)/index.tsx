import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CloudUpload, FileText, PenLine } from 'lucide-react-native';
import Chip from '@/components/Chip';
import Contour from '@/components/Contour';
import { Brand, Radius, TAB_BAR_CLEARANCE } from '@/constants/brand';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { listCollections } from '@/lib/collectionStore';
import { getCachedResearches, syncResearches } from '@/lib/researchCache';
import { listSent } from '@/lib/sentHistory';
import InfoCard from './_components/infoCards';

const isThisMonth = (iso?: string) => {
    if (!iso) return false;
    const date = new Date(iso);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const firstName = (name?: string) => name?.trim().split(' ')[0] || 'Pesquisador';

export default function Home() {
    const router = useRouter();
    const { user } = useAuth();
    const isOnline = useNetworkStatus();
    const [researchCount, setResearchCount] = useState(0);
    const [doneMonth, setDoneMonth] = useState(0);
    const [pendingSend, setPendingSend] = useState(0);
    const [drafts, setDrafts] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        if (isOnline) {
            try {
                await syncResearches();
            } catch (error) {
                console.log('Falha ao sincronizar pesquisas na Home:', error);
            }
        }
        const [researches, collections, sent] = await Promise.all([
            getCachedResearches(),
            listCollections(),
            listSent().catch(() => []),
        ]);
        const finished = collections.filter((c) => c.status === 'FINISHED');
        // Coletas do mês: as finalizadas ainda no aparelho (aguardando envio) + as já enviadas (histórico).
        // Pelo clientId, uma coleta nunca conta duas vezes.
        const monthIds = new Set<string>();
        finished.forEach((c) => {
            if (isThisMonth(c.finishedAt ?? c.startedAt)) monthIds.add(c.clientId);
        });
        sent.forEach((r) => {
            if (isThisMonth(r.finishedAt ?? r.startedAt)) monthIds.add(r.clientId);
        });
        setResearchCount(researches.filter((item) => item.status !== 'DRAFT').length);
        setDoneMonth(monthIds.size);
        setPendingSend(finished.length);
        setDrafts(collections.length - finished.length);
    }, [isOnline]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Brand.green} />}
        >
            <View style={styles.hero}>
                <Contour seed={4.1} rings={10} cx={0.8} cy={0.7} size={1} opacity={0.8} color={Brand.green} />
                <View style={styles.heroRow}>
                    <Chip label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'dark' : 'clay'} />
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{firstName(user?.name).charAt(0).toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.hi}>Olá, {firstName(user?.name)}. Coletas feitas neste mês:</Text>
                <Text style={styles.big} accessibilityLabel={`${doneMonth} coletas feitas neste mês`}>{doneMonth}</Text>
                <Text style={styles.cap}>
                    {doneMonth === 1 ? 'coleta finalizada' : 'coletas finalizadas'}
                </Text>
            </View>

            <View style={styles.body}>
                <Text style={styles.sectionTitle}>Resumo do aparelho</Text>
                <View style={styles.cards}>
                    <InfoCard
                        value={String(researchCount)}
                        label={researchCount === 1 ? 'pesquisa disponível' : 'pesquisas disponíveis'}
                        icon={<FileText size={18} color={Brand.greenDeep} strokeWidth={1.8} />}
                        onPress={() => router.push('/(app)/pesquisas')}
                    />
                    <InfoCard
                        value={String(pendingSend)}
                        label={pendingSend === 1 ? 'coleta para enviar' : 'coletas para enviar'}
                        icon={<CloudUpload size={18} color={Brand.greenDeep} strokeWidth={1.8} />}
                        tone={pendingSend > 0 ? 'clay' : 'light'}
                        onPress={() => router.push('/(app)/sincronizacao')}
                    />
                </View>
                {drafts > 0 ? (
                    <View style={styles.draftNote}>
                        <PenLine size={16} color={Brand.clayInk} strokeWidth={1.8} />
                        <Text style={styles.draftNoteText}>
                            {drafts === 1
                                ? 'Você tem 1 rascunho em andamento. Retome em Pesquisas.'
                                : `Você tem ${drafts} rascunhos em andamento. Retome em Pesquisas.`}
                        </Text>
                    </View>
                ) : null}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Brand.paper },
    content: { flexGrow: 1, paddingBottom: TAB_BAR_CLEARANCE },
    hero: {
        backgroundColor: Brand.forest,
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 28,
        borderBottomLeftRadius: Radius.hero,
        borderBottomRightRadius: Radius.hero,
        overflow: 'hidden',
    },
    heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Brand.mint,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: Brand.forest, fontWeight: '700', fontSize: 15 },
    hi: { color: Brand.mutedDark, marginTop: 22, fontSize: 14 },
    big: {
        color: '#fff',
        fontSize: 88,
        fontWeight: '300',
        letterSpacing: -6,
        lineHeight: 92,
        marginTop: 6,
        fontVariant: ['tabular-nums'],
    },
    cap: { color: Brand.fgDark, fontSize: 15, marginTop: 4 },
    body: { padding: 18, gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: Brand.ink },
    cards: { flexDirection: 'row', gap: 12 },
    draftNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 18,
        backgroundColor: Brand.clayLight,
    },
    draftNoteText: { flex: 1, fontSize: 13, lineHeight: 18, color: Brand.clayInk, fontWeight: '500' },
});
