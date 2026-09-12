import { LinearGradient } from 'expo-linear-gradient';
import { Bolt, Building2, LogOut, Smartphone, Target, UserCircle2 } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MenuCard from './_components/MenuCard';

const USUARIO = {
    nome: 'Kaiky Lindo',
    email: 'kaiky.lindo@empresa-alpha.com.br',
    empresa: 'Empresa Alpha',
    metaMensal: '150',
    coletasRealizadas: '124',
};

export default function Usuario() {
    const handleLogout = () => {
        Alert.alert(
            "Sair da conta",
            "Tem certeza que deseja sair? Certifique-se de sincronizar todas as suas coletas antes de deslogar para não perder dados.",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Sair", style: "destructive", onPress: () => console.log("Deslogando...") }
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
                <Text style={styles.name}>{USUARIO.nome}</Text>
                <Text style={styles.email}>{USUARIO.email}</Text>

                <View style={styles.companyBadge}>
                    <Building2 size={16} color="#447762" />
                    <Text style={styles.companyText}>{USUARIO.empresa}</Text>
                </View>
            </View>

            {/* Resumo de Metas */}
            <LinearGradient
                colors={['#B66D561A', '#FFFFFF1A', '#124B521A']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsContainer}
            >
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{USUARIO.coletasRealizadas}</Text>
                    <Text style={styles.statLabel}>Coletas no Mês</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{USUARIO.metaMensal}</Text>
                    <Text style={styles.statLabel}>Meta Mensal</Text>
                </View>

                <Bolt size={10} style={styles.bolt1} />
                <Bolt size={10} style={styles.bolt2} />
                <Bolt size={10} style={styles.bolt3} />
                <Bolt size={10} style={styles.bolt4} />
            </LinearGradient>

            {/* Menu de Opções usando o novo componente */}
            <View style={styles.menuContainer}>
                <MenuCard
                    label="Histórico de Metas"
                    icon={<Target size={22} color="#447762" />}
                />
                <MenuCard
                    label="Sobre o Aplicativo (v1.0.2)"
                    icon={<Smartphone size={22} color="#447762" />}
                />
            </View>

            {/* Botão de Sair (Mantido fora do padrão para alertar perigo) */}
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
    statDivider: { width: 1, backgroundColor: '#e4e4e7', zIndex: 1 },
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