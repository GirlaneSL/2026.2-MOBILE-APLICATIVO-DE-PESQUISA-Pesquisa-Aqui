import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import CountUp from '@/components/home/CountUp';
import PressableScale from '@/components/home/PressableScale';
import { Brand } from '@/constants/brand';

interface InfoCardProps {
    value: number;
    label: string;
    icon: ReactNode;
    /** `clay` chama atenção quando há algo a fazer. */
    tone?: 'light' | 'clay';
    onPress?: () => void;
}

/** Indicador do resumo: número que rola até o valor, legenda curta e ícone numa pastilha. */
export default function InfoCard({ value, label, icon, tone = 'light', onPress }: InfoCardProps) {
    const clay = tone === 'clay';

    return (
        <PressableScale
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : 'summary'}
            accessibilityLabel={`${value} ${label}`}
            containerStyle={styles.container}
            style={[styles.card, clay && styles.cardClay]}
        >
            <View style={styles.top}>
                <View style={[styles.icon, clay && styles.iconClay]}>{icon}</View>
                {onPress ? <ChevronRight size={16} color={clay ? Brand.clayInk : Brand.muted} strokeWidth={2} /> : null}
            </View>
            <CountUp value={value} style={[styles.value, clay && styles.valueClay]} />
            <Text style={[styles.label, clay && styles.labelClay]}>{label}</Text>
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, minWidth: 0 },
    card: {
        backgroundColor: Brand.card,
        borderWidth: 1,
        borderColor: Brand.line,
        borderRadius: 22,
        padding: 16,
        gap: 2,
    },
    cardClay: { backgroundColor: '#fbf3ef', borderColor: 'rgba(171, 96, 73, 0.3)' },
    top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
    icon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: Brand.chipLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconClay: { backgroundColor: Brand.clayLight },
    value: { fontSize: 38, fontWeight: '300', letterSpacing: -1.8, color: Brand.ink, fontVariant: ['tabular-nums'] },
    valueClay: { color: Brand.clayInk },
    label: { fontSize: 12.5, color: Brand.muted },
    labelClay: { color: '#7a4a3b' },
});
