import { FileText, CloudAlert, Target, Play, RefreshCw } from "lucide-react-native";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import InfoCard from "./_components/infoCards";

export default function Home() {
    return (
        <ScrollView style={styles.container}>
            {/* Cabeçalho */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Olá, Pesquisador!</Text>
                <Text style={styles.headerSubtitle}>Seu resumo de campo de hoje</Text>
            </View>

            {/* Painel de Indicadores */}
            <View style={styles.cardsContainer}>
                <InfoCard
                    value="2"
                    label="Pesquisas"
                    icon={<FileText size={24} color="#447762" />}
                />
                <InfoCard
                    value="15"
                    label="Pendentes"
                    icon={<CloudAlert size={24} color="#B66D56" />}
                />
                <InfoCard
                    value="80%"
                    label="Sua Meta"
                    icon={<Target size={24} color="#447762" />}
                />
            </View>

            {/* Ações Principais */}
            <Text style={styles.sectionTitle}>Ações</Text>

            <View style={styles.actionsContainer}>
                {/* Botão principal de coleta offline */}
                <TouchableOpacity style={styles.primaryButton}>
                    <Play size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                        Iniciar Nova Coleta
                    </Text>
                </TouchableOpacity>

                {/* Botão secundário para enviar os dados gravados localmente */}
                <TouchableOpacity style={styles.secondaryButton}>
                    <RefreshCw size={20} color="#B66D56" />
                    <Text style={styles.secondaryButtonText}>
                        Sincronizar Respostas (15)
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fafafa", // zinc-50
        padding: 20,
    },
    header: {
        marginBottom: 24,
        marginTop: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#18181b", // zinc-900
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#71717a", // zinc-500
        marginTop: 4,
    },
    cardsContainer: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#18181b",
        marginBottom: 16,
    },
    actionsContainer: {
        gap: 12,
        paddingBottom: 40, // Espaço extra no final do scroll
    },
    primaryButton: {
        backgroundColor: "#447762",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
    },
    primaryButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
        marginLeft: 8,
    },
    secondaryButton: {
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e4e4e7", // zinc-200
        // Sombra leve para destacar do fundo
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    secondaryButtonText: {
        color: "#27272a", // zinc-800
        fontWeight: "bold",
        fontSize: 16,
        marginLeft: 8,
    },
});