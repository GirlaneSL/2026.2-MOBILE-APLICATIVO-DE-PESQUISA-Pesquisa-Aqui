import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Building2, LogOut, Pencil, Smartphone } from 'lucide-react-native';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Chip from '@/components/Chip';
import Contour from '@/components/Contour';
import CountUp from '@/components/home/CountUp';
import { Brand, Radius, TAB_BAR_CLEARANCE } from '@/constants/brand';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { avatarSrc, logoSrc, useImageHeaders } from '@/lib/avatar';
import { listSendQueue } from '@/lib/collectionStore';
import { getCachedResearches } from '@/lib/researchCache';
import { listSent } from '@/lib/sentHistory';
import MenuCard from './_components/MenuCard';

const APP_VERSION = '1.0.2';

const PROFILE_LABELS: Record<string, string> = {
    SUPERADMINISTRATOR: 'Superadministrador',
    ADMINISTRATOR: 'Administrador',
    RESEARCHER: 'Pesquisador',
};

const initialsOf = (name?: string) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?';

interface Stats {
    sent: number;
    queued: number;
    researches: number;
}

/** Entrada escalonada, igual à da Home: cada bloco sobe e aparece um pouco depois do anterior. */
const enter = (index: number) =>
    FadeInDown.delay(120 + index * 80)
        .duration(480)
        .easing(Easing.out(Easing.cubic));

