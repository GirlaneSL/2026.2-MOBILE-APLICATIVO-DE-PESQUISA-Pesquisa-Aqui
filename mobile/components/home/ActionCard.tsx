import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Brand } from '@/constants/brand';
import PressableScale from './PressableScale';

type Tone = 'clay' | 'green' | 'calm';

const TONES: Record<Tone, { bg: string; border: string; ink: string; sub: string; pill: string; button: string; buttonInk: string }> = {
    clay: {
        bg: Brand.clayLight,
        border: 'rgba(171, 96, 73, 0.28)',
        ink: Brand.clayInk,
        sub: '#7a4a3b',
        pill: 'rgba(171, 96, 73, 0.16)',
        button: Brand.clayInk,
        buttonInk: '#fff',
    },
    green: {
        bg: Brand.card,
        border: Brand.line,
        ink: Brand.ink,
        sub: Brand.muted,
        pill: Brand.chipLight,
        button: Brand.forest,
        buttonInk: Brand.mint,
    },
    calm: {
        bg: Brand.chipLight,
        border: 'transparent',
        ink: Brand.greenDeep,
        sub: '#4b6a5c',
        pill: 'rgba(46, 85, 70, 0.12)',
        button: Brand.greenDeep,
        buttonInk: '#fff',
    },
};

interface ActionCardProps {
    icon: ReactNode;
    title: string;
    text: string;
    /** Rótulo do botão. Sem ele (ou sem `onPress`) o cartão é só informativo. */
    cta?: string;
    tone?: Tone;
    onPress?: () => void;
}

/** Próximo passo do pesquisador: o que fazer agora, com um toque. */
export default function ActionCard({ icon, title, text, cta, tone = 'green', onPress }: ActionCardProps) {
    const t = TONES[tone];
    const interactive = !!onPress;

    return (
        <PressableScale
            onPress={onPress}
            disabled={!interactive}
            accessibilityRole={interactive ? 'button' : 'summary'}
            accessibilityLabel={`${title}. ${text}${cta ? ` ${cta}` : ''}`}
            style={[styles.card, { backgroundColor: t.bg, borderColor: t.border }]}
        >
            <View style={[styles.iconPill, { backgroundColor: t.pill }]}>{icon}</View>
            <View style={styles.texts}>
                <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
                <Text style={[styles.text, { color: t.sub }]}>{text}</Text>
                {interactive && cta ? <Text style={[styles.cta, { color: t.ink }]}>{cta}</Text> : null}
            </View>
            {interactive ? (
                <View style={[styles.arrow, { backgroundColor: t.button }]}>
                    <ChevronRight size={18} color={t.buttonInk} strokeWidth={2.2} />
                </View>
            ) : null}
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: 22,
        borderWidth: 1,
    },
    iconPill: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    texts: { flex: 1, minWidth: 0, gap: 2 },
    title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
    text: { fontSize: 13, lineHeight: 18 },
    cta: { fontSize: 12.5, fontWeight: '700', marginTop: 4 },
    arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
