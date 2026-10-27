import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Download, PlayCircle, RefreshCw, Trash2, WifiOff } from 'lucide-react-native';
import Chip from '@/components/Chip';
import { Brand } from '@/constants/brand';
import { formatApiDate } from '@/lib/formatDate';

interface PesquisaCardProps {
    titulo: string;
    targetAudience: string;
    startDate: string;
    endDate: string;
    isDownloaded: boolean;
    isOnline: boolean;
    isDownloading: boolean;
    coletasCount?: number;
    draftCount?: number;
    revoked?: boolean;
    onDownload: () => void;
    onReturn?: () => void;
    onStart?: () => void;
    onResume?: () => void;
}

export default function PesquisaCard({
    titulo,
    targetAudience,
    startDate,
    endDate,
    isDownloaded,
    isOnline,
    isDownloading,
    coletasCount = 0,
    draftCount = 0,
    revoked = false,
    onDownload,
    onReturn,
    onStart,
    onResume,
}: PesquisaCardProps) {
    const period = `${formatApiDate(startDate)} a ${formatApiDate(endDate)}`;
    const canDownload = isOnline && !isDownloading && !revoked;

    return (
        <View style={styles.card}>
            <View style={styles.top}>
                <View style={styles.titles}>
                    <Text style={styles.title}>{titulo}</Text>
                    <Text style={styles.info}>Vigente de {period}</Text>
                    {targetAudience ? <Text style={styles.info}>Público: {targetAudience}</Text> : null}
                </View>
                <Chip
                    label={revoked ? 'Acesso revogado' : isDownloaded ? 'No aparelho' : 'Não baixada'}
                    tone={revoked ? 'clay' : isDownloaded ? 'light' : 'gray'}
                />
            </View>

            {isDownloaded ? (
                <>
                    <View style={styles.counts}>
                        <View style={styles.count}>
                            <Text style={styles.countValue}>{coletasCount}</Text>
                            <Text style={styles.countLabel}>{coletasCount === 1 ? 'coleta feita' : 'coletas feitas'}</Text>
                        </View>
                        <View style={[styles.count, styles.countDivider]}>
                            <Text style={styles.countValue}>{draftCount}</Text>
                            <Text style={styles.countLabel}>{draftCount === 1 ? 'rascunho' : 'rascunhos'}</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        {draftCount > 0 ? (
                            <Pressable
                                style={({ pressed }) => [styles.button, styles.buttonGhost, pressed && styles.pressed]}
                                onPress={onResume}
                                accessibilityRole="button"
                                accessibilityLabel={`Retomar rascunho de ${titulo}`}
                            >
                                <Text style={styles.buttonGhostText}>Retomar</Text>
                            </Pressable>
                        ) : null}
                        <Pressable
                            style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressedDark]}
                            onPress={onStart}
                            accessibilityRole="button"
                            accessibilityLabel={`Iniciar coleta de ${titulo}`}
                        >
                            <PlayCircle size={18} color="#fff" strokeWidth={1.8} />
                            <Text style={styles.buttonPrimaryText}>Iniciar coleta</Text>
                        </Pressable>
                        {isOnline ? (
                            <Pressable
                                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                                onPress={onDownload}
                                disabled={isDownloading}
                                accessibilityRole="button"
                                accessibilityLabel={`Atualizar a pesquisa ${titulo}`}
                            >
                                {isDownloading ? (
                                    <ActivityIndicator size="small" color={Brand.green} />
                                ) : (
                                    <RefreshCw size={18} color={Brand.greenDeep} strokeWidth={1.8} />
                                )}
                            </Pressable>
                        ) : null}
                    </View>

                    {onReturn ? (
                        <Pressable
                            onPress={onReturn}
                            style={({ pressed }) => [styles.returnLink, pressed && styles.pressed]}
                            accessibilityRole="button"
                            accessibilityLabel={`Remover a pesquisa ${titulo} do aparelho`}
                        >
                            <Trash2 size={15} color={Brand.muted} strokeWidth={1.8} />
                            <Text style={styles.returnLinkText}>Remover do aparelho</Text>
                        </Pressable>
                    ) : null}
                </>
            ) : (
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        styles.buttonMint,
                        !canDownload && styles.buttonDisabled,
                        pressed && canDownload && styles.pressed,
                    ]}
                    onPress={onDownload}
                    disabled={!canDownload}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canDownload, busy: isDownloading }}
                    accessibilityLabel={`Baixar a pesquisa ${titulo}`}
                >
                    {isDownloading ? (
                        <ActivityIndicator size="small" color={Brand.forest} />
                    ) : (
                        <>
                            {!isOnline ? (
                                <WifiOff size={18} color={Brand.muted} strokeWidth={1.8} />
                            ) : (
                                <Download size={18} color={Brand.forest} strokeWidth={1.8} />
                            )}
                            <Text style={[styles.buttonMintText, !isOnline && styles.buttonDisabledText]}>
                                {revoked ? 'Acesso revogado neste aparelho' : !isOnline ? 'Precisa de internet para baixar' : 'Baixar pesquisa'}
                            </Text>
                        </>
                    )}
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Brand.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Brand.line,
        padding: 18,
        gap: 16,
    },
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    titles: { flex: 1, gap: 3 },
    title: { fontSize: 18, fontWeight: '600', letterSpacing: -0.4, color: Brand.ink, marginBottom: 2 },
    info: { fontSize: 13, color: Brand.muted },
    counts: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 14 },
    count: { flex: 1 },
    countDivider: { borderLeftWidth: 1, borderLeftColor: Brand.line, paddingLeft: 16 },
    countValue: { fontSize: 26, fontWeight: '300', letterSpacing: -1, color: Brand.ink, fontVariant: ['tabular-nums'] },
    countLabel: { fontSize: 12.5, color: Brand.muted },
    actions: { flexDirection: 'row', gap: 8 },
    button: {
        flex: 1,
        height: 46,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 18,
    },
    buttonPrimary: { backgroundColor: Brand.ink },
    buttonPrimaryText: { color: '#fff', fontWeight: '500', fontSize: 15 },
    buttonGhost: { borderWidth: 1, borderColor: '#cdd5d0', backgroundColor: 'transparent' },
    buttonGhostText: { color: Brand.ink, fontWeight: '500', fontSize: 15 },
    buttonMint: { backgroundColor: Brand.mint },
    buttonMintText: { color: Brand.forest, fontWeight: '500', fontSize: 15 },
    buttonDisabled: { backgroundColor: Brand.chipGray },
    buttonDisabledText: { color: Brand.muted },
    iconButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 1,
        borderColor: '#cdd5d0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    returnLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, borderRadius: 999 },
    returnLinkText: { fontSize: 13.5, color: Brand.muted },
    pressed: { backgroundColor: '#e9ede9' },
    pressedDark: { backgroundColor: '#26332c' },
});
