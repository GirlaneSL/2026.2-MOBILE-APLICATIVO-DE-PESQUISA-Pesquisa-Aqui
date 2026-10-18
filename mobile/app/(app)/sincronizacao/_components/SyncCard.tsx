import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, Clock, AlertCircle, Bolt, RotateCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type SyncCardStatus = 'pendente' | 'aguardando' | 'enviando' | 'falha' | 'sincronizado';

interface SyncCardProps {
    identificador: string;
    pesquisa: string;
    data: string;
    status: SyncCardStatus;
    // Só na falha: por que o servidor não confirmou, quantas vezes já falhou e o botão de reenviar
    motivo?: string;
    tentativas?: number;
    onRetry?: () => void;
    retryDisabled?: boolean;
}

export default function SyncCard({
    identificador,
    pesquisa,
    data,
    status,
    motivo,
    tentativas,
    onRetry,
    retryDisabled,
}: SyncCardProps) {
    const renderStatusBadge = () => {
        switch (status) {
            case 'sincronizado':
                return (
                    <View style={[styles.badge, styles.badgeSuccess]}>
                        <CheckCircle2 size={14} color="#16a34a" />
                        <Text style={[styles.badgeText, styles.badgeTextSuccess]}>Enviado</Text>
                    </View>
                );
            case 'enviando':
                return (
                    <View style={[styles.badge, styles.badgeSending]}>
                        <ActivityIndicator size="small" color="#447762" />
                        <Text style={[styles.badgeText, styles.badgeTextSending]}>Enviando</Text>
                    </View>
                );
            case 'aguardando':
                return (
                    <View style={[styles.badge, styles.badgeWaiting]}>
                        <Clock size={14} color="#52525b" />
                        <Text style={[styles.badgeText, styles.badgeTextWaiting]}>Na vez</Text>
                    </View>
                );
            case 'pendente':
                return (
                    <View style={[styles.badge, styles.badgeWarning]}>
                        <Clock size={14} color="#B66D56" />
                        <Text style={[styles.badgeText, styles.badgeTextWarning]}>Pendente</Text>
                    </View>
                );
            default:
                return (
                    <View style={[styles.badge, styles.badgeError]}>
                        <AlertCircle size={14} color="#dc2626" />
                        <Text style={[styles.badgeText, styles.badgeTextError]}>Falha</Text>
                    </View>
                );
        }
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

            {status === 'falha' ? (
                <View style={styles.failure}>
                    <Text style={styles.failureReason}>{motivo ?? 'O envio não foi concluído.'}</Text>
                    {tentativas ? (
                        <Text style={styles.failureAttempts}>
                            {tentativas === 1 ? '1 tentativa sem sucesso' : `${tentativas} tentativas sem sucesso`}
                        </Text>
                    ) : null}
                    {onRetry ? (
                        <TouchableOpacity
                            style={[styles.retryButton, retryDisabled && styles.retryButtonDisabled]}
                            onPress={onRetry}
                            disabled={retryDisabled}
                            accessibilityRole="button"
                            accessibilityLabel={`Tentar enviar de novo a ${identificador}`}
                            accessibilityState={{ disabled: !!retryDisabled }}
                        >
                            <RotateCw size={14} color="#447762" />
                            <Text style={styles.retryText}>Tentar de novo</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}

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
    badgeSending: { backgroundColor: '#e3efe9' },
    badgeWaiting: { backgroundColor: '#f4f4f5' },
    badgeWarning: { backgroundColor: '#ffedd5' },
    badgeError: { backgroundColor: '#fee2e2' },
    badgeText: { fontSize: 12, fontWeight: '600' },
    badgeTextSuccess: { color: '#16a34a' },
    badgeTextSending: { color: '#447762' },
    badgeTextWaiting: { color: '#52525b' },
    badgeTextWarning: { color: '#B66D56' },
    badgeTextError: { color: '#dc2626' },
    failure: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#fecaca',
        gap: 4,
        zIndex: 1,
    },
    failureReason: { fontSize: 13, color: '#b91c1c', lineHeight: 18 },
    failureAttempts: { fontSize: 12, color: '#a1a1aa' },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        marginTop: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#447762',
        backgroundColor: '#fff',
    },
    retryButtonDisabled: { opacity: 0.45 },
    retryText: { fontSize: 13, fontWeight: '600', color: '#447762' },
    bolt1: { position: 'absolute', top: 4, left: 4, opacity: 0.4 },
    bolt2: { position: 'absolute', top: 4, right: 4, opacity: 0.4 },
    bolt3: { position: 'absolute', bottom: 4, left: 4, opacity: 0.4 },
    bolt4: { position: 'absolute', bottom: 4, right: 4, opacity: 0.4 },
});
