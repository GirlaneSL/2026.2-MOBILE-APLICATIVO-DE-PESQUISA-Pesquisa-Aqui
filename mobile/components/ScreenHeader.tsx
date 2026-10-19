import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Contour from '@/components/Contour';
import { Brand, Radius } from '@/constants/brand';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    /** Chip ou controle no canto direito. */
    right?: ReactNode;
    seed?: number;
}

/** Cabeçalho escuro com curvas de nível, usado no topo das abas. */
export default function ScreenHeader({ title, subtitle, right, seed = 4.1 }: ScreenHeaderProps) {
    return (
        <View style={styles.header}>
            <Contour seed={seed} rings={9} cx={0.85} cy={0.3} size={0.9} color={Brand.green} opacity={0.8} />
            <View style={styles.row}>
                <View style={styles.texts}>
                    <Text style={styles.title} accessibilityRole="header">{title}</Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                {right}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: Brand.forest,
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 26,
        borderBottomLeftRadius: Radius.hero,
        borderBottomRightRadius: Radius.hero,
        overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    texts: { flex: 1 },
    title: { fontSize: 28, fontWeight: '600', letterSpacing: -0.8, color: '#fff' },
    subtitle: { fontSize: 14, color: Brand.mutedDark, marginTop: 6, lineHeight: 20 },
});
