import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Building2, LogOut, Smartphone } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Chip from '@/components/Chip';
import Contour from '@/components/Contour';
import { Brand, Radius, TAB_BAR_CLEARANCE } from '@/constants/brand';
import { useAuth } from '@/context/AuthContext';
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

function Stat({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
    return (
        <View style={styles.stat}>
            <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
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
    const imageHeaders = useImageHeaders();
    const isResearcher = user?.profile === 'RESEARCHER';

    // Números do próprio aparelho: atualizam toda vez que a aba é aberta.
    useFocusEffect(
        useCallback(() => {
            let active = true;
            Promise.all([
                listSent().catch(() => []),
                listSendQueue().catch(() => []),
                getCachedResearches().catch(() => []),
            ]).then(([sent, queue, cached]) => {
                if (active) setStats({ sent: sent.length, queued: queue.length, researches: cached.length });
            });
            return () => {
                active = false;
            };
        }, []),
    );

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

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.hero, showStats && styles.heroWithStats]}>
                <Contour seed={3.6} rings={10} cx={0.85} cy={0.35} size={1} opacity={0.8} color={Brand.green} />
                <View style={styles.avatarRing}>
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
                </View>
                <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Usuário'}</Text>
                {user?.sub ? <Text style={styles.login} numberOfLines={1}>@{user.sub}</Text> : null}
                <View style={styles.chips}>
                    <Chip label={user?.profile ? PROFILE_LABELS[user.profile] ?? user.profile : 'Sem perfil'} tone="dark" />
                </View>
            </View>

            <View style={[styles.body, showStats && styles.bodyWithStats]}>
                {showStats && stats ? (
                    <View style={styles.stats} accessibilityLabel="Resumo neste aparelho">
                        <Stat value={stats.sent} label="Enviadas" />
                        <View style={styles.statDivider} />
                        <Stat value={stats.queued} label="Aguardando envio" highlight={stats.queued > 0} />
                        <View style={styles.statDivider} />
                        <Stat value={stats.researches} label="Pesquisas" />
                    </View>
                ) : null}

                {user?.companyName ? (
                    <>
                        <Text style={styles.section}>Empresa</Text>
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
                    </>
                ) : null}

                <Text style={styles.section}>Aplicativo</Text>
                <MenuCard
                    label="Sobre o aplicativo"
                    value={`v${APP_VERSION}`}
                    icon={<Smartphone size={18} color={Brand.greenDeep} strokeWidth={1.8} />}
                />

                <Pressable
                    style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
                    onPress={handleLogout}
                    accessibilityRole="button"
                    accessibilityLabel="Sair da conta"
                >
                    <LogOut size={18} color={Brand.clayInk} strokeWidth={1.8} />
                    <Text style={styles.logoutText}>Sair da conta</Text>
                </Pressable>
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
        paddingTop: 26,
        paddingBottom: 30,
        borderBottomLeftRadius: Radius.hero,
        borderBottomRightRadius: Radius.hero,
        overflow: 'hidden',
    },
    // Com o cartão de números por cima da base da faixa escura, ela precisa de mais espaço embaixo.
    heroWithStats: { paddingBottom: 54 },
    avatarRing: {
        width: 108,
        height: 108,
        borderRadius: 54,
        borderWidth: 2,
        borderColor: 'rgba(191, 227, 208, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Brand.mint,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: Brand.forest, fontWeight: '700', fontSize: 32 },
    name: { fontSize: 30, fontWeight: '600', letterSpacing: -0.8, color: '#fff' },
    login: { fontSize: 15, color: Brand.mutedDark, marginTop: 4 },
    chips: { flexDirection: 'row', marginTop: 14 },
    body: { padding: 18, gap: 12 },
    // O cartão de números sobe sobre a base da faixa escura.
    bodyWithStats: { marginTop: -30 },
    stats: {
        flexDirection: 'row',
        alignItems: 'stretch',
        paddingVertical: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Brand.line,
        backgroundColor: Brand.card,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
    statValue: { fontSize: 24, fontWeight: '600', letterSpacing: -0.6, color: Brand.ink },
    statValueHighlight: { color: Brand.clayInk },
    statLabel: { fontSize: 12, color: Brand.muted, marginTop: 2, textAlign: 'center' },
    statDivider: { width: 1, backgroundColor: Brand.line, marginVertical: 4 },
    section: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Brand.muted,
        marginTop: 8,
        marginLeft: 6,
        marginBottom: -2,
    },
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
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: Brand.chipLight,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    companyLogoImage: { width: 44, height: 44 },
    companyText: { flex: 1 },
    companyCaption: { fontSize: 12, color: Brand.muted },
    companyName: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: Brand.ink, marginTop: 2 },
    logout: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 50,
        marginTop: 8,
        borderRadius: 999,
        backgroundColor: Brand.clayLight,
    },
    logoutPressed: { backgroundColor: '#ecd0c5' },
    logoutText: { fontSize: 15, fontWeight: '500', color: Brand.clayInk },
});
