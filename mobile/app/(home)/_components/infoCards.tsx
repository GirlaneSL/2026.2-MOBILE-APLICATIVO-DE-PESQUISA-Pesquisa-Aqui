import { Bolt } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface InfoCardProps {
    value: string;
    label: string;
    icon: ReactNode;
}

export default function InfoCard({ value, label, icon }: InfoCardProps) {
    return (
        <LinearGradient
            colors={['#B66D561A', '#FFFFFF1A', '#124B521A']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.iconContainer}>
                {icon}
            </View>

            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>

            <Bolt size={10} style={styles.bolt1} />
            <Bolt size={10} style={styles.bolt2} />
            <Bolt size={10} style={styles.bolt3} />
            <Bolt size={10} style={styles.bolt4} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: 0,
        borderWidth: 1,
        borderColor: "#00000015",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fff",
        position: "relative",
    },
    iconContainer: {
        alignItems: "flex-end",
        marginBottom: 8,
    },
    value: {
        fontSize: 25,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#000",
    },
    label: {
        fontSize: 12,
        color: "#000",
    },
    bolt1: {
        position: "absolute",
        top: 3,
        left: 3,
        opacity: .4
    },
    bolt2: {
        position: "absolute",
        top: 3,
        right: 3, 
        opacity: .4
    },
    bolt3: {
        position: "absolute",
        bottom: 3,
        left: 3,
        opacity: .4
    },
    bolt4: {
        position: "absolute",
        bottom: 3,
        right: 3, 
        opacity: .4
    },
});