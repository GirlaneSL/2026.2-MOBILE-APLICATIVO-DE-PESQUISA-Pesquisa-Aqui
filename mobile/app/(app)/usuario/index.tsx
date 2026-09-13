import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bolt, Building2, LogOut, Smartphone, Target, UserCircle2 } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MenuCard from './_components/MenuCard';
import { useAuth } from '@/context/AuthContext';

const PROFILE_LABELS: Record<string, string> = {
    SUPERADMINISTRATOR: 'Superadministrador',
    ADMINISTRATOR: 'Administrador',
    RESEARCHER: 'Pesquisador',
};

export default function Usuario() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            "Sair da conta",
            "Ao sair, os dados salvos neste aparelho serão apagados. Deseja continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sair",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Cabeçalho do Perfil */}
            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    <UserCircle2 size={80} color="#124B52" strokeWidth={1.5} />
                </View>
                <Text style={styles.name}>{user?.name ?? 'Usuário'}</Text>
                <Text style={styles.email}>{user?.sub ?? ''}</Text>

                {user?.companyName && (
                    <View style={styles.companyBadge}>
                        <Building2 size={16} color="#447762" />
                        <Text style={styles.companyText}>{user.companyName}</Text>
                    </View>
                )}
            </View>

            {/* Perfil de acesso */}
            <LinearGradient
                colors={['#B66D561A', '#FFFFFF1A', '#124B521A']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsContainer}
            >
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                        {user?.profile ? PROFILE_LABELS[user.profile] ?? user.profile : '-'}
                    </Text>
                    <Text style={styles.statLabel}>Perfil de Acesso</Text>
                </View>

                <Bolt size={10} style={styles.bolt1} />
                <Bolt size={10} style={styles.bolt2} />
                <Bolt size={10} style={styles.bolt3} />
                <Bolt size={10} style={styles.bolt4} />
            </LinearGradient>

            {/* Menu de Opções */}
            <View style={styles.menuContainer}>
                <MenuCard
                    label="Sobre o Aplicativo (v1.0.2)"
                    icon={<Smartphone size={22} color="#447762" />}
                />
            </View>

            {/* Botão de Sair */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={22} color="#dc2626" />
                <Text style={styles.logoutText}>Sair da Conta</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fafafa' },
    profileHeader: {
        alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7',
    },
    avatarContainer: { marginBottom: 16 },
    name: { fontSize: 24, fontWeight: 'bold', color: '#447762', marginBottom: 4 },
    email: { fontSize: 16, color: '#71717a', marginBottom: 16 },
    companyBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6,
    },
    companyText: { fontSize: 14, fontWeight: '600', color: '#447762' },
    statsContainer: {
        flexDirection: 'row', backgroundColor: '#fff', marginTop: 16,
        marginHorizontal: 20, borderRadius: 12, paddingVertical: 16,
        borderWidth: 1, borderColor: '#00000015', position: 'relative',
    },
    statBox: { flex: 1, alignItems: 'center', zIndex: 1 },
    statNumber: { fontSize: 22, fontWeight: 'bold', color: '#447762', marginBottom: 4 },
    statLabel: { fontSize: 13, color: '#71717a', fontWeight: '500' },
    menuContainer: { marginTop: 24, paddingHorizontal: 20 },
    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 12, marginHorizontal: 20, marginBottom: 40, padding: 16,
        borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5',
        backgroundColor: '#fef2f2', gap: 10,
    },
    logoutText: { fontSize: 16, fontWeight: 'bold', color: '#dc2626' },
    bolt1: { position: 'absolute', top: 4, left: 4, opacity: 0.4 },
    bolt2: { position: 'absolute', top: 4, right: 4, opacity: 0.4 },
    bolt3: { position: 'absolute', bottom: 4, left: 4, opacity: 0.4 },
    bolt4: { position: 'absolute', bottom: 4, right: 4, opacity: 0.4 },
});