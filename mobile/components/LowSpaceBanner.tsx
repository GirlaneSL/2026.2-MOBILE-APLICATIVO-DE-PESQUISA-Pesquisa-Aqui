import { HardDrive } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/brand';
import { useDeviceSpace } from '@/hooks/useDeviceSpace';
import { buildSpaceWarning } from '@/lib/deviceSpace';
import { formatBytes } from '@/lib/photoStorage';

/**
 * Faixa de aviso quando o aparelho está ficando cheio. Fica no topo de todas as telas do app logado,
 * porque é na entrevista (câmera, gravação) que o espaço acaba, não na tela de envio.
 * `releasableBytes` (quando a tela sabe) faz o texto mandar apagar primeiro os arquivos já enviados.
 */
export function LowSpaceBanner({ releasableBytes = 0 }: { releasableBytes?: number }) {
    const { freeBytes, level } = useDeviceSpace();
    const warning = buildSpaceWarning(level, freeBytes === null ? '' : formatBytes(freeBytes), releasableBytes);

    if (!warning) return null;
    const critical = warning.level === 'critical';

    return (
        <View style={[styles.banner, critical && styles.bannerCritical]} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <HardDrive size={16} color={critical ? Brand.clayInk : Brand.warn} />
            <Text style={[styles.text, critical && styles.textCritical]}>
                <Text style={styles.title}>{warning.title}. </Text>
                {warning.text}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Brand.warnLight,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    bannerCritical: { backgroundColor: Brand.clayLight },
    text: { flex: 1, color: Brand.warn, fontSize: 12.5, lineHeight: 17 },
    textCritical: { color: Brand.clayInk },
    title: { fontWeight: '700' },
});
