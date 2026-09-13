// mobile/app/(app)/(home)/index.tsx
import { useCallback, useState } from 'react';
import { FileText } from "lucide-react-native";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from 'expo-router';
import InfoCard from "./_components/infoCards";
import { getCachedResearches } from '@/lib/researchCache';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
    const router = useRouter();
    const { user } = useAuth();
    const [researchCount, setResearchCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            getCachedResearches().then((data) => setResearchCount(data.length));
        }, [])
    );

    return (
        <ScrollView style={styles.container}>
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
    container: { flex: 1, backgroundColor: "#fafafa", padding: 20 },
    header: { marginBottom: 24, marginTop: 8 },
    headerTitle: { fontSize: 24, fontWeight: "bold", color: "#18181b" },
    headerSubtitle: { fontSize: 16, color: "#71717a", marginTop: 4 },
    cardsContainer: { flexDirection: "row", gap: 8, marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#18181b", marginBottom: 16 },
    actionsContainer: { gap: 12, paddingBottom: 40 },
    placeholderNote: { fontSize: 14, color: '#a1a1aa', fontStyle: 'italic' },
});