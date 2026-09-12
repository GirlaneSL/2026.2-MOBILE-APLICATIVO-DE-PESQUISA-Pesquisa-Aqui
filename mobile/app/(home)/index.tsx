import { FileText, UserRoundPlus, CloudAlert } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import InfoCard from "../../components/infoCards";

export default function Home() {
    return (
        <View style={styles.home}>
            <View style={styles.container}>
                <View style={styles.cardsContainer}>
                    <InfoCard
                        value="0"
                        label="Pesquisas Ativas"
                        icon={<FileText size={25} color="#000" />}
                    />

                    <InfoCard
                        value="0"
                        label="Pesquisadores em Campo"
                        icon={<UserRoundPlus size={25} color="#000" />}
                    />

                    <InfoCard
                        value="0"
                        label="Sincronizações Pendentes"
                        icon={<CloudAlert size={25} color="#000" />}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    home: {
        marginTop: 0,
    },
    container: {
        padding: 5,
    },
    cardsContainer: {
        flexDirection: "row",
        gap: 8,
    },
});