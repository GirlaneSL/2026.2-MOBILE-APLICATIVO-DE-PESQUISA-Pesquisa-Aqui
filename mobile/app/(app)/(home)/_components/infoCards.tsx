import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/brand';

interface InfoCardProps {
    value: string;
    label: string;
    icon: ReactNode;
    /** `clay` chama atenção quando há algo a fazer. */
    tone?: 'light' | 'clay';
    onPress?: () => void;
}

/** Indicador do resumo: número grande, legenda curta e ícone numa pastilha. */
export default function InfoCard({ value, label, icon, tone = 'light', onPress }: InfoCardProps) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : 'summary'}
            accessibilityLabel={`${value} ${label}`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
            <View style={[styles.icon, tone === 'clay' && styles.iconClay]}>{icon}</View>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: 0,
        backgroundColor: Brand.card,
        borderWidth: 1,
        borderColor: Brand.line,
        borderRadius: 22,
        padding: 16,
        gap: 4,
    },
    pressed: { backgroundColor: '#f5f8f5' },
    icon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: Brand.chipLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    iconClay: { backgroundColor: Brand.clayLight },
    value: { fontSize: 34, fontWeight: '300', letterSpacing: -1.5, color: Brand.ink, fontVariant: ['tabular-nums'] },
    label: { fontSize: 12.5, color: Brand.muted },
});
