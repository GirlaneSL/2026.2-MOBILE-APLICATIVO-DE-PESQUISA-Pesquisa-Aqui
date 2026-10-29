import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Chip from '@/components/Chip';
import { Brand } from '@/constants/brand';
import PressableScale from './PressableScale';
import ProgressBar from './ProgressBar';

interface ResearchRowProps {
    title: string;
    subtitle: string;
    downloaded: boolean;
    /** Progresso frente à meta; `target` nulo = o administrador não definiu meta. */
    done: number;
    target: number | null;
    percent: number | null;
    pending: number;
    delay?: number;
    onPress: () => void;
}

/** Pesquisa na Home: título, situação e (quando há meta) a barra de progresso. */
export default function ResearchRow({
    title,
    subtitle,
    downloaded,
    done,
    target,
    percent,
    pending,
    delay = 0,
    onPress,
}: ResearchRowProps) {
    const complete = percent !== null && percent >= 100;
    const remaining = target === null ? null : Math.max(0, target - done);

    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${subtitle}${percent !== null ? `. ${percent}% da meta` : ''}`}
            style={styles.card}
        >
            <View style={styles.top}>
                <View style={styles.titles}>
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                    </Text>
                </View>
                {percent !== null ? (
                    <Text style={[styles.percent, complete && styles.percentDone]}>{percent}%</Text>
                ) : (
                    <Chip label={downloaded ? 'No aparelho' : 'Não baixada'} tone={downloaded ? 'light' : 'gray'} />
                )}
                <ChevronRight size={18} color={Brand.muted} strokeWidth={1.8} />
            </View>

            {percent !== null ? (
                <View style={styles.progress}>
                    <ProgressBar percent={percent} delay={delay} color={complete ? Brand.greenDeep : Brand.green} />
                    <Text style={styles.caption}>
                        {complete
                            ? `Meta atingida · ${done} ${done === 1 ? 'coleta' : 'coletas'}`
                            : `${done} de ${target} · faltam ${remaining}`}
                        {pending > 0 ? ` · ${pending} aguardando envio` : ''}
                    </Text>
                </View>
            ) : null}
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Brand.card,
        borderWidth: 1,
        borderColor: Brand.line,
        borderRadius: 20,
        padding: 14,
        gap: 12,
    },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titles: { flex: 1, minWidth: 0, gap: 2 },
    title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: Brand.ink },
    subtitle: { fontSize: 12.5, color: Brand.muted },
    percent: { fontSize: 22, fontWeight: '300', letterSpacing: -0.8, color: Brand.ink, fontVariant: ['tabular-nums'] },
    percentDone: { color: Brand.greenDeep, fontWeight: '600' },
    progress: { gap: 8 },
    caption: { fontSize: 12, color: Brand.muted },
});
