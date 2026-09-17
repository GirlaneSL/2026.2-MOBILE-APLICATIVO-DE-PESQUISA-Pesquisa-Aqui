import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, PlayCircle, FileText, Bolt, RefreshCw, WifiOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PesquisaCardProps {
    titulo: string;
    targetAudience: string;
    startDate: string;
    endDate: string;
    isDownloaded: boolean;
    isOnline: boolean;
    isDownloading: boolean;
    coletasCount?: number;
    onDownload: () => void;
}

export default function PesquisaCard({ 
    titulo, targetAudience, startDate, endDate, isDownloaded, isOnline, isDownloading, coletasCount = 0, onDownload 
}: PesquisaCardProps) {
    
    // Formatação amigável das datas
    const formattedPeriod = `${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`;

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
                <Text style={styles.infoText}>Público-alvo: {targetAudience}</Text>
                <Text style={styles.infoText}>Período: {formattedPeriod}</Text>
                
                {isDownloaded && (
                    <Text style={styles.coletasText}>{coletasCount} coleta(s) realizada(s)</Text>
                )}
            </View>

            {isDownloaded ? (
                <View style={styles.downloadedActions}>
                    <TouchableOpacity style={[styles.button, styles.buttonStart]}>
                        <PlayCircle size={20} color="#fff" />
                        <Text style={styles.buttonTextStart}>Iniciar Coleta</Text>
                    </TouchableOpacity>

                    {/* Opção explícita de atualização se estiver online */}
                    {isOnline && (
                        <TouchableOpacity style={styles.buttonUpdate} onPress={onDownload} disabled={isDownloading}>
                            {isDownloading ? <ActivityIndicator size="small" color="#447762" /> : <RefreshCw size={20} color="#447762" />}
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <TouchableOpacity 
                    style={[styles.button, styles.buttonDownload, (!isOnline || isDownloading) && styles.buttonDisabled]}
                    onPress={onDownload}
                    disabled={!isOnline || isDownloading}
                >
                    {isDownloading ? (
                        <ActivityIndicator size="small" color="#B66D56" />
                    ) : (
                        <>
                            {!isOnline ? <WifiOff size={20} color="#9a9a9a" /> : <Download size={20} color="#B66D56" />}
                            <Text style={[styles.buttonTextDownload, !isOnline && styles.buttonTextDisabled]}>
                                {!isOnline ? 'Internet necessária' : 'Baixar Pesquisa'}
                            </Text>
                        </>
                    )}
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
    card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#00000015', position: 'relative' },
    cardHeader: { marginBottom: 16, zIndex: 1 },
    titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#18181b', flex: 1 },
    infoText: { fontSize: 14, color: '#71717a', marginBottom: 4 },
    coletasText: { fontSize: 14, color: '#447762', fontWeight: 'bold', marginTop: 8 },
    downloadedActions: { flexDirection: 'row', gap: 8, zIndex: 1 },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8, flex: 1, zIndex: 1 },
    buttonStart: { backgroundColor: '#447762' },
    buttonUpdate: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#447762', alignItems: 'center', justifyContent: 'center' },
    buttonDownload: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#B66D56' },
    buttonDisabled: { borderColor: '#d4d4d8', backgroundColor: '#f4f4f5' },
    buttonTextStart: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    buttonTextDownload: { color: '#B66D56', fontWeight: 'bold', fontSize: 16 },
    buttonTextDisabled: { color: '#9a9a9a' },
    bolt1: { position: 'absolute', top: 4, left: 4, opacity: 0.4 },
    bolt2: { position: 'absolute', top: 4, right: 4, opacity: 0.4 },
    bolt3: { position: 'absolute', bottom: 4, left: 4, opacity: 0.4 },
    bolt4: { position: 'absolute', bottom: 4, right: 4, opacity: 0.4 },
});