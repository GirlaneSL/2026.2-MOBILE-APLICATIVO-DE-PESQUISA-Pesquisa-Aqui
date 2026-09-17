import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function Login() {
    const router = useRouter();
    const { login } = useAuth();
    const isOnline = useNetworkStatus();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            await login(username, password);
            router.replace('/(app)/(home)');
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>
                        Você está offline. É preciso internet para entrar pela primeira vez.
                    </Text>
                </View>
            )}

            <Text style={styles.title}>Entrar</Text>

            <TextInput
                style={styles.input}
                placeholder="Usuário"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
                style={[styles.button, (loading || !isOnline) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading || !isOnline}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff', gap: 12 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: '#0f172a' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16 },
    button: { backgroundColor: '#447762', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { backgroundColor: '#94a3b8' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    error: { color: '#dc2626', fontSize: 14 },
    offlineBanner: { backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 16 },
    offlineText: { color: '#92400e', fontSize: 13 },
});
