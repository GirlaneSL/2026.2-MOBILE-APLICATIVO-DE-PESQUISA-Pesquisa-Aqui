import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react-native';

export function OfflineBanner() {
    const isOnline = useNetworkStatus();

    if (isOnline) return null;

    return (
        <View style={styles.banner}>
            <WifiOff size={16} color="#92400e" />
            <Text style={styles.text}>Você está offline. Exibindo dados locais.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        backgroundColor: '#fef3c7',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        color: '#92400e',
        fontSize: 13,
        fontWeight: '500',
    },
});