import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Building2, LogOut, Smartphone } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Chip from '@/components/Chip';
import Contour from '@/components/Contour';
import { Brand, Radius, TAB_BAR_CLEARANCE } from '@/constants/brand';
import { useAuth } from '@/context/AuthContext';
import { avatarSrc } from '@/lib/avatar';
import MenuCard from './_components/MenuCard';

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

export default function Usuario() {
    const router = useRouter();
    const { user, logout } = useAuth();
    // Se a foto não carregar (sem rede, por exemplo), voltam as iniciais.
    const [photoFailed, setPhotoFailed] = useState(false);

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

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <Contour seed={3.6} rings={10} cx={0.85} cy={0.35} size={1} opacity={0.8} color={Brand.green} />
                <View style={styles.avatar}>
                    {user?.avatarUrl && !photoFailed ? (
                        <Image
                            source={{ uri: avatarSrc(user.avatarUrl, 64) }}
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
                <Text style={styles.name}>{user?.name ?? 'Usuário'}</Text>
                {user?.sub ? <Text style={styles.login}>{user.sub}</Text> : null}
                <View style={styles.chips}>
                    <Chip label={user?.profile ? PROFILE_LABELS[user.profile] ?? user.profile : 'Sem perfil'} tone="dark" />
                </View>
            </View>

            <View style={styles.body}>
                {user?.companyName ? (
                    <MenuCard
                        label={user.companyName}
                        icon={<Building2 size={18} color={Brand.greenDeep} strokeWidth={1.8} />}
                    />
                ) : null}
                <MenuCard
                    label="Sobre o aplicativo (v1.0.2)"
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
        paddingTop: 22,
        paddingBottom: 28,
        borderBottomLeftRadius: Radius.hero,
        borderBottomRightRadius: Radius.hero,
        overflow: 'hidden',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Brand.mint,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: Brand.forest, fontWeight: '700', fontSize: 22 },
    name: { fontSize: 28, fontWeight: '600', letterSpacing: -0.8, color: '#fff' },
    login: { fontSize: 14, color: Brand.mutedDark, marginTop: 4 },
    chips: { flexDirection: 'row', marginTop: 14 },
    body: { padding: 18, gap: 12 },
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
