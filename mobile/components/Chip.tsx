import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/brand';

type Tone = 'dark' | 'light' | 'clay' | 'gray';

const TONES: Record<Tone, { bg: string; fg: string }> = {
    dark: { bg: 'rgba(191, 227, 208, 0.14)', fg: Brand.mint },
    light: { bg: Brand.chipLight, fg: Brand.greenDeep },
    clay: { bg: Brand.clayLight, fg: Brand.clayInk },
    gray: { bg: Brand.chipGray, fg: Brand.muted },
};

interface ChipProps {
    label: string;
    tone?: Tone;
}

/** Etiqueta de situação com ponto de cor. */
export default function Chip({ label, tone = 'light' }: ChipProps) {
    const { bg, fg } = TONES[tone];
    return (
        <View style={[styles.chip, { backgroundColor: bg }]}>
            <View style={[styles.dot, { backgroundColor: fg }]} />
            <Text style={[styles.text, { color: fg }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 26,
        paddingHorizontal: 11,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    text: { fontSize: 12, fontWeight: '500' },
});
