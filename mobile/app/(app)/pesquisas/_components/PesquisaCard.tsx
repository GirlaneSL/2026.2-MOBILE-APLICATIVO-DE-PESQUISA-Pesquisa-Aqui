// mobile/app/(app)/pesquisas/_components/PesquisaCard.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FileText, Bolt } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PesquisaCardProps {
    titulo: string;
    status: string;
    targetAudience: string;
}

export default function PesquisaCard({ titulo, status, targetAudience }: PesquisaCardProps) {
    return (
        <LinearGradient
            colors={['#B66D561A', '#FFFFFF1A', '#124B521A']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                    <FileText size={20} color="#447762" />
                    <Text style={styles.title}>{titulo}</Text>
                </View>
                <Text style={styles.company}>{status}</Text>
                <Text style={styles.infoText}>Público-alvo: {targetAudience}</Text>
            </View>

            <Bolt size={10} style={styles.bolt1} />
            <Bolt size={10} style={styles.bolt2} />
            <Bolt size={10} style={styles.bolt3} />
            <Bolt size={10} style={styles.bolt4} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 13,
        borderWidth: 1,
        borderColor: '#00000015',
        position: 'relative',
    },
    cardHeader: {
        zIndex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#18181b',
        flex: 1,
    },
    company: {
        fontSize: 14,
        fontWeight: '600',
        color: '#447762',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#71717a',
    },
    bolt1: {
        position: 'absolute',
        top: 4,
        left: 4,
        opacity: 0.4,
    },
    bolt2: {
        position: 'absolute',
        top: 4,
        right: 4,
        opacity: 0.4,
    },
    bolt3: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        opacity: 0.4,
    },
    bolt4: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        opacity: 0.4,
    },
});