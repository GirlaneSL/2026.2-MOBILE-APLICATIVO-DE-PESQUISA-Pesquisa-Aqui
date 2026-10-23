import { Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Chip from '@/components/Chip';
import { Brand } from '@/constants/brand';
import type { ResearchProgress } from '@/lib/researchProgress';

interface ResearchProgressCardProps {
    titulo: string;
    isDownloaded: boolean;
    progress: ResearchProgress;
    drafts: number;
    // Só nas pesquisas baixadas. Bloqueado enquanto houver coleta pendente (a tela explica ao tocar).
    onRemove?: () => void;
    removeBlocked?: boolean;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Progresso do pesquisador frente à meta de uma pesquisa, com a remoção dela do aparelho. */
export default function ResearchProgressCard({
    titulo,
    isDownloaded,
    progress,
    drafts,
    onRemove,
    removeBlocked,
}: ResearchProgressCardProps) {
    const { done, pending, target, remaining, percent } = progress;

    const pendingParts: string[] = [];
    if (pending > 0) pendingParts.push(plural(pending, 'coleta aguardando envio', 'coletas aguardando envio'));
    if (drafts > 0) pendingParts.push(plural(drafts, 'rascunho (ainda não conta na meta)', 'rascunhos (ainda não contam na meta)'));
    const pendingText = pendingParts.join(' e ');

    return (
        <View style={styles.card}>
            <View style={styles.top}>
                <Text style={styles.title}>{titulo}</Text>
                <Chip label={isDownloaded ? 'No aparelho' : 'Não baixada'} tone={isDownloaded ? 'light' : 'gray'} />
            </View>

            <View style={styles.numbers}>
                <Text style={styles.big}>{done}</Text>
                <Text style={styles.of}>
                    {target !== null ? `de ${target} ${target === 1 ? 'coleta' : 'coletas'}` : done === 1 ? 'coleta feita' : 'coletas feitas'}
                </Text>
            </View>

            {target !== null && percent !== null && remaining !== null ? (
                <>
                    <View
                        style={styles.track}
                        accessibilityRole="progressbar"
                        accessibilityLabel={`Meta de ${titulo}`}
                        accessibilityValue={{ min: 0, max: target, now: Math.min(done, target) }}
                    >
                        <View style={[styles.bar, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.detail}>
                        {remaining === 0
                            ? 'Meta atingida'
                            : `Faltam ${plural(remaining, 'coleta', 'coletas')} para a meta (${percent}%)`}
                    </Text>
                </>
            ) : (
                <Text style={styles.detail}>Sem meta definida pelo administrador.</Text>
            )}

            {pendingText ? <Text style={styles.pending}>{pendingText}</Text> : null}

            {onRemove ? (
                <View style={styles.removeBox}>
                    <Pressable
                        onPress={onRemove}
                        style={({ pressed }) => [styles.removeButton, removeBlocked && styles.removeBlocked, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !!removeBlocked }}
                        accessibilityLabel={`Remover a pesquisa ${titulo} do aparelho`}
                    >
                        <Trash2 size={14} color={removeBlocked ? Brand.muted : Brand.clayInk} strokeWidth={1.8} />
                        <Text style={[styles.removeText, removeBlocked && styles.removeTextBlocked]}>Remover do aparelho</Text>
                    </Pressable>
                    {removeBlocked ? (
                        <Text style={styles.removeHint}>Disponível quando a fila desta pesquisa estiver vazia.</Text>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Brand.card,
        borderWidth: 1,
        borderColor: Brand.line,
        borderRadius: 24,
        padding: 18,
        gap: 6,
    },
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    title: { flex: 1, fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: Brand.ink },
    numbers: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
    big: { fontSize: 34, fontWeight: '300', letterSpacing: -1.5, color: Brand.ink, fontVariant: ['tabular-nums'] },
    of: { fontSize: 14, color: Brand.muted },
    track: { height: 6, borderRadius: 99, backgroundColor: Brand.trackLight, overflow: 'hidden', marginTop: 4 },
    bar: { height: 6, borderRadius: 99, backgroundColor: Brand.green },
    detail: { fontSize: 13, color: Brand.muted },
    pending: { fontSize: 12.5, color: Brand.warn, marginTop: 2 },
    removeBox: { marginTop: 10, gap: 6, borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 12 },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e9c5b9',
    },
    removeBlocked: { borderColor: '#cdd5d0' },
    removeText: { fontSize: 13, fontWeight: '500', color: Brand.clayInk },
    removeTextBlocked: { color: Brand.muted },
    removeHint: { fontSize: 12, color: Brand.muted },
    pressed: { backgroundColor: '#f6ece8' },
});
