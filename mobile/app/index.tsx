import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncResearches } from '@/lib/researchCache';

export default function Splash() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();
    const isOnline = useNetworkStatus();
    const [statusText, setStatusText] = useState('Iniciando...');

    useEffect(() => {
        if (isLoading) return;

        const run = async () => {
            if (isAuthenticated) {
                if (isOnline) {
                    setStatusText('Atualizando dados...');
                    await syncResearches(); // se falhar, segue com o que já tem salvo
                } else {
                    setStatusText('Sem conexão — usando dados salvos');
                }
                router.replace('/(app)/(home)');
            } else {
                router.replace('/login');
            }
        };

        run();
    }, [isLoading, isAuthenticated, isOnline]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#447762" />
            <Text style={styles.text}>{statusText}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#fff' },
    text: { fontSize: 14, color: '#666' },
});
