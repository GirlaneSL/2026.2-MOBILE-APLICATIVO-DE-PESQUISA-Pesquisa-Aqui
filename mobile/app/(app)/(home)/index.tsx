import { useCallback, useState } from 'react';
import { FileText } from "lucide-react-native";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from 'expo-router';
import InfoCard from "./_components/infoCards";
import { getCachedResearches, syncResearches } from '@/lib/researchCache';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function Home() {
    const router = useRouter();
    const { user } = useAuth();
    const [researchCount, setResearchCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const isOnline = useNetworkStatus();

    const loadData = useCallback(async () => {
        if (isOnline) {
            try {
                await syncResearches();
            } catch (error) {
                console.log('Falha ao sincronizar pesquisas na Home:', error);
            }
        }
        const data = await getCachedResearches();
        const nonDrafts = data.filter((item) => item.status !== 'DRAFT');
        setResearchCount(nonDrafts.length);
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
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Olá, {user?.name ?? 'Pesquisador'}!</Text>
                <Text style={styles.headerSubtitle}>Seu resumo de campo de hoje</Text>
            </View>

            <View style={styles.cardsContainer}>
                <InfoCard
                    value={String(researchCount)}
                    label="Pesquisas"
                    icon={<FileText size={24} color="#447762" />}
                />
            </View>

            <Text style={styles.sectionTitle}>Ações</Text>
            <View style={styles.actionsContainer}>
                <Text style={styles.placeholderNote}>
                    A coleta de respostas ainda não está disponível nesta versão.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fafafa" },
    contentContainer: { padding: 20, flexGrow: 1 },
    header: { marginBottom: 24, marginTop: 8 },
    headerTitle: { fontSize: 24, fontWeight: "bold", color: "#18181b" },
    headerSubtitle: { fontSize: 16, color: "#71717a", marginTop: 4 },
    cardsContainer: { flexDirection: "row", gap: 8, marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#18181b", marginBottom: 16 },
    actionsContainer: { gap: 12, paddingBottom: 40 },
    placeholderNote: { fontSize: 14, color: '#a1a1aa', fontStyle: 'italic' },
});