function HeroStat({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
    return (
        <View style={styles.stat}>
            <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

export default function Usuario() {
    const router = useRouter();
    const { user, logout } = useAuth();
    // Se a foto não carregar (sem rede, por exemplo), voltam as iniciais.
    const [photoFailed, setPhotoFailed] = useState(false);
    const [logoFailed, setLogoFailed] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const isOnline = useNetworkStatus();
    const imageHeaders = useImageHeaders();
    const isResearcher = user?.profile === 'RESEARCHER';

    // As curvas de nível "respiram" devagar, como na Home.
    const breathe = useSharedValue(0);
    useEffect(() => {
        breathe.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
    }, [breathe]);
    const contourStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + breathe.value * 0.07 }, { translateX: breathe.value * -6 }],
    }));

    const loadStats = useCallback(async () => {
        const [sent, queue, cached] = await Promise.all([
            listSent().catch(() => []),
            listSendQueue().catch(() => []),
            getCachedResearches().catch(() => []),
        ]);
        setStats({ sent: sent.length, queued: queue.length, researches: cached.length });
    }, []);

    // Números do próprio aparelho: atualizam toda vez que a aba é aberta.
    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats]),
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    };

    const handleLogout = () => {
        Alert.alert(
            'Sair da conta',
            'Ao sair, os dados salvos neste aparelho serão apagados. Deseja continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    const showStats = isResearcher && stats !== null;
    let sectionIndex = 0;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Brand.green} />}
        >
            <View style={styles.hero}>
                <Animated.View style={[StyleSheet.absoluteFill, contourStyle]} pointerEvents="none">
                    <Contour seed={3.6} rings={10} cx={0.85} cy={0.35} size={1} opacity={0.8} color={Brand.green} />
                </Animated.View>

                <View style={styles.heroRow}>
                    <Chip label={user?.profile ? PROFILE_LABELS[user.profile] ?? user.profile : 'Sem perfil'} tone="dark" />
                    <Chip label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'dark' : 'clay'} />
                </View>

                <View style={styles.identity}>
                    <Pressable
                        onPress={() => router.push('/editar-perfil')}
                        accessibilityRole="button"
                        accessibilityLabel="Editar foto de perfil"
                        style={styles.avatarRing}
                    >
                        <View style={styles.avatar}>
                            {user?.avatarUrl && !photoFailed && imageHeaders ? (
                                <Image
                                    source={{ uri: avatarSrc(user.avatarUrl, 96), headers: imageHeaders }}
                                    style={styles.avatarImage}
                                    contentFit="cover"
                                    transition={150}
                                    accessibilityLabel="Foto de perfil"
                                    onError={() => setPhotoFailed(true)}
                                />
                            ) : (
                                <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
                            )}
                        </View>
                        <View style={styles.avatarBadge}>
                            <Pencil size={12} color={Brand.forest} strokeWidth={2.2} />
                        </View>
                    </Pressable>
                    <View style={styles.identityText}>
                        <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Usuário'}</Text>
                        {user?.sub ? <Text style={styles.login} numberOfLines={1}>@{user.sub}</Text> : null}
                    </View>
                </View>

                {showStats && stats ? (
                    <>
                        <Text style={styles.monthLabel}>Neste aparelho</Text>
                        <CountUp
                            value={stats.sent}
                            style={styles.big}
                            accessibilityLabel={`${stats.sent} coletas enviadas`}
                        />
                        <Text style={styles.cap}>{stats.sent === 1 ? 'coleta enviada' : 'coletas enviadas'}</Text>

                        <Animated.View entering={enter(0)} style={styles.strip} accessibilityLabel="Resumo neste aparelho">
                            <HeroStat value={stats.sent} label="Enviadas" />
                            <View style={styles.stripDivider} />
                            <HeroStat value={stats.queued} label="Aguardando envio" highlight={stats.queued > 0} />
                            <View style={styles.stripDivider} />
                            <HeroStat value={stats.researches} label="Pesquisas" />
                        </Animated.View>
                    </>
                ) : null}
            </View>

            <View style={styles.body}>
                {user?.companyName ? (
                    <Animated.View entering={enter(++sectionIndex)} style={styles.section}>
                        <SectionHeader title="Empresa" />
                        <View style={styles.company}>
                            <View style={styles.companyLogo}>
                                {user.companyLogoUrl && !logoFailed && imageHeaders ? (
                                    <Image
                                        source={{ uri: logoSrc(user.companyLogoUrl, 44), headers: imageHeaders }}
                                        style={styles.companyLogoImage}
                                        contentFit="contain"
                                        transition={150}
                                        accessibilityLabel="Logo da empresa"
                                        onError={() => setLogoFailed(true)}
                                    />
                                ) : (
                                    <Building2 size={24} color={Brand.greenDeep} strokeWidth={1.7} />
                                )}
                            </View>
                            <View style={styles.companyText}>
                                <Text style={styles.companyCaption}>Você faz parte de</Text>
                                <Text style={styles.companyName} numberOfLines={2}>{user.companyName}</Text>
                            </View>
                        </View>
                    </Animated.View>
                ) : null}

                <Animated.View entering={enter(++sectionIndex)} style={styles.section}>
                    <SectionHeader title="Conta" />
                    <MenuCard
                        label="Editar perfil"
                        onPress={() => router.push('/editar-perfil')}
                        icon={<Pencil size={18} color={Brand.greenDeep} strokeWidth={1.8} />}
                    />
                </Animated.View>

                <Animated.View entering={enter(++sectionIndex)} style={styles.section}>
                    <SectionHeader title="Aplicativo" />
                    <MenuCard
                        label="Sobre o aplicativo"
                        value={`v${APP_VERSION}`}
                        icon={<Smartphone size={18} color={Brand.greenDeep} strokeWidth={1.8} />}
                    />
                </Animated.View>

                <Animated.View entering={enter(++sectionIndex)}>
                    <Pressable
                        style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
                        onPress={handleLogout}
                        accessibilityRole="button"
                        accessibilityLabel="Sair da conta"
                    >
                        <LogOut size={18} color={Brand.clayInk} strokeWidth={1.8} />
                        <Text style={styles.logoutText}>Sair da conta</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Brand.paper },
    content: { flexGrow: 1, paddingBottom: TAB_BAR_CLEARANCE },
    hero: {
        backgroundColor: Brand.forest,
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 22,
        borderBottomLeftRadius: Radius.hero,
        borderBottomRightRadius: Radius.hero,
        overflow: 'hidden',
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22 },
    identityText: { flex: 1, minWidth: 0 },
    avatarRing: {
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 1,
        borderColor: Brand.lineDark,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 74,
        height: 74,
        borderRadius: 37,
        backgroundColor: Brand.mint,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: Brand.forest, fontWeight: '700', fontSize: 26 },
    avatarBadge: {
        position: 'absolute',
        right: 0,
        bottom: 2,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Brand.mint,
        borderWidth: 2,
        borderColor: Brand.forest,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: { color: Brand.fgDark, fontSize: 22, fontWeight: '600', letterSpacing: -0.5 },
    login: { color: Brand.mutedDark, marginTop: 2, fontSize: 13.5 },
    monthLabel: { color: Brand.mutedDark, marginTop: 22, fontSize: 14 },
    big: {
        color: '#fff',
        fontSize: 88,
        fontWeight: '300',
        letterSpacing: -6,
        lineHeight: 92,
        marginTop: 4,
        fontVariant: ['tabular-nums'],
    },
    cap: { color: Brand.fgDark, fontSize: 15, marginTop: 2 },
    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 22,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Brand.lineDark,
        backgroundColor: 'rgba(191, 227, 208, 0.07)',
    },
    stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
    statValue: { color: Brand.fgDark, fontSize: 22, fontWeight: '300', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
    statValueHighlight: { color: Brand.clay },
    statLabel: { color: Brand.mutedDark, fontSize: 11.5, textAlign: 'center' },
    stripDivider: { width: 1, height: 28, backgroundColor: Brand.lineDark },
    body: { padding: 18, gap: 22 },
    section: { gap: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: Brand.ink },
    company: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Brand.line,
        backgroundColor: Brand.card,
    },
    companyLogo: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: Brand.chipLight,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    companyLogoImage: { width: 36, height: 36 },
    companyText: { flex: 1, minWidth: 0 },
    companyCaption: { fontSize: 12.5, color: Brand.muted },
    companyName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: Brand.ink, marginTop: 2 },
    logout: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 50,
        borderRadius: 999,
        backgroundColor: Brand.clayLight,
    },
    logoutPressed: { backgroundColor: '#ecd0c5' },
    logoutText: { fontSize: 15, fontWeight: '500', color: Brand.clayInk },
});
