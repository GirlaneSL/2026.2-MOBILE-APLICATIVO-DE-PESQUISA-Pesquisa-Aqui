// mobile/app/(app)/sincronizacao/index.tsx
import { View, Text, StyleSheet } from 'react-native';
import { CloudUpload } from 'lucide-react-native';

export default function Sincronizacao() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Fila de Sincronização</Text>
                <Text style={styles.headerSubtitle}>Nenhuma coleta pendente</Text>
            </View>

            <View style={styles.emptyState}>
                <CloudUpload size={48} color="#d4d4d8" />
                <Text style={styles.emptyText}>
                    A coleta de respostas ainda não está disponível nesta versão do app.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fafafa' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
    headerSubtitle: { fontSize: 15, color: '#71717a', marginTop: 4 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
    emptyText: { fontSize: 14, color: '#71717a', textAlign: 'center' },
});