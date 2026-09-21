import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, AlertCircle, Bolt } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SyncCardProps {
    identificador: string;
    pesquisa: string;
    data: string;
    status: string;
}

export default function SyncCard({ identificador, pesquisa, data, status }: SyncCardProps) {
    const renderStatusBadge = () => {
        if (status === 'sincronizado') {
            return (
                <View style={[styles.badge, styles.badgeSuccess]}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <Text style={[styles.badgeText, styles.badgeTextSuccess]}>Enviado</Text>
                </View>
            );
        }
        if (status === 'pendente') {
            return (
                <View style={[styles.badge, styles.badgeWarning]}>
                    <Clock size={14} color="#B66D56" />
                    <Text style={[styles.badgeText, styles.badgeTextWarning]}>Pendente</Text>
                </View>
            );
        }
        return (
            <View style={[styles.badge, styles.badgeError]}>
                <AlertCircle size={14} color="#dc2626" />
                <Text style={[styles.badgeText, styles.badgeTextError]}>Falha</Text>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={['#B66D561A', '#FFFFFF1A', '#124B521A']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardInfo}>
                    <Text style={styles.itemTitle}>{identificador}</Text>
                    <Text style={styles.itemSubtitle}>{pesquisa}</Text>
                    <Text style={styles.itemDate}>Coletado em: {data}</Text>
                </View>
                {renderStatusBadge()}
            </View>

            <Bolt size={10} style={styles.bolt1} />
            <Bolt size={10} style={styles.bolt2} />
            <Bolt size={10} style={styles.bolt3} />
            <Bolt size={10} style={styles.bolt4} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 8,
        padding: 13,
        borderWidth: 1,
        borderColor: '#00000015',
        position: 'relative',
        backgroundColor: '#fff',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    cardInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#18181b',
    },
    itemSubtitle: {
        fontSize: 14,
        color: '#447762',
        fontWeight: '500',
        marginTop: 2,
    },
    itemDate: {
        fontSize: 12,
        color: '#a1a1aa',
        marginTop: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    badgeSuccess: { backgroundColor: '#dcfce7' },
    badgeWarning: { backgroundColor: '#ffedd5' },
    badgeError: { backgroundColor: '#fee2e2' },
    badgeText: { fontSize: 12, fontWeight: '600' },
    badgeTextSuccess: { color: '#16a34a' },
    badgeTextWarning: { color: '#B66D56' },
    badgeTextError: { color: '#dc2626' },
    bolt1: { position: 'absolute', top: 4, left: 4, opacity: 0.4 },
    bolt2: { position: 'absolute', top: 4, right: 4, opacity: 0.4 },
    bolt3: { position: 'absolute', bottom: 4, left: 4, opacity: 0.4 },
    bolt4: { position: 'absolute', bottom: 4, right: 4, opacity: 0.4 },
});