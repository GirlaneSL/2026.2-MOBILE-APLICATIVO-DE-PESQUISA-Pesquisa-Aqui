import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RotateCw } from 'lucide-react-native';
import Chip from '@/components/Chip';
import { Brand } from '@/constants/brand';

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
    const renderStatus = () => {
        switch (status) {
            case 'sincronizado':
                return <Chip label="Enviada" tone="light" />;
            case 'enviando':
                return (
                    <View style={styles.sending}>
                        <ActivityIndicator size="small" color={Brand.green} />
                        <Text style={styles.sendingText}>Enviando</Text>
                    </View>
                );
            case 'aguardando':
                return <Chip label="Na fila" tone="gray" />;
            case 'pendente':
                return <Chip label="Pendente" tone="clay" />;
            default:
                return <Chip label="Falhou" tone="clay" />;
        }
    };

    return (
        <View style={[styles.card, status === 'falha' && styles.cardFailed]}>
            <View style={styles.cardContent}>
                <View style={styles.cardInfo}>
                    <Text style={styles.itemTitle}>{identificador}</Text>
                    <Text style={styles.itemSubtitle}>{pesquisa}</Text>
                    <Text style={styles.itemDate}>Coletada em {data}</Text>
                </View>
                {renderStatus()}
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
                            <RotateCw size={14} color={Brand.greenDeep} strokeWidth={1.8} />
                            <Text style={styles.retryText}>Tentar de novo</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: Brand.line,
        backgroundColor: Brand.card,
    },
    cardFailed: { borderColor: '#e9c5b9' },
    cardContent: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    cardInfo: { flex: 1, gap: 2 },
    itemTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: Brand.ink },
    itemSubtitle: { fontSize: 14, color: Brand.greenDeep, fontWeight: '500' },
    itemDate: { fontSize: 12.5, color: Brand.muted, marginTop: 2 },
    sending: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 26,
        paddingHorizontal: 11,
        borderRadius: 999,
        backgroundColor: Brand.chipLight,
    },
    sendingText: { fontSize: 12, fontWeight: '500', color: Brand.greenDeep },
    failure: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Brand.line,
        gap: 4,
    },
    failureReason: { fontSize: 13, color: Brand.clayInk, lineHeight: 18 },
    failureAttempts: { fontSize: 12, color: Brand.muted },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#cdd5d0',
    },
    retryButtonDisabled: { opacity: 0.45 },
    retryText: { fontSize: 13, fontWeight: '500', color: Brand.ink },
});
