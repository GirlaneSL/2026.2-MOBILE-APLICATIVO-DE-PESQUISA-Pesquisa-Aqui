import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Download, PlayCircle, FileText, Bolt } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PesquisaCardProps {
    titulo: string;
    empresa: string;
    questoes: number;
    status: string;
}

export default function PesquisaCard({ titulo, empresa, questoes, status }: PesquisaCardProps) {
    const isBaixada = status === 'baixada';

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
                <Text style={styles.company}>{empresa}</Text>
                <Text style={styles.infoText}>{questoes} questões configuradas</Text>
            </View>

            {isBaixada ? (
                <TouchableOpacity style={[styles.button, styles.buttonStart]}>
                    <PlayCircle size={20} color="#fff" />
                    <Text style={styles.buttonTextStart}>Iniciar Coleta</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={[styles.button, styles.buttonDownload]}>
                    <Download size={20} color="#B66D56" />
                    <Text style={styles.buttonTextDownload}>Baixar Pesquisa</Text>
                </TouchableOpacity>
            )}

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
        padding: 16,
        borderWidth: 1,
        borderColor: '#00000015',
        position: 'relative',
    },
    cardHeader: {
        marginBottom: 16,
        zIndex: 1, // Garante que o texto fique acima dos ícones de fundo
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
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 8,
        gap: 8,
        zIndex: 1, // Garante que o clique funcione sobre o fundo
    },
    buttonStart: {
        backgroundColor: '#447762',
    },
    buttonDownload: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#B66D56',
    },
    buttonTextStart: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonTextDownload: {
        color: '#B66D56',
        fontWeight: 'bold',
        fontSize: 16,
